"""Book service."""

from __future__ import annotations

import logging
from typing import Sequence

from sqlalchemy import delete

from luminalib.core.exceptions import EntityNotFoundError
from luminalib.interfaces.llm_interface import LLMInterface
from luminalib.interfaces.storage_interface import StorageInterface
from luminalib.models.book import Book
from luminalib.models.borrow import BookBorrow
from luminalib.models.document_chunk import DocumentChunk
from luminalib.models.review import Review
from luminalib.repositories.book_repository import BookRepository
from luminalib.schemas.book_schema import BookListResponse, BookRead
from luminalib.services.ingestion_service import build_embeddings
from luminalib.services.text_extraction_service import extract_text

logger = logging.getLogger("luminalib.services.book")


class BookService:
    """CRUD and business logic for books."""

    def __init__(
        self,
        book_repo: BookRepository,
        storage: StorageInterface,
        llm: LLMInterface,
    ) -> None:
        self.book_repo = book_repo
        self.storage = storage
        self.llm = llm

    async def create_book(
        self,
        title: str,
        author: str,
        genre: str,
        year_published: int,
        filename: str,
        file_content: bytes,
        created_by: str,
        cover_image_url: str | None = None,
        description: str | None = None,
    ) -> Book:
        extracted_text, content_type = extract_text(filename, file_content)
        storage_key = await self.storage.upload(filename, file_content)

        book = Book(
            title=title,
            author=author,
            genre=genre,
            year_published=year_published,
            description=description,
            file_key=storage_key,
            file_name=filename,
            content_type=content_type,
            file_size=len(file_content),
            content_text=extracted_text,
            cover_image_url=cover_image_url,
            created_by=created_by,
            updated_by=created_by,
        )
        book = await self.book_repo.create(book)
        logger.info("Book created: id=%s title=%s by=%s", book.id, title, created_by)
        return book


    async def update_book_summary(self, book_id: int) -> None:
        """Generate and persist an AI summary for the book."""
        book = await self.book_repo.get_by_id(book_id)
        if book and book.content_text:
            summary = await self.llm.summarize(book.content_text)
            book.summary = summary
            book.updated_by = "system"
            await self.book_repo.update(book)
            logger.info("Summary updated for book id=%s", book_id)

    async def ingest_book(self, book_id: int) -> None:
        """Chunk book content and build embeddings for Q&A."""
        book = await self.book_repo.get_by_id(book_id)
        if not book or not book.content_text:
            return

        # Clear existing chunks
        session = self.book_repo.session
        await session.execute(delete(DocumentChunk).where(DocumentChunk.book_id == book_id))

        embeddings = build_embeddings(book.content_text)
        for chunk, embedding in embeddings:
            session.add(
                DocumentChunk(
                    book_id=book_id,
                    content=chunk,
                    embedding=embedding,
                    created_by="system",
                    updated_by="system",
                )
            )
        await session.commit()
        logger.info("Book ingested for Q&A: id=%s chunks=%s", book_id, len(embeddings))

    async def list_books(self, page: int, size: int, search: str | None = None) -> BookListResponse:
        items, total = await self.book_repo.get_paginated_books(page, size, search)
        return BookListResponse(
            items=[BookRead.model_validate(b) for b in items],
            page=page,
            size=size,
            total=total,
        )

    async def get_book(self, book_id: int) -> Book:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise EntityNotFoundError("Book", book_id)
        return book

    async def update_book(
        self,
        book_id: int,
        updates: dict,
        updated_by: str,
        filename: str | None = None,
        file_content: bytes | None = None,
    ) -> Book:
        book = await self.get_book(book_id)

        for field, value in updates.items():
            if value is not None:
                setattr(book, field, value)

        if filename and file_content:
            extracted_text, content_type = extract_text(filename, file_content)
            storage_key = await self.storage.upload(filename, file_content)
            if book.file_key:
                await self.storage.delete(book.file_key)
            book.file_key = storage_key
            book.file_name = filename
            book.content_type = content_type
            book.file_size = len(file_content)
            book.content_text = extracted_text

        book.updated_by = updated_by
        return await self.book_repo.update(book)

    async def delete_book(self, book_id: int) -> None:
        book = await self.get_book(book_id)
        if book.file_key:
            await self.storage.delete(book.file_key)

        session = self.book_repo.session
        await session.execute(delete(Review).where(Review.book_id == book_id))
        await session.execute(delete(BookBorrow).where(BookBorrow.book_id == book_id))
        await self.book_repo.delete(book)
        logger.info("Book deleted: id=%s", book_id)

    async def delete_book_file(self, book_id: int, updated_by: str) -> Book:
        book = await self.get_book(book_id)
        if book.file_key:
            await self.storage.delete(book.file_key)
        book.file_key = None
        book.file_name = None
        book.content_type = None
        book.file_size = None
        book.content_text = None
        book.updated_by = updated_by
        return await self.book_repo.update(book)

    async def get_all_books(self) -> Sequence[Book]:
        return await self.book_repo.get_all()
