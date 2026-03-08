import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_books_list_empty(client: AsyncClient):
    response = await client.get("/api/v1/books")
    assert response.status_code == 200
    assert response.json()["data"]["total"] == 0

@pytest.mark.asyncio
async def test_books_create_and_get(client: AsyncClient):
    # Pass all required fields as form values
    response = await client.post(
        "/api/v1/books",
        data={
            "title": "Test Book",
            "author": "Test Author",
            "genre": "Fiction",
            "year_published": 2024,
            "description": "desc"
        },
        files={
            "file": ("test.txt", b"TXT Content", "text/plain")
        }
    )
    assert response.status_code == 201, response.json()
    book_id = response.json()["data"]["id"]

    get_resp = await client.get(f"/api/v1/books/{book_id}")
    assert get_resp.status_code == 200

@pytest.mark.asyncio
async def test_books_update(client: AsyncClient):
    response = await client.post(
        "/api/v1/books",
        data={
            "title": "To Update", "author": "Wait",
            "genre": "x", "year_published": 2000, "description": "y"
        },
        files={"file": ("test.txt", b"TXT Content", "text/plain")}
    )
    assert response.status_code == 201
    book_id = response.json()["data"]["id"]

    update_resp = await client.put(
        f"/api/v1/books/{book_id}",
        data={"title": "Updated Title", "author": "Wait", "genre": "x", "year_published": 2000, "description": "y"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["title"] == "Updated Title"

@pytest.mark.asyncio
async def test_books_delete(client: AsyncClient):
    response = await client.post(
        "/api/v1/books",
        data={
            "title": "To Delete", "author": "Delete",
            "genre": "z", "year_published": 2000, "description": "w"
        },
        files={"file": ("test.txt", b"TXT Content", "text/plain")}
    )
    assert response.status_code == 201
    book_id = response.json()["data"]["id"]

    del_resp = await client.delete(f"/api/v1/books/{book_id}")
    assert del_resp.status_code == 204
