import pytest

@pytest.mark.asyncio
async def test_auth_signup(client):
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": "newuser@test.com", "password": "UserPass123!", "full_name": "Test User"}
    )
    assert response.status_code == 201
    assert response.json()["data"]["bio"] == "Student"

@pytest.mark.asyncio
async def test_auth_login(client):
    # The default DB user is loaded with email test@test.com and password "pw", but hashed.
    # We should sign up a known user
    try:
        await client.post(
            "/api/v1/auth/signup",
            json={"email": "logintest@test.com", "password": "UserPass123!", "full_name": "Test User"}
        )
    except:
        pass
        
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "logintest@test.com", "password": "UserPass123!"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()["data"]
