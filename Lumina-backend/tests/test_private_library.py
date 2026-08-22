"""Tests for Public vs. Private Library catalog, PDF stream authorization, and RAG vector isolation."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_private_book_upload_and_isolation(client: AsyncClient, admin_token_headers: dict):
    # Upload a private book
    file_content = b"Private Research Paper Content for testing private library isolation."
    files = {"file": ("private_paper.txt", file_content, "text/plain")}
    data = {
        "title": "Private AI Ethics Paper",
        "author": "Dr. Smith",
        "genre": "Research",
        "year_published": 2026,
        "access_level": "private"
    }

    res = await client.post("/api/v1/books", data=data, files=files, headers=admin_token_headers)
    assert res.status_code == 201
    b_data = res.json()["data"]
    book_id = b_data["id"]
    assert b_data["access_level"] == "private"

    # List private catalog
    priv_res = await client.get("/api/v1/books?catalog=private", headers=admin_token_headers)
    assert priv_res.status_code == 200
