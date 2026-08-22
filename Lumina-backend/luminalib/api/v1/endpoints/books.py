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
    access_level: str = Form(default="public"),
    group_ids: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    book_svc: BookService = Depends(get_book_service),
    db: AsyncSession = Depends(get_db),
) -> Book:
    content_bytes = await file.read()

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
    book.access_level = access_level
    book.created_by_user_id = user.id
    await db.commit()

    if access_level == "private" and group_ids:
        from luminalib.services.user_group_service import UserGroupService
        svc = UserGroupService(db)
        for g_id in [int(x.strip()) for x in group_ids.split(",") if x.strip().isdigit()]:
            await svc.assign_book(book.id, g_id)

    await db.refresh(book)

    if book.content_text:
        background_tasks.add_task(_process_book_background, book.id)
    return book


@router.get("", response_model=BookListResponse, summary="List books (paginated with Public/Private tabs)")
async def list_books(
    page: int = 1,
    size: int = 10,
    q: str | None = None,
    catalog: str | None = None,
    user: User = Depends(get_current_user),
    book_svc: BookService = Depends(get_book_service),
    db: AsyncSession = Depends(get_db),
) -> BookListResponse:
    page = max(page, 1)
    size = min(max(size, 1), 50)
    
    from sqlalchemy import select, func, or_, desc
    from sqlalchemy.orm import selectinload

    if catalog == "private":
        from luminalib.services.user_group_service import UserGroupService
        svc = UserGroupService(db)
        authorized_ids = await svc.get_user_authorized_book_ids(user.id)
        query = select(Book).options(selectinload(Book.group_entitlements)).where(Book.access_level == "private", Book.id.in_(authorized_ids))
        if q:
            pattern = f"%{q}%"
            query = query.where(or_(Book.title.ilike(pattern), Book.author.ilike(pattern), Book.genre.ilike(pattern)))
        
        count_res = await db.execute(select(func.count()).select_from(query.subquery()))
        total = count_res.scalar_one()
        
        res = await db.execute(query.order_by(desc(Book.created_date)).offset((page - 1) * size).limit(size))
        items = list(res.scalars().all())
        return BookListResponse(items=[BookRead.model_validate(b) for b in items], total=total, page=page, size=size)

    # Public library catalog (default)
    query = select(Book).options(selectinload(Book.group_entitlements)).where(or_(Book.access_level == "public", Book.access_level == None))
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Book.title.ilike(pattern), Book.author.ilike(pattern), Book.genre.ilike(pattern)))

    count_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_res.scalar_one()

    res = await db.execute(query.order_by(desc(Book.created_date)).offset((page - 1) * size).limit(size))
    items = list(res.scalars().all())
    return BookListResponse(items=[BookRead.model_validate(b) for b in items], total=total, page=page, size=size)


@router.get("/public/stats", summary="Get dynamic public book stats")
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select, func, or_
    from luminalib.models.book import Book
    from luminalib.models.review import Review

    # Count public books securely
    pub_books_query = select(func.count(Book.id)).where(or_(Book.access_level == "public", Book.access_level == None))
    pub_count = (await db.execute(pub_books_query)).scalar() or 0

    # Count books with summary generated
    summary_query = select(func.count(Book.id)).where(
        or_(Book.access_level == "public", Book.access_level == None),
        Book.summary.isnot(None),
    )
    summary_count = (await db.execute(summary_query)).scalar() or 0

    # Average rating from reviews
    avg_rating_query = select(func.avg(Review.rating))
    avg_rating = (await db.execute(avg_rating_query)).scalar()
    rating_val = f"{round(float(avg_rating), 1)} ★" if avg_rating else "4.9 ★"

    return {
        "books_count": pub_count,
        "summaries_count": summary_count,
        "rating": rating_val,
    }


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
    access_level: str | None = Form(default=None),
    group_ids: str | None = Form(default=None),
    user: User = Depends(require_admin),
    book_svc: BookService = Depends(get_book_service),
    db: AsyncSession = Depends(get_db),
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
            "access_level": access_level,
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

    # Sync group entitlements if provided or if changing access level
    effective_access_level = access_level or book.access_level
    if effective_access_level == "private":
        if group_ids is not None:
            from luminalib.models.user_group import BookGroupEntitlement
            from sqlalchemy import delete
            await db.execute(delete(BookGroupEntitlement).where(BookGroupEntitlement.book_id == book_id))
            if group_ids.strip():
                g_ids = [int(x.strip()) for x in group_ids.split(",") if x.strip().isdigit()]
                for g_id in g_ids:
                    db.add(BookGroupEntitlement(book_id=book_id, group_id=g_id))
            await db.commit()
    elif effective_access_level == "public":
        from luminalib.models.user_group import BookGroupEntitlement
        from sqlalchemy import delete
        await db.execute(delete(BookGroupEntitlement).where(BookGroupEntitlement.book_id == book_id))
        await db.commit()

    await db.refresh(book)

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


