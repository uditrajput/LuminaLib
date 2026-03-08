import pytest

@pytest.mark.asyncio
async def test_get_me(client):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "test@test.com"

@pytest.mark.asyncio
async def test_get_all_users(client):
    response = await client.get("/api/v1/users")
    assert response.status_code == 200
    assert response.json()["data"]["total"] >= 1
    
@pytest.mark.asyncio
async def test_get_user_by_id(client):
    response = await client.get("/api/v1/users/2")
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "admin@test.com"

@pytest.mark.asyncio
async def test_get_user_preferences(client):
    response = await client.get("/api/v1/users/me/preferences")
    assert response.status_code == 200
    assert "preferences" in response.json()["data"]

@pytest.mark.asyncio
async def test_update_user_preferences(client):
    response = await client.put(
        "/api/v1/users/me/preferences",
        json={"preferences": {"favorite_genres": ["Sci-Fi", "Fantasy"], "favorite_authors": ["X"]}}
    )
    assert response.status_code == 200
    assert "Sci-Fi" in response.json()["data"]["preferences"]["favorite_genres"]

@pytest.mark.asyncio
async def test_admin_create_user_with_bio(client):
    response = await client.post(
        "/api/v1/users",
        json={
            "email": "admincreated@test.com",
            "password": "UserPass123!",
            "full_name": "Admin Created",
            "bio": "Researcher",
            "role": "user"
        }
    )
    assert response.status_code == 201
    assert response.json()["data"]["bio"] == "Researcher"
