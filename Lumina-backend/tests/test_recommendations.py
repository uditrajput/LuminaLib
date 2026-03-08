import pytest

@pytest.mark.asyncio
async def test_get_recommendations(client):
    response = await client.get("/api/v1/recommendations")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)

@pytest.mark.asyncio
async def test_train_recommendations(client):
    response = await client.post("/api/v1/recommendations/train")
    assert response.status_code == 200
    assert "detail" in response.json()["data"]