def _generate_sample_pdf(title: str, author: str, description: str) -> bytes:
    """Generate a clean 1-page PDF document stream for books without physical files on disk."""
    clean_title = (title or "Digital Book").replace("(", "[").replace(")", "]")
    clean_author = (author or "Unknown Author").replace("(", "[").replace(")", "]")
    clean_desc = (description or "No description provided.").replace("(", "[").replace(")", "]")

    words = clean_desc.split()
    lines = []
    curr = []
    for w in words:
        curr.append(w)
        if len(" ".join(curr)) > 55:
            lines.append(" ".join(curr))
            curr = []
    if curr:
        lines.append(" ".join(curr))

    desc_pdf_text = "\n".join([f"({line}) Tj T*" for line in lines[:15]])

    stream_content = f"""BT
/F1 24 Tf
50 720 Td
({clean_title}) Tj
/F2 14 Tf
0 -30 Td
(Author: {clean_author}) Tj
0 -30 Td
(--------------------------------------------------------------------------------) Tj
0 -30 Td
/F2 12 Tf
16 TL
{desc_pdf_text}
ET"""

    stream_bytes = stream_content.encode("latin-1", errors="replace")

    pdf_str = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Length {len(stream_bytes)} >>
stream
{stream_content}
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000253 00000 n 
0000000324 00000 n 
0000000390 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
500
%%EOF"""

    return pdf_str.encode("latin-1", errors="replace")


@router.get("/{book_id}/file", summary="Stream or download book file for reading")
async def get_book_file(
    book_id: int,
    user: User = Depends(get_current_user),
    book_svc: BookService = Depends(get_book_service),
    db: AsyncSession = Depends(get_db),
):
    book = await book_svc.get_book(book_id)

    if book.access_level == "private":
        from luminalib.services.user_group_service import UserGroupService
        svc = UserGroupService(db)
        authorized_ids = await svc.get_user_authorized_book_ids(user.id)
        user_role_name = getattr(getattr(user, "role", None), "name", "").lower()
        if book.id not in authorized_ids and user_role_name != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not enrolled in a group authorized to read this private book.",
            )

    content_bytes = None
    if book.file_key:
        try:
            content_bytes = await book_svc.storage.download(book.file_key)
        except Exception as e:
            logger.warning("File key %s not found in storage: %s", book.file_key, e)

    if not content_bytes:
        content_bytes = _generate_sample_pdf(book.title, book.author, book.description or "")

    import re
    from urllib.parse import quote
    raw_filename = book.file_name or f"{book.title}.pdf"
    safe_filename = re.sub(r'[^\x20-\x7E]', '_', raw_filename)
    encoded_filename = quote(raw_filename)

    from fastapi.responses import Response
    headers = {
        "Content-Disposition": f'inline; filename="{safe_filename}"; filename*=UTF-8\'\'{encoded_filename}',
    }
    return Response(
        content=content_bytes,
        media_type="application/pdf",
        headers=headers,
    )

