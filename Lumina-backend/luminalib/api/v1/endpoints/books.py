"""Book endpoints — CRUD, file upload, borrow/return, summary/analysis."""

from __future__ import annotations

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import (
    get_book_service,
    get_borrow_repo,
    get_current_user,
    get_db,
    get_review_repo,
    require_admin,
)
from luminalib.core.constants import (
    BORROW_STATUS_AVAILABLE,
    BORROW_STATUS_BORROWED,
    BORROW_STATUS_RETURNED,
)
from luminalib.models.book import Book
from luminalib.models.borrow import BookBorrow
from luminalib.models.user import User
from luminalib.repositories.borrow_repository import BorrowRepository
from luminalib.repositories.review_repository import ReviewRepository
from luminalib.schemas.book_schema import (
    BookListResponse,
    BookRead,
    BookSummaryRead,
    BookUpdate,
)
from luminalib.schemas.borrow_schema import BorrowRead, BorrowStatusRead
from luminalib.schemas.review_schema import ReviewRead
from luminalib.services.book_service import BookService

import logging
logger = logging.getLogger("luminalib.books")

router = APIRouter(prefix="/books", tags=["books"])

async def _process_book_background(book_id: int):
    """Safely process book embeddings and summaries in the background using a fresh DB session."""
    from luminalib.db.session import SessionLocal
    from luminalib.repositories.book_repository import BookRepository
    from luminalib.infrastructure.storage.storage_factory import get_storage_provider
    from luminalib.infrastructure.llm.llm_factory import get_llm_provider
    
    try:
        async with SessionLocal() as session:
            storage = await get_storage_provider()
            llm = await get_llm_provider()
            book_repo = BookRepository(session)
            book_svc = BookService(book_repo, storage, llm)
            
            logger.info("Starting background processing for book %s", book_id)
            
            try:
                await book_svc.update_book_summary(book_id)
            except Exception as e:
                logger.warning("Failed to update summary for book %s: %s", book_id, e)
                
            try:
                await book_svc.ingest_book(book_id)
            except Exception as e:
                logger.warning("Failed to ingest chunks for book %s: %s", book_id, e)
                
            logger.info("Finished background processing for book %s", book_id)
    except Exception as e:
        logger.exception("Failed setup for background processing for book %s: %s", book_id, e)


@router.post("", response_model=BookRead, status_code=status.HTTP_201_CREATED, summary="Upload a book")
async def create_book(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form(...),
    genre: str = Form(...),
    year_published: int = Form(...),
    description: str | None = Form(default=None),
    cover_image_url: str | None = Form(default=None),
    cover_image: UploadFile | None = File(default=None),
    user: User = Depends(get_current_user),
    book_svc: BookService = Depends(get_book_service),
) -> Book:
    content_bytes = await file.read()

    # If a cover image file was uploaded, save it and build a URL
    resolved_cover_url = cover_image_url
    if cover_image is not None and cover_image.filename:
        import asyncio
        from pathlib import Path
        from uuid import uuid4
        from luminalib.core.dynamic_config import get_dynamic

        covers_dir = Path(get_dynamic("storage_path", "./storage")) / "covers"
        covers_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(cover_image.filename).suffix or ".jpg"
        cover_key = f"{uuid4().hex}{ext}"
        cover_path = covers_dir / cover_key
        cover_bytes = await cover_image.read()
        await asyncio.to_thread(cover_path.write_bytes, cover_bytes)
        # Build a URL the frontend can reach (served by the /covers endpoint)
        base_url = str(request.base_url).rstrip("/")
        resolved_cover_url = f"{base_url}/covers/{cover_key}"

    book = await book_svc.create_book(
        title=title,
        author=author,
        genre=genre,
        year_published=year_published,
        filename=file.filename or "unknown",
        file_content=content_bytes,
        created_by=user.email,
        cover_image_url=resolved_cover_url,
        description=description,
    )
    if book.content_text:
        background_tasks.add_task(_process_book_background, book.id)
    return book


@router.get("", response_model=BookListResponse, summary="List books (paginated)")
async def list_books(
    page: int = 1,
    size: int = 10,
    q: str | None = None,
    book_svc: BookService = Depends(get_book_service),
) -> BookListResponse:
    page = max(page, 1)
    size = min(max(size, 1), 50)
    return await book_svc.list_books(page, size, q)


@router.get("/{book_id}", response_model=BookRead, summary="Get book details")
async def get_book(
    book_id: int,
    book_svc: BookService = Depends(get_book_service),
) -> Book:
    return await book_svc.get_book(book_id)


