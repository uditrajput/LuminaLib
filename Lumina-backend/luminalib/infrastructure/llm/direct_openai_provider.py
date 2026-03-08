"""Direct OpenAI API LLM provider."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("luminalib.llm.direct_openai")

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


class DirectOpenAIProvider:
    """LLM provider using the official OpenAI API."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        self.api_key = api_key
        self.model = model

    async def summarize(self, content: str) -> str:
        return await self._call(
            system_prompt="You summarize a book in 5 concise bullet points.",
            user_prompt=f"Book content:\n{content}\n\nProvide summary:",
        )

    async def analyze_review(self, content: str) -> str:
        return await self._call(
            system_prompt="You produce a rolling consensus of reader sentiment in 3 bullet points.",
            user_prompt=f"Reviews:\n{content}\n\nProvide consensus:",
        )

    async def _call(self, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 300,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            logger.info("Calling OpenAI API model=%s", self.model)
            response = await client.post(
                OPENAI_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
