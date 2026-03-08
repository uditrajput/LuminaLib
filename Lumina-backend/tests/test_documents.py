import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_list_document(client: AsyncClient):
    # Create doc
    r_resp = await client.post(
        "/api/v1/documents",
        json={"filename": "test.txt", "content": "hello world"}
    )
    assert r_resp.status_code == 201
    doc_id = r_resp.json()["data"]["id"]
    
    # List doc
    l_resp = await client.get("/api/v1/documents")
    assert l_resp.status_code == 200
    assert len(l_resp.json()["data"]) >= 1
    
    # Get doc
    g_resp = await client.get(f"/api/v1/documents/{doc_id}")
    assert g_resp.status_code == 200
    assert g_resp.json()["data"]["filename"] == "test.txt"

@pytest.mark.asyncio
async def test_upload_document(client: AsyncClient):
    r_resp = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.txt", b"hello world", "text/plain")}
    )
    assert r_resp.status_code == 201
    assert r_resp.json()["data"]["filename"] == "test.txt"

@pytest.mark.asyncio
async def test_get_missing_document(client: AsyncClient):
    g_resp = await client.get("/api/v1/documents/99999")
    assert g_resp.status_code == 404
