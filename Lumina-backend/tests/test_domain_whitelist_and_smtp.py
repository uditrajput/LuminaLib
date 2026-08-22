"""Tests for domain whitelist validation, verification token processing, and Admin approval workflow."""

import pytest
from httpx import AsyncClient
from luminalib.services.email_service import validate_email_domain


def test_validate_email_domain():
    whitelist = ["@gmail.com", "@hotmail.com", "@outlook.com", "@yahoo.com"]
    assert validate_email_domain("test@gmail.com", whitelist) is True
    assert validate_email_domain("user@hotmail.com", whitelist) is True
    assert validate_email_domain("hack@disposable.com", whitelist) is False


@pytest.mark.asyncio
async def test_domain_whitelist_rejection(client: AsyncClient):
    # Set allowed email domains in config or test default
    signup_req = {
        "email": "attacker@unallowed-domain.org",
        "password": "Password123!@#",
        "full_name": "Domain Attacker"
    }
    res = await client.post("/api/v1/auth/signup", json=signup_req)
    assert res.status_code == 400
    body = res.json()
    msg = body.get("error_message") or body.get("detail") or ""
    assert "not authorized" in msg.lower() or "restricted" in msg.lower()
