import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_system_config(client: AsyncClient):
    response = await client.get("/api/v1/config")
    assert response.status_code == 200
    assert "llm_provider" in response.json()["data"]

@pytest.mark.asyncio
async def test_update_system_config(client: AsyncClient):
    response = await client.put(
        "/api/v1/config",
        json={"llm_provider": "openai", "llm_model": "gpt-4"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["llm_provider"] == "openai"
    assert response.json()["data"]["llm_model"] == "gpt-4"
    
    # Switch back to mock for other tests just in case
    await client.put(
        "/api/v1/config",
        json={"llm_provider": "mock"}
    )
