"""Tests for Social Media OAuth 2.0 endpoint handling."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_social_oauth_disabled_by_default(client: AsyncClient):
    res = await client.post("/api/v1/auth/oauth/google", json={})
    assert res.status_code == 400
    body = res.json()
    msg = body.get("error_message") or body.get("detail") or ""
    assert "disabled" in msg.lower()
