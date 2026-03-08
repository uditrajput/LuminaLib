"""ML-based recommender model service (optional scikit-learn dependency)."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from luminalib.core.dynamic_config import get_dynamic
from luminalib.models.book import Book

logger = logging.getLogger("luminalib.services.recommender_model")

try:
    from joblib import dump, load
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def _storage_path() -> Path:
    return Path(get_dynamic("storage_path", "./storage"))

def _model_path() -> Path:
    return _storage_path() / "recommender.joblib"

def _vectorizer_path() -> Path:
    return _storage_path() / "recommender_vectorizer.joblib"


def _ensure_storage() -> None:
    _storage_path().mkdir(parents=True, exist_ok=True)


def train_recommender(books: list[Book]) -> dict[str, str]:
    """Train a TF-IDF based recommender model."""
    if not SKLEARN_AVAILABLE:
        return {"status": "skipped", "detail": "scikit-learn not installed"}
    if not books:
        return {"status": "skipped", "detail": "no books available for training"}

    _ensure_storage()
    corpus = [
        book.summary or book.title
        for book in books
        if (book.summary or book.title)
    ]
    if not corpus:
        return {"status": "skipped", "detail": "no book text available for training"}

    vectorizer = TfidfVectorizer(stop_words="english")
    vectors = vectorizer.fit_transform(corpus)

    dump(vectors, _model_path())
    dump(vectorizer, _vectorizer_path())

    mapping = {str(book.id): idx for idx, book in enumerate(books)}
    (_storage_path() / "recommender_mapping.json").write_text(
        json.dumps(mapping)
    )
    logger.info("Recommender model trained with %d documents", len(books))
    return {"status": "trained", "documents": str(len(books))}


def recommend_from_model(
    target: Book, books: list[Book], limit: int = 5
) -> list[Book]:
    """Get recommendations using the trained ML model."""
    if not SKLEARN_AVAILABLE:
        return []
    if not _model_path().exists() or not _vectorizer_path().exists():
        return []

    mapping_path = _storage_path() / "recommender_mapping.json"
    if not mapping_path.exists():
        return []

    mapping = json.loads(mapping_path.read_text())
    if str(target.id) not in mapping:
        return []

    vectors = load(_model_path())
    vectorizer = load(_vectorizer_path())
    target_vector = vectorizer.transform([target.summary or target.title])
    similarities = cosine_similarity(target_vector, vectors).flatten()

    ranked = sorted(enumerate(similarities), key=lambda item: item[1], reverse=True)
    reverse_mapping = {idx: book_id for book_id, idx in mapping.items()}

    results: list[Book] = []
    for idx, _score in ranked:
        book_id = int(reverse_mapping.get(idx, -1))
        if book_id == target.id:
            continue
        book = next((b for b in books if b.id == book_id), None)
        if book:
            results.append(book)
        if len(results) >= limit:
            break

    return results
