"""Recommendation service."""

from __future__ import annotations

import logging

from luminalib.models.book import Book
from luminalib.services.embedding_service import cosine_similarity, embed_text

logger = logging.getLogger("luminalib.services.recommendation")


def recommend_books(
    books: list[Book],
    preferences: dict | None = None,
    borrowed_books: list[Book] | None = None,
    limit: int = 5,
) -> list[Book]:
    """Content-based recommendations using user preferences and borrowing history."""
    if not books:
        return []

    from collections import Counter

    preferences = preferences or {}
    borrowed_books = borrowed_books or []
    
    def parse_pref(key: str, alt_key: str | None = None) -> list[str]:
        val = preferences.get(key) or (preferences.get(alt_key) if alt_key else None) or []
        if isinstance(val, str):
            return [s.strip().lower() for s in val.split(",") if s.strip()]
        return [str(s).lower() for s in val]

    preferred_genres = parse_pref("genres", "favoriteGenre")
    preferred_authors = parse_pref("authors")
    preferred_langs = parse_pref("language")
    keywords = parse_pref("keywords")

    # Factor in borrowing history
    borrowed_genres = [b.genre.lower() for b in borrowed_books if b.genre]
    borrowed_authors = [b.author.lower() for b in borrowed_books if b.author]
    borrowed_titles = [b.title.lower() for b in borrowed_books if b.title]
    
    # Build a semantic profile vector for the user
    profile_parts = preferred_genres + preferred_authors + keywords + borrowed_genres + borrowed_authors + borrowed_titles
    if not profile_parts and preferred_langs:
        profile_parts = preferred_langs
        
    profile_text = " ".join(profile_parts)
    profile_vector = embed_text(profile_text) if profile_text else None

    # We exclude already borrowed books from recommendations to keep it fresh
    borrowed_ids = {b.id for b in borrowed_books}
    
    interests_provided = bool(profile_parts)

    def score(book: Book) -> float:
        base = 0.0
        current_genre = (book.genre or "unknown").lower()
        title_lower = (book.title or "").lower()
        summary_lower = (book.summary or "").lower()

        # 1. Direct matches (Extreme weight)
        if preferred_genres and current_genre in preferred_genres:
            base += 1000
        if preferred_authors and (book.author or "").lower() in preferred_authors:
            base += 500
            
        # 2. Textual matching in Title (Very high relevance)
        if preferred_genres or keywords:
            for term in (preferred_genres + keywords):
                if term in title_lower:
                    base += 200
                elif term in summary_lower:
                    base += 50

        # 3. Semantic Similarity (Hash-based)
        if profile_vector:
            book_context = f"{book.title} {book.genre or ''} {book.summary or ''}"
            book_vector = embed_text(book_context)
            similarity = cosine_similarity(profile_vector, book_vector)
            # Increase weight slightly to ensure related programming books might still appear
            base += similarity * 150
            
        # 4. Cross-relevance: If the book's genre appears in our profile terms
        # (e.g. user likes 'Java', book genre is 'Programming', and title mentions 'Java')
        for pg in preferred_genres:
            if pg in title_lower or pg in current_genre:
                base += 50

        # 5. Borrow history explicit boosts
        if current_genre in borrowed_genres:
            base += 300
        if (book.author or "").lower() in borrowed_authors:
            base += 150
            
        return base

    # Score and filter
    scored_books = []
    for b in books:
        s = score(b)
        # If user has specific interests, only include books that match *something*
        if not interests_provided or s > 0:
            scored_books.append((b, s))

    # Sort by score descending
    scored_books.sort(key=lambda x: x[1], reverse=True)
    
    # Return just the Book objects
    return [b for b, s in scored_books[:limit]]


def recommend_similar_books(
    target: Book, books: list[Book], limit: int = 5
) -> list[Book]:
    """Content-based similarity using embedding vectors."""
    target_vector = embed_text(target.summary or target.title)
    scored = []
    for book in books:
        if book.id == target.id:
            continue
        sim = cosine_similarity(target_vector, embed_text(book.summary or book.title))
        scored.append((sim, book))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [book for _, book in scored[:limit]]
