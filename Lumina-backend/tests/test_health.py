import pytest
from httpx import AsyncClient, ASGITransport
from luminalib.main import app

@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == 200
        assert data.get("data", {}).get("status") == "ok"
