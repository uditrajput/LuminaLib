"""Ollama LLM provider — uses Ollama's local API."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("luminalib.llm.ollama")

DEFAULT_BASE_URL = "http://host.docker.internal:11434"


class OllamaProvider:
    """LLM provider using a local Ollama instance (OpenAI-compatible endpoint)."""

    def __init__(self, model: str, base_url: str | None = None) -> None:
        self.model = model
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")

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

        headers: dict[str, str] = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=120) as client:
            logger.info("Calling Ollama model=%s at %s", self.model, self.base_url)
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
