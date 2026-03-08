"""QA endpoints — ask questions against ingested documents."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_current_user, get_db
from luminalib.infrastructure.llm.llm_factory import get_llm_provider
from luminalib.models.document_chunk import DocumentChunk
from luminalib.models.user import User
from luminalib.schemas.qa_schema import AnswerResponse, QuestionRequest
from luminalib.services.rag_service import select_relevant_chunks

router = APIRouter(prefix="/qa", tags=["qa"])
logger = logging.getLogger("luminalib.qa")


async def _generate_answer(question: str, context: str) -> str:
    """Generate an answer using the configured LLM provider."""
    llm = await get_llm_provider()

    # Build the prompt inline — the LLM interface expects a single content string
    system_prompt = (
        "You are LuminaLib's intelligent AI assistant. "
        "If the user asks a question, answer it using ONLY the provided context. "
        "If the user's input is a casual greeting like 'Hi' or 'Good morning', or small talk, "
        "respond politely in a conversational manner without using the context."
    )
    user_prompt = f"Context:\n{context}\n\nUser Input: {question}"

    # Use a direct _call if the provider supports it, otherwise fall back to summarize
    if hasattr(llm, "_call"):
        return await llm._call(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )
    else:
        # Fallback: use summarize with combined prompt
        return await llm.summarize(f"{system_prompt}\n\n{user_prompt}")


@router.post("", response_model=AnswerResponse, summary="Ask a question against ingested documents")
async def ask_question(
    payload: QuestionRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnswerResponse:
    from sqlalchemy import select, exists, or_
    from sqlalchemy.ext.asyncio import AsyncSession
    from fastapi import HTTPException, status
    from luminalib.models.book import Book
    from luminalib.models.borrow import BookBorrow
    from luminalib.models.document_chunk import DocumentChunk
    from luminalib.models.document import Document
    from luminalib.schemas.qa_schema import SourceExcerpt

    # First, check if the user has borrowed ANY books
    borrow_check_query = select(exists().where(BookBorrow.user_id == user.id))
    borrow_exists = await session.execute(borrow_check_query)
    if not borrow_exists.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To use AI Q&A, you must first borrow at least one book from the library.",
        )

    # Next, get the chunks for the borrowed books
    query = (
        select(DocumentChunk, Book.title)
        .select_from(BookBorrow)
        .join(Book, BookBorrow.book_id == Book.id)
        .outerjoin(Document, Document.filename == Book.title)
        .join(
            DocumentChunk,
            or_(
                DocumentChunk.book_id == Book.id,
                DocumentChunk.document_id == Document.id
            )
        )
        .where(BookBorrow.user_id == user.id)
    )
    
    result = await session.execute(query)
    rows = list(result.all())
    
    if not rows:
        logger.warning("No ingested chunks found for user %s's borrowed books", user.email)

    # select_relevant_chunks takes a list of DocumentChunks
    chunks_only = [row[0] for row in rows]
    selected_chunks = select_relevant_chunks(payload.question, chunks_only) if chunks_only else []
    
    # Map back to titles
    chunk_to_title = {row[0].id: row[1] for row in rows}
    
    # If we have no context but it's not a greeting, the LLM prompt will handle stating "I don't know"
    context = "\n\n".join(chunk.content for chunk in selected_chunks) if selected_chunks else ""
    
    try:
        answer = await _generate_answer(payload.question, context)
    except Exception as exc:
        logger.error("AI Generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Assistant is temporarily unavailable (Provider Error: {exc})",
        )
        
    excerpts = [
        SourceExcerpt(content=chunk.content, book_title=chunk_to_title.get(chunk.id))
        for chunk in selected_chunks
    ]
    return AnswerResponse(answer=answer, excerpts=excerpts)
