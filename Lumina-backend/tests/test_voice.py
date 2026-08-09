import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_voice_voices_list(client: AsyncClient):
    """Test listing available Kokoro TTS voice packs."""
    response = await client.get("/api/v1/voice/voices")
    assert response.status_code == 200
    data = response.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 5
    codes = [v["code"] for v in data]
    assert "af_bella" in codes
    assert "am_adam" in codes


@pytest.mark.asyncio
async def test_voice_preferences_get_and_update(client: AsyncClient):
    """Test getting and updating user voice preferences."""
    get_resp = await client.get("/api/v1/voice/preferences")
    assert get_resp.status_code == 200
    prefs = get_resp.json()["data"]
    assert prefs["voice"] == "af_bella"

    update_resp = await client.put(
        "/api/v1/voice/preferences",
        json={"voice": "am_adam", "speed": 1.2, "auto_play": False},
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()["data"]
    assert updated["voice"] == "am_adam"
    assert updated["speed"] == 1.2
    assert updated["auto_play"] is False


@pytest.mark.asyncio
async def test_voice_conversations_list_empty(client: AsyncClient):
    """Test fetching empty conversation history for a user."""
    response = await client.get("/api/v1/voice/conversations")
    assert response.status_code == 200
    assert response.json()["data"] == []
