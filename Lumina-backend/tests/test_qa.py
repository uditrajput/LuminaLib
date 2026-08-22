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


@pytest.mark.asyncio
async def test_chat_session_crud(client):
    from unittest.mock import patch

    # Create and borrow book so QA user is allowed
    b_resp = await client.post(
        "/api/v1/books",
        data={"title": "Session Book", "author": "A", "genre": "B", "year_published": 2021, "description": "C"},
        files={"file": ("sess.txt", b"Session text", "text/plain")}
    )
    b_id = b_resp.json()["data"]["id"]
    try:
        await client.post(f"/api/v1/books/{b_id}/borrow")
    except Exception:
        pass

    # 1. Create Session
    create_resp = await client.post("/api/v1/qa/sessions", json={"title": "Physics Q&A"})
    assert create_resp.status_code == 200
    sess_id = create_resp.json()["data"]["id"]
    assert create_resp.json()["data"]["title"] == "Physics Q&A"

    # 2. Rename Session
    ren_resp = await client.put(f"/api/v1/qa/sessions/{sess_id}", json={"title": "Quantum Physics"})
    assert ren_resp.status_code == 200
    assert ren_resp.json()["data"]["title"] == "Quantum Physics"

    # 3. Ask in Session
    with patch("luminalib.api.v1.endpoints.qa._generate_answer") as mock_gen:
        mock_gen.return_value = "Quantum state explanation"
        ask_resp = await client.post(f"/api/v1/qa/sessions/{sess_id}/ask", json={"question": "What is superposition?"})
        assert ask_resp.status_code == 200
        assert ask_resp.json()["data"]["answer"] == "Quantum state explanation"

    # 4. List Sessions (now non-empty)
    list_resp = await client.get("/api/v1/qa/sessions")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 1

    # 5. Get Session Detail
    detail_resp = await client.get(f"/api/v1/qa/sessions/{sess_id}")
    assert detail_resp.status_code == 200
    msgs = detail_resp.json()["data"]["messages"]
    assert len(msgs) == 2  # user + assistant

    # 6. Save/Bookmark Message
    msg_id = msgs[1]["id"]
    save_resp = await client.post(f"/api/v1/qa/messages/{msg_id}/save")
    assert save_resp.status_code == 200
    assert save_resp.json()["data"]["is_saved"] is True

    # 7. Delete Session
    del_resp = await client.delete(f"/api/v1/qa/sessions/{sess_id}")
    assert del_resp.status_code == 204

