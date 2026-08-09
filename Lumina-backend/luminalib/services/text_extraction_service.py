"""Text extraction utilities — PDF and plain text."""

from __future__ import annotations

import logging
from io import BytesIO
from typing import Tuple

logger = logging.getLogger("luminalib.services.text_extraction")


def extract_text(filename: str, content: bytes) -> Tuple[str, str]:
    """Extract text from a file; returns (text, content_type)."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        logger.debug("Extracting text from PDF: %s", filename)
        raw_text = _extract_pdf_text(content)
        content_type = "application/pdf"
    else:
        logger.debug("Reading plain text from: %s", filename)
        raw_text = content.decode("utf-8", errors="ignore")
        content_type = "text/plain"
    
    # Scrub raw markdown bold asterisks (**) from parsed text
    cleaned_text = raw_text.replace("**", "")
    return cleaned_text, content_type


def _extract_pdf_text(content: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)

