"""Docker Model Runner LLM provider — uses Docker Desktop's built-in model serving."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("luminalib.llm.docker_model")

# Docker Model Runner exposes an OpenAI-compatible API inside Docker containers
DEFAULT_BASE_URL = "http://model-runner.docker.internal/engines/llama.cpp/v1"


class DockerModelProvider:
    """LLM provider using Docker Model Runner (OpenAI-compatible)."""

    def __init__(self, model: str, base_url: str | None = None) -> None:
        self.model = model
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")

    async def summarize(self, content: str) -> str:
        # Avoid exceeding prompt limits for small local models like smollm2 (typically ~2k context)
        max_content_length = 4000
        truncated_content = content[:max_content_length] + ("..." if len(content) > max_content_length else "")

        return await self._call(
            system_prompt="You summarize a book in 5 concise bullet points.",
            user_prompt=f"Book content:\n{truncated_content}\n\nProvide summary:",
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
            logger.info("Calling Docker Model Runner model=%s at %s", self.model, self.base_url)
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                if response.status_code != 200:
                    logger.error("Docker Model Runner error: %s - %s", response.status_code, response.text)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                logger.error("Failed to call Docker Model Runner: %s", e)
                raise
