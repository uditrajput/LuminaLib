"""Ingestion service — chunking and embedding for documents."""

from __future__ import annotations

from luminalib.services.embedding_service import embed_text


def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    """Split text into overlapping chunks."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    return [
        normalized[i : i + chunk_size]
        for i in range(0, len(normalized), chunk_size)
        if normalized[i : i + chunk_size].strip()
    ]


def build_embeddings(
    text: str, chunk_size: int = 500
) -> list[tuple[str, list[float]]]:
    """Chunk text and produce embeddings for each chunk."""
    chunks = chunk_text(text, chunk_size=chunk_size)
    return [(chunk, embed_text(chunk)) for chunk in chunks]
