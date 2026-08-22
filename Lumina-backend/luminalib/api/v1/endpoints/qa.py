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
from luminalib.schemas.qa_schema import (
    AnswerResponse,
    ChatMessageRead,
    ChatSessionCreate,
    ChatSessionDetailRead,
    ChatSessionRead,
    ChatSessionUpdate,
    QuestionRequest,
)
from luminalib.services.rag_service import select_relevant_chunks

router = APIRouter(prefix="/qa", tags=["qa"])
logger = logging.getLogger("luminalib.qa")


async def _generate_answer(question: str, context: str) -> str:
    """Generate an answer using the configured LLM provider."""
    llm = await get_llm_provider()

    system_prompt = (
        "You are LuminaLib's intelligent AI assistant. "
        "Answer the user's question directly, accurately, and concisely. "
        "When the user asks to be asked questions on a topic (e.g. 'ask me questions on X', 'ask me a question on Y', or 'generate questions on Z'), you MUST provide the most frequently asked, high-yield exam and interview questions on that specific topic. "
        "If the user asks for multiple-choice questions (MCQs), you MUST provide 4 options labeled A, B, C, and D for each question, and clearly provide the correct answer with an explanation. "
        "When asked for a table or tabular format, you MUST format the response strictly as a standard Markdown table with complete opening and closing pipes for all columns (e.g. | # | Question |). "
        "Provide a detailed, helpful response. Do not simply reply with the word 'Answer' or 'Answer:'."
    )
    if context:
        user_prompt = f"Library Context:\n{context}\n\nQuestion: {question}"
    else:
        user_prompt = f"Question: {question}"

    if hasattr(llm, "_call"):
        raw_answer = await llm._call(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )
    else:
        raw_answer = await llm.summarize(f"{system_prompt}\n\n{user_prompt}")

    import re
    cleaned = re.sub(r"^(the\s+)?(user\s+input|question|answer):\s*", "", raw_answer, flags=re.IGNORECASE).strip()
    cleaned = cleaned.replace("**", "")
    return cleaned if cleaned else raw_answer.replace("**", "")




@router.get("/sessions", response_model=list[ChatSessionRead], summary="List user's AI Q&A chat sessions")
async def list_chat_sessions(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ChatSessionRead]:
    from luminalib.models.chat_message import ChatMessage
    from luminalib.models.chat_session import ChatSession

    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    res = await session.execute(stmt)
    chat_sessions = list(res.scalars().all())

    items: list[ChatSessionRead] = []
    for cs in chat_sessions:
        msg_stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == cs.id)
            .order_by(ChatMessage.created_at.asc())
        )
        msg_res = await session.execute(msg_stmt)
        msgs = list(msg_res.scalars().all())
        if not msgs:
            # Delete empty session without messages from DB to avoid history clutter
            await session.delete(cs)
            continue
        last_msg = msgs[-1].content
        items.append(
            ChatSessionRead(
                id=cs.id,
                user_id=cs.user_id,
                title=cs.title,
                created_at=cs.created_at,
                updated_at=cs.updated_at,
                message_count=len(msgs),
                last_message=last_msg,
            )
        )
    await session.commit()
    return items


@router.post("/sessions", response_model=ChatSessionDetailRead, summary="Create a new chat session")
async def create_chat_session(
    payload: ChatSessionCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatSessionDetailRead:
    from luminalib.models.chat_session import ChatSession

    title = (payload.title or "New Chat").strip()
    cs = ChatSession(user_id=user.id, title=title)
    session.add(cs)
    await session.commit()
    await session.refresh(cs)

    return ChatSessionDetailRead(
        id=cs.id,
        user_id=cs.user_id,
        title=cs.title,
        created_at=cs.created_at,
        updated_at=cs.updated_at,
        message_count=0,
        messages=[],
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailRead, summary="Get chat session detail with messages")
async def get_chat_session(
    session_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatSessionDetailRead:
    from luminalib.models.chat_message import ChatMessage
    from luminalib.models.chat_session import ChatSession
    from luminalib.schemas.qa_schema import ChatMessageRead, SourceExcerpt

    stmt = select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    res = await session.execute(stmt)
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    msg_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == cs.id)
        .order_by(ChatMessage.created_at.asc())
    )
    msg_res = await session.execute(msg_stmt)
    msgs = list(msg_res.scalars().all())

    read_msgs = [
        ChatMessageRead(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            excerpts=[SourceExcerpt(**e) for e in (m.excerpts_json or [])],
            is_saved=m.is_saved,
            created_at=m.created_at,
        )
        for m in msgs
    ]

    return ChatSessionDetailRead(
        id=cs.id,
        user_id=cs.user_id,
        title=cs.title,
        created_at=cs.created_at,
        updated_at=cs.updated_at,
        message_count=len(msgs),
        last_message=msgs[-1].content if msgs else None,
        messages=read_msgs,
    )


