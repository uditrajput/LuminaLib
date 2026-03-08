"""RAG retrieval service."""

from __future__ import annotations

from luminalib.models.document_chunk import DocumentChunk
from luminalib.services.embedding_service import cosine_similarity, embed_text


def select_relevant_chunks(
    question: str, chunks: list[DocumentChunk], limit: int = 4
) -> list[DocumentChunk]:
    """Select the most relevant document chunks for a question."""
    query_vector = embed_text(question)
    scored = [
        (cosine_similarity(query_vector, chunk.embedding), chunk) for chunk in chunks
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    
    # Filter out completely irrelevant chunks (like score 0.0 or near 0.0 for hash collisions)
    # A low threshold like 0.02 ensures we only include chunks with *some* token matching overlap.
    filtered_chunks = [chunk for score, chunk in scored if score > 0.02]
    return filtered_chunks[:limit]
