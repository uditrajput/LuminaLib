import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_books_reviews_and_borrows(client: AsyncClient):
    # Create Book
    b_resp = await client.post(
        "/api/v1/books",
        data={
            "title": "Review Testing",
            "author": "tester",
            "genre": "testing",
            "year_published": 2025,
            "description": "desc"
        },
        files={
            "file": ("test.txt", b"TXT Content", "text/plain")
        }
    )
    assert b_resp.status_code == 201
    b_id = b_resp.json()["data"]["id"]

    # Test initial borrow status
    status_resp = await client.get(f"/api/v1/books/{b_id}/borrow-status")
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["status"] == "Available"
    
    # Try review before borrowing (Should fail)
    r_resp = await client.post(
        f"/api/v1/books/{b_id}/reviews",
        json={"review_text": "Great book", "rating": 5}
    )
    assert r_resp.status_code == 403

    # Borrow book
    bor_resp = await client.post(f"/api/v1/books/{b_id}/borrow")
    assert bor_resp.status_code == 200

    # check status again
    status_resp = await client.get(f"/api/v1/books/{b_id}/borrow-status")
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["status"] == "Borrowed"
    
    # Try borrowing again (Should conflict)
    borrow_conflict = await client.post(f"/api/v1/books/{b_id}/borrow")
    assert borrow_conflict.status_code == 409
    
    # Post review
    r_resp2 = await client.post(
        f"/api/v1/books/{b_id}/reviews",
        json={"review_text": "Great book", "rating": 5}
    )
    assert r_resp2.status_code == 201
    
    # Get reviews
    list_rev = await client.get(f"/api/v1/books/{b_id}/reviews")
    assert list_rev.status_code == 200
    assert len(list_rev.json()["data"]) == 1

    # Get summary
    sum_resp = await client.get(f"/api/v1/books/{b_id}/summary")
    assert sum_resp.status_code == 200
    assert sum_resp.json()["data"]["total_reviews"] == 1
    
    # Get analysis
    ana_resp = await client.get(f"/api/v1/books/{b_id}/analysis")
    assert ana_resp.status_code == 200
    
    # Return book
    ret_resp = await client.post(f"/api/v1/books/{b_id}/return")
    assert ret_resp.status_code == 200
    
    # Try return again
    ret_resp2 = await client.post(f"/api/v1/books/{b_id}/return")
    assert ret_resp2.status_code == 404
    
    # Delete file only
    del_file = await client.delete(f"/api/v1/books/{b_id}/file")
    assert del_file.status_code == 200
