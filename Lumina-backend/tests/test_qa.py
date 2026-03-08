import pytest

@pytest.mark.asyncio
async def test_qa_rejects_empty_borrows(client):
    response = await client.post(
        "/api/v1/qa",
        json={"question": "What is LuminaLib?"}
    )
    assert response.status_code == 400
    err_msg = response.json()["error_message"]
    assert "borrow at least one book" in err_msg or "haven't been ingested" in err_msg

@pytest.mark.asyncio
async def test_qa_with_mocked_book(client):
    from unittest.mock import patch
    
    b_resp = await client.post(
        "/api/v1/books",
        data={
            "title": "QA Book", 
            "author": "X", 
            "genre": "Y", 
            "year_published": 2000, 
            "description": "Z"
        },
        files={"file": ("test.txt", b"TXT Content", "text/plain")}
    )
    assert b_resp.status_code == 201
    b_id = b_resp.json()["data"]["id"]
    
    # Borrow it
    try:
        await client.post(f"/api/v1/books/{b_id}/borrow")
    except Exception:
        pass
        
    with patch("luminalib.api.v1.endpoints.qa._generate_answer") as mock_gen:
        mock_gen.return_value = "Mock Answer"
        
        resp = await client.post("/api/v1/qa", json={"question": "What?"})
        assert resp.status_code == 200
        assert resp.json()["data"]["answer"] == "Mock Answer"
