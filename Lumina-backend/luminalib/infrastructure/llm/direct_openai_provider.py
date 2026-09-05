"""Direct OpenAI API LLM provider."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("luminalib.llm.direct_openai")

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


class DirectOpenAIProvider:
    """LLM provider using official OpenAI or any OpenAI-compatible API (NVIDIA, DeepSeek, Groq, vLLM, etc.)."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", base_url: str | None = None) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")

    async def summarize(self, content: str) -> str:
        return await self._call(
            system_prompt="You summarize a book in 5 concise bullet points.",
            user_prompt=f"Book content:\n{content}\n\nProvide summary:",
            max_tokens=300,
        )

    async def analyze_review(self, content: str) -> str:
        return await self._call(
            system_prompt="You produce a rolling consensus of reader sentiment in 3 bullet points.",
            user_prompt=f"Reviews:\n{content}\n\nProvide consensus:",
            max_tokens=300,
        )

    async def generate(self, prompt: str, system_prompt: str = "You are a helpful AI study assistant.") -> str:
        return await self._call(
            system_prompt=system_prompt,
            user_prompt=prompt,
            max_tokens=1500,
        )

    async def _call(self, system_prompt: str, user_prompt: str, max_tokens: int = 400) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        endpoint_url = f"{self.base_url}/chat/completions"
        async with httpx.AsyncClient(timeout=60) as client:
            logger.info("Calling OpenAI-compatible API model=%s at %s", self.model, endpoint_url)
            response = await client.post(
                endpoint_url,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
