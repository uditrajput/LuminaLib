"""Ingestion endpoints — trigger async document processing."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_current_user, get_db, get_document_repo
from luminalib.db.session import SessionLocal
from luminalib.models.document import Document
from luminalib.models.document_chunk import DocumentChunk
from luminalib.models.ingestion_job import IngestionJob
from luminalib.models.user import User
from luminalib.repositories.document_repository import DocumentRepository
from luminalib.schemas.ingestion_schema import IngestionJobRead
from luminalib.services.ingestion_service import build_embeddings

router = APIRouter(prefix="/ingestion", tags=["ingestion"])
logger = logging.getLogger("luminalib.ingestion")


async def _process_ingestion(job_id: int, document_id: int, user_email: str) -> None:
    """Background task for processing document embeddings."""
    async with SessionLocal() as session:
        result = await session.execute(select(IngestionJob).where(IngestionJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = "running"
        job.updated_by = "system"
        await session.commit()

        try:
            doc_result = await session.execute(select(Document).where(Document.id == document_id))
            document = doc_result.scalar_one_or_none()
            if not document:
                job.status = "failed"
                job.error = "Document not found"
                await session.commit()
                return

            embeddings = build_embeddings(document.content)
            for chunk, embedding in embeddings:
                session.add(
                    DocumentChunk(
                        document_id=document_id,
                        content=chunk,
                        embedding=embedding,
                        created_by="system",
                        updated_by="system",
                    )
                )

            # Generate and store summary using LLM
            from luminalib.infrastructure.llm.llm_factory import get_llm_provider
            from luminalib.services.summarizer_service import generate_summary
            from luminalib.models.book import Book

            try:
                llm = await get_llm_provider()
                summary = await generate_summary(document.content, llm)
                
                # Fetch and update the corresponding book
                book_result = await session.execute(select(Book).where(Book.title == document.filename))
                book = book_result.scalar_one_or_none()
                if book:
                    book.summary = summary
                    book.updated_by = "system"
                    session.add(book)
            except Exception as e:
                logger.warning("Failed to generate summary: %s", e)

            job.status = "completed"
            job.updated_by = "system"
            await session.commit()
            logger.info("Ingestion completed: job=%s doc=%s", job_id, document_id)
        except Exception as exc:
            logger.exception("Ingestion failed: %s", exc)
            job.status = "failed"
            job.error = str(exc)[:500]
            await session.commit()


@router.post(
    "/{document_id}",
    response_model=IngestionJobRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start document ingestion",
)
async def start_ingestion(
    document_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> IngestionJob:
    doc = await doc_repo.get_by_id_and_owner(document_id, user.id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    job = IngestionJob(
        document_id=document_id,
        status="pending",
        created_by=user.email,
        updated_by=user.email,
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    asyncio.create_task(_process_ingestion(job.id, document_id, user.email))
    return job


@router.get("/jobs", response_model=list[IngestionJobRead], summary="List ingestion jobs")
async def list_jobs(
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    result = await session.execute(select(IngestionJob))
    return list(result.scalars().all())


@router.get("/jobs/{job_id}", response_model=IngestionJobRead, summary="Get ingestion job status")
async def get_job(
    job_id: int,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> IngestionJob:
    result = await session.execute(select(IngestionJob).where(IngestionJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job
