import pytest

@pytest.mark.asyncio
async def test_app_configs_list(client):
    response = await client.get("/api/v1/app-config")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["data"], list)

@pytest.mark.asyncio
async def test_app_configs_create(client):
    response = await client.post("/api/v1/app-config", json={
        "key": "test_key",
        "value": "123",
        "description": "Test Desc"
    })
    assert response.status_code == 201
    assert response.json()["data"]["key"] == "test_key"
    
@pytest.mark.asyncio
async def test_app_configs_update(client):
    # Setup - need to exist to update (db is rolled back individually)
    await client.post("/api/v1/app-config", json={
        "key": "test_key",
        "value": "123",
        "description": "Test Desc"
    })
    
    response = await client.put("/api/v1/app-config/test_key", json={
        "value": "456"
    })
    assert response.status_code == 200
    assert response.json()["data"]["value"] == "456"