@router.put("/{book_id}", response_model=BookRead, summary="Update book metadata or file")
async def update_book(
    book_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    title: str | None = Form(default=None),
    author: str | None = Form(default=None),
    genre: str | None = Form(default=None),
    year_published: int | None = Form(default=None),
    description: str | None = Form(default=None),
    cover_image: UploadFile | None = File(default=None),
    cover_image_url: str | None = Form(default=None),
    user: User = Depends(require_admin),
    book_svc: BookService = Depends(get_book_service),
) -> Book:
    if request.headers.get("content-type", "").startswith("application/json"):
        payload = BookUpdate.model_validate(await request.json())
        updates = payload.model_dump(exclude_unset=True)
    else:
        updates = {
            "title": title,
            "author": author,
            "genre": genre,
            "year_published": year_published,
            "description": description,
            "cover_image_url": cover_image_url,
        }
        updates = {k: v for k, v in updates.items() if v is not None}

    # Handle cover image upload if provided in form
    if cover_image is not None and cover_image.filename:
        import asyncio
        from pathlib import Path
        from uuid import uuid4
        from luminalib.core.dynamic_config import get_dynamic

        covers_dir = Path(get_dynamic("storage_path", "./storage")) / "covers"
        covers_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(cover_image.filename).suffix or ".jpg"
        cover_key = f"{uuid4().hex}{ext}"
        cover_path = covers_dir / cover_key
        cover_bytes = await cover_image.read()
        await asyncio.to_thread(cover_path.write_bytes, cover_bytes)
        
        base_url = str(request.base_url).rstrip("/")
        updates["cover_image_url"] = f"{base_url}/covers/{cover_key}"

    file_content: bytes | None = None
    filename: str | None = None
    if file is not None:
        file_content = await file.read()
        filename = file.filename

    book = await book_svc.update_book(
        book_id, updates, user.email, filename=filename, file_content=file_content
    )
    if file_content and book.content_text:
        background_tasks.add_task(_process_book_background, book.id)
    return book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a book")
async def delete_book(
    book_id: int,
    _: User = Depends(require_admin),
    book_svc: BookService = Depends(get_book_service),
) -> None:
    await book_svc.delete_book(book_id)


@router.get("/{book_id}/reviews", response_model=list[ReviewRead], summary="List book reviews")
async def list_reviews(
    book_id: int,
    review_repo: ReviewRepository = Depends(get_review_repo),
) -> list:
    return list(await review_repo.get_by_book(book_id))


@router.get("/{book_id}/summary", response_model=BookSummaryRead, summary="Get book AI summary")
async def get_book_summary(
    book_id: int,
    book_svc: BookService = Depends(get_book_service),
    review_repo: ReviewRepository = Depends(get_review_repo),
) -> BookSummaryRead:
    book = await book_svc.get_book(book_id)
    reviews = list(await review_repo.get_by_book(book_id))
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0.0
    return BookSummaryRead(
        book_id=book.id,
        summary=book.summary,
        review_summary=book.review_summary,
        average_rating=round(avg_rating, 2),
        total_reviews=len(reviews),
    )


@router.get("/{book_id}/analysis", response_model=BookSummaryRead, summary="Get GenAI review analysis")
async def get_book_analysis(
    book_id: int,
    book_svc: BookService = Depends(get_book_service),
    review_repo: ReviewRepository = Depends(get_review_repo),
) -> BookSummaryRead:
    return await get_book_summary(book_id, book_svc, review_repo)


@router.post("/{book_id}/borrow", response_model=BorrowRead, summary="Borrow a book")
async def borrow_book(
    book_id: int,
    user: User = Depends(get_current_user),
    book_svc: BookService = Depends(get_book_service),
    borrow_repo: BorrowRepository = Depends(get_borrow_repo),
) -> BookBorrow:
    await book_svc.get_book(book_id)  # raises 404 if missing
    active = await borrow_repo.get_active_borrow(book_id, user.id)
    if active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Book already borrowed")

    borrow = BookBorrow(
        book_id=book_id,
        user_id=user.id,
        created_by=user.email,
        updated_by=user.email,
    )
    return await borrow_repo.create(borrow)


@router.post("/{book_id}/return", response_model=BorrowRead, summary="Return a borrowed book")
async def return_book(
    book_id: int,
    user: User = Depends(get_current_user),
    borrow_repo: BorrowRepository = Depends(get_borrow_repo),
) -> BookBorrow:
    borrow = await borrow_repo.get_active_borrow(book_id, user.id)
    if not borrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active borrow found")
    borrow.returned_at = func.now()
    borrow.updated_by = user.email
    return await borrow_repo.update(borrow)


@router.get("/{book_id}/borrow-status", response_model=BorrowStatusRead, summary="Check borrow status")
async def get_borrow_status(
    book_id: int,
    user: User = Depends(get_current_user),
    borrow_repo: BorrowRepository = Depends(get_borrow_repo),
) -> BorrowStatusRead:
    borrow = await borrow_repo.get_latest_borrow(book_id, user.id)
    if not borrow:
        return BorrowStatusRead(status=BORROW_STATUS_AVAILABLE)
    if borrow.returned_at is None:
        return BorrowStatusRead(status=BORROW_STATUS_BORROWED, borrowed_at=borrow.borrowed_at)
    return BorrowStatusRead(
        status=BORROW_STATUS_RETURNED,
        borrowed_at=borrow.borrowed_at,
        returned_at=borrow.returned_at,
    )


@router.delete("/{book_id}/file", response_model=BookRead, summary="Remove book file only")
async def delete_book_file(
    book_id: int,
    user: User = Depends(get_current_user),
    book_svc: BookService = Depends(get_book_service),
) -> Book:
    return await book_svc.delete_book_file(book_id, user.email)
