"""Llama / self-hosted OpenAI-compatible LLM provider."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("luminalib.llm.llama")


class LlamaProvider:
    """LLM provider using an OpenAI-compatible HTTP endpoint (Ollama, vLLM, etc.)."""

    def __init__(self, base_url: str, api_key: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

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
            "model": "local-llm",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 300,
        }

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        async with httpx.AsyncClient(timeout=30) as client:
            logger.info("Calling Llama endpoint at %s", self.base_url)
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
