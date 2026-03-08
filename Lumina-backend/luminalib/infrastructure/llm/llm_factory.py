"""LLM factory — resolves the active LLMInterface implementation."""

from __future__ import annotations

import logging

from luminalib.core.config import settings
from luminalib.core.dynamic_config import get_dynamic
from luminalib.infrastructure.llm.direct_openai_provider import DirectOpenAIProvider
from luminalib.infrastructure.llm.docker_model_provider import DockerModelProvider
from luminalib.infrastructure.llm.llama_provider import LlamaProvider
from luminalib.infrastructure.llm.mock_provider import MockProvider
from luminalib.infrastructure.llm.ollama_provider import OllamaProvider
from luminalib.infrastructure.llm.openai_provider import OpenAIProvider
from luminalib.interfaces.llm_interface import LLMInterface

logger = logging.getLogger("luminalib.llm.factory")


async def get_llm_provider(
    provider_override: str | None = None,
    api_key_override: str | None = None,
    base_url_override: str | None = None,
    model_override: str | None = None,
) -> LLMInterface:
    """Return the correct LLM implementation based on config or overrides.

    Resolution order for each value:
      1. Explicit override argument (from system_config table)
      2. Dynamic config (app_configs table)
      3. Hard-coded default / settings (.env)
    """
    provider = provider_override or get_dynamic("llm_provider", "mock")

    if provider == "openrouter":
        api_key = api_key_override or get_dynamic("openrouter_api_key")
        model = model_override or get_dynamic("openrouter_model", "meta-llama/llama-3.3-70b-instruct:free")
        if api_key:
            logger.info("Using OpenRouter LLM provider (model=%s)", model)
            return OpenAIProvider(api_key, model)

    if provider == "docker":
        model = model_override or get_dynamic("docker_model") or settings.docker_model_name
        base_url = base_url_override or get_dynamic("docker_base_url") or settings.docker_model_base_url
        logger.info("Using Docker Model Runner provider (model=%s, url=%s)", model, base_url)
        return DockerModelProvider(model=model, base_url=base_url)

    if provider == "ollama":
        model = model_override or get_dynamic("ollama_model", "llama3.2")
        base_url = base_url_override or get_dynamic("ollama_base_url", "http://host.docker.internal:11434")
        logger.info("Using Ollama LLM provider (model=%s, url=%s)", model, base_url)
        return OllamaProvider(model=model, base_url=base_url)

    if provider == "openai":
        api_key = api_key_override or get_dynamic("openai_api_key")
        model = model_override or get_dynamic("openai_model", "gpt-4o-mini")
        if api_key:
            logger.info("Using OpenAI LLM provider (model=%s)", model)
            return DirectOpenAIProvider(api_key=api_key, model=model)
        logger.warning("OpenAI provider selected but no API key found — falling back to mock")

    if provider == "http":
        base_url = base_url_override or get_dynamic("llm_base_url")
        api_key = api_key_override or get_dynamic("llm_api_key")
        if base_url:
            logger.info("Using Llama HTTP LLM provider (url=%s)", base_url)
            return LlamaProvider(base_url, api_key)

    logger.info("Using Mock LLM provider")
    return MockProvider()
