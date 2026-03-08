"""AI general endpoints — generate summary on demand."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from luminalib.api.v1.deps import get_current_user, get_llm
from luminalib.interfaces.llm_interface import LLMInterface
from luminalib.models.user import User
from luminalib.schemas.qa_schema import SummaryRequest
from luminalib.services.summarizer_service import generate_summary

router = APIRouter(tags=["ai"])


@router.post("/generate-summary", summary="Generate an AI summary from text")
async def generate_summary_endpoint(
    payload: SummaryRequest,
    _: User = Depends(get_current_user),
    llm: LLMInterface = Depends(get_llm),
) -> dict[str, str]:
    summary = await generate_summary(payload.content, llm)
    return {"summary": summary}