@router.put("/sessions/{session_id}", response_model=ChatSessionRead, summary="Rename chat session")
async def update_chat_session(
    session_id: int,
    payload: ChatSessionUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatSessionRead:
    from luminalib.models.chat_session import ChatSession

    stmt = select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    res = await session.execute(stmt)
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    cs.title = payload.title.strip() or "Untitled Chat"
    await session.commit()
    await session.refresh(cs)

    return ChatSessionRead(
        id=cs.id,
        user_id=cs.user_id,
        title=cs.title,
        created_at=cs.created_at,
        updated_at=cs.updated_at,
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete chat session")
async def delete_chat_session(
    session_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from luminalib.models.chat_session import ChatSession

    stmt = select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    res = await session.execute(stmt)
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    await session.delete(cs)
    await session.commit()


@router.post("/sessions/{session_id}/ask", response_model=AnswerResponse, summary="Ask question within chat session")
async def ask_question_in_session(
    session_id: int,
    payload: QuestionRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnswerResponse:
    from luminalib.models.book import Book
    from luminalib.models.borrow import BookBorrow
    from luminalib.models.chat_message import ChatMessage
    from luminalib.models.chat_session import ChatSession
    from luminalib.models.document import Document
    from luminalib.models.document_chunk import DocumentChunk
    from luminalib.schemas.qa_schema import SourceExcerpt
    from luminalib.services.user_group_service import UserGroupService
    from sqlalchemy import exists, or_

    # Verify session ownership
    cs_stmt = select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    cs_res = await session.execute(cs_stmt)
    cs = cs_res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    # Check borrows
    borrow_check = select(exists().where(BookBorrow.user_id == user.id))
    if not (await session.execute(borrow_check)).scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To use AI Q&A, you must first borrow at least one book from the library.",
        )

    svc = UserGroupService(session)
    authorized_book_ids = await svc.get_user_authorized_book_ids(user.id)

    query = (
        select(DocumentChunk, Book.title)
        .select_from(BookBorrow)
        .join(Book, BookBorrow.book_id == Book.id)
        .outerjoin(Document, Document.filename == Book.title)
        .join(
            DocumentChunk,
            or_(
                DocumentChunk.book_id == Book.id,
                DocumentChunk.document_id == Document.id,
            ),
        )
        .where(BookBorrow.user_id == user.id, Book.id.in_(authorized_book_ids))
    )

    res = await session.execute(query)
    rows = list(res.all())
    chunks_only = [row[0] for row in rows]
    selected_chunks = select_relevant_chunks(payload.question, chunks_only) if chunks_only else []
    chunk_to_title = {row[0].id: row[1] for row in rows}
    context = "\n\n".join(c.content for c in selected_chunks) if selected_chunks else ""

    try:
        answer = await _generate_answer(payload.question, context)
    except Exception as exc:
        logger.error("AI Generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Assistant is temporarily unavailable (Provider Error: {exc})",
        )

    excerpts = [
        SourceExcerpt(content=c.content, book_title=chunk_to_title.get(c.id))
        for c in selected_chunks
    ]
    excerpts_json = [e.model_dump() for e in excerpts]

    # Save user question message
    user_msg = ChatMessage(session_id=cs.id, role="user", content=payload.question)
    session.add(user_msg)

    # Save assistant answer message
    assistant_msg = ChatMessage(
        session_id=cs.id, role="assistant", content=answer, excerpts_json=excerpts_json
    )
    session.add(assistant_msg)

    # Auto-generate title if default
    if cs.title in ["New Chat", "Untitled Chat"]:
        short_title = payload.question.strip()[:40]
        cs.title = short_title if len(payload.question) <= 40 else f"{short_title}..."

    await session.commit()
    return AnswerResponse(answer=answer, excerpts=excerpts)


@router.post("/messages/{message_id}/save", response_model=ChatMessageRead, summary="Save or toggle bookmark on a message")
async def save_chat_message(
    message_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatMessageRead:
    from luminalib.models.chat_message import ChatMessage
    from luminalib.models.chat_session import ChatSession
    from luminalib.schemas.qa_schema import ChatMessageRead, SourceExcerpt

    stmt = (
        select(ChatMessage)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(ChatMessage.id == message_id, ChatSession.user_id == user.id)
    )
    res = await session.execute(stmt)
    msg = res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    msg.is_saved = not msg.is_saved
    await session.commit()
    await session.refresh(msg)

    return ChatMessageRead(
        id=msg.id,
        session_id=msg.session_id,
        role=msg.role,
        content=msg.content,
        excerpts=[SourceExcerpt(**e) for e in (msg.excerpts_json or [])],
        is_saved=msg.is_saved,
        created_at=msg.created_at,
    )


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

    from luminalib.services.user_group_service import UserGroupService
    svc = UserGroupService(session)
    authorized_book_ids = await svc.get_user_authorized_book_ids(user.id)

    # Next, get the chunks for the borrowed books that the user is authorized to read
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
        .where(BookBorrow.user_id == user.id, Book.id.in_(authorized_book_ids))
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
