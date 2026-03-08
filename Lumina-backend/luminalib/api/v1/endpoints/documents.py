"""Document endpoints — CRUD for QA documents."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_current_user, get_db, get_document_repo
from luminalib.models.document import Document
from luminalib.models.user import User
from luminalib.repositories.document_repository import DocumentRepository
from luminalib.schemas.document_schema import DocumentCreate, DocumentRead

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED, summary="Create a document")
async def create_document(
    payload: DocumentCreate,
    user: User = Depends(get_current_user),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> Document:
    document = Document(
        filename=payload.filename,
        content=payload.content,
        owner_id=user.id,
        created_by=user.email,
        updated_by=user.email,
    )
    return await doc_repo.create(document)


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED, summary="Upload a document file")
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> Document:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")
    content = (await file.read()).decode("utf-8", errors="ignore")
    document = Document(
        filename=file.filename,
        content=content,
        owner_id=user.id,
        created_by=user.email,
        updated_by=user.email,
    )
    return await doc_repo.create(document)


@router.get("", response_model=list[DocumentRead], summary="List user's documents")
async def list_documents(
    user: User = Depends(get_current_user),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> list:
    return list(await doc_repo.get_by_owner(user.id))


@router.get("/{document_id}", response_model=DocumentRead, summary="Get a document")
async def get_document(
    document_id: int,
    user: User = Depends(get_current_user),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> Document:
    document = await doc_repo.get_by_id_and_owner(document_id, user.id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document
