"""Text extraction utilities — PDF and plain text."""

from __future__ import annotations

import logging
from io import BytesIO
from typing import Tuple
from luminalib.services.devanagari_converter import clean_and_normalize_devanagari

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
    
    # Clean Devanagari, Sanskrit, Hindi and scrub raw markdown bold asterisks
    cleaned_text = clean_and_normalize_devanagari(raw_text).replace("**", "")
    return cleaned_text, content_type


def _extract_pdf_text(content: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(BytesIO(content))
        pages = []
        for page in reader.pages:
            try:
                page_text = page.extract_text() or ""
                if page_text:
                    pages.append(clean_and_normalize_devanagari(page_text))
            except Exception as e:
                logger.debug("Page extraction notice: %s", e)
        return "\n".join(pages)
    except Exception as exc:
        logger.warning("pypdf extraction failed: %s. Using raw fallback.", exc)
        return content.decode("utf-8", errors="ignore")


