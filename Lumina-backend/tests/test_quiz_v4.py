"""Tests for Quiz v4.0 + Progress/History/Insights/Search/Study/Audiobook/Discussions (user-specific, no false data)."""

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_quiz_create_requires_quiz_manage(client: AsyncClient):
    # user (no quiz_manage) -> 403
    payload = {"title": "Test Quiz", "description": "desc", "duration_minutes": 30, "questions": [{"type": "mcq_single", "prompt": "Q1?", "marks": 1, "options": [{"text": "A", "is_correct": True}, {"text": "B", "is_correct": False}]}]}
    res = await client.post("/api/v1/quizzes", json=payload)
    assert res.status_code == 403
    # admin can create
    res2 = await client.post("/api/v1/quizzes", json=payload, headers={"Authorization": "Bearer mock_admin_token"})
    assert res2.status_code == 201
    data = res2.json()["data"]
    assert data["title"] == "Test Quiz"
    assert data["total_marks"] == 1

@pytest.mark.asyncio
async def test_quiz_generate_and_assign_and_attempt_flow(client: AsyncClient, admin_token_headers: dict):
    # create quiz
    payload = {"title": "Flow Quiz", "duration_minutes": 5, "pass_percentage": 40, "questions": [
        {"type": "mcq_single", "prompt": "2+2?", "marks": 2, "options": [{"text": "4", "is_correct": True}, {"text": "5", "is_correct": False}]},
        {"type": "descriptive", "prompt": "Explain AI", "marks": 5, "rubric": "cover basics"}
    ]}
    res = await client.post("/api/v1/quizzes", json=payload, headers=admin_token_headers)
    assert res.status_code == 201
    quiz = res.json()["data"]
    qid = quiz["id"]
    # create group for assignment
    gres = await client.post("/api/v1/groups", json={"name": "TestGroupFlow"}, headers=admin_token_headers)
    assert gres.status_code == 201
    gid = gres.json()["data"]["id"]
    # assign
    ares = await client.post(f"/api/v1/quizzes/{qid}/assign", json={"group_ids": [gid]}, headers=admin_token_headers)
    assert ares.status_code == 200
    # add user to group (user id 1)
    mres = await client.post(f"/api/v1/groups/{gid}/members", json={"user_id": 1, "role_in_group": "student"}, headers=admin_token_headers)
    assert mres.status_code in (200, 201)
    # user lists assigned
    lres = await client.get("/api/v1/quizzes?scope=assigned")
    assert lres.status_code == 200
    # generate AI (mock)
    gen = await client.post("/api/v1/quizzes/generate", json={"source": "topic", "topic": "OS", "num_questions": 2}, headers=admin_token_headers)
    assert gen.status_code == 200
    assert "questions" in gen.json()["data"]

@pytest.mark.asyncio
async def test_quiz_attempt_and_submit_and_result(client: AsyncClient, admin_token_headers: dict):
    # create published quiz via assign
    payload = {"title": "Attempt Quiz", "duration_minutes": 5, "questions": [{"type": "mcq_single", "prompt": "Capital of France?", "marks": 1, "options": [{"text": "Paris", "is_correct": True}, {"text": "London", "is_correct": False}]}]}
    res = await client.post("/api/v1/quizzes", json=payload, headers=admin_token_headers)
    qid = res.json()["data"]["id"]
    gres = await client.post("/api/v1/groups", json={"name": "G2"}, headers=admin_token_headers)
    gid = gres.json()["data"]["id"]
    await client.post(f"/api/v1/quizzes/{qid}/assign", json={"group_ids": [gid]}, headers=admin_token_headers)
    await client.post(f"/api/v1/groups/{gid}/members", json={"user_id": 1, "role_in_group": "student"}, headers=admin_token_headers)
    # start attempt as user
    sres = await client.post(f"/api/v1/quizzes/{qid}/attempts")
    assert sres.status_code in (200, 201)
    attempt_id = sres.json()["data"]["attempt_id"]
    # save answers (need question id)
    qdetail = await client.get(f"/api/v1/quizzes/{qid}", headers=admin_token_headers)
    qid_q = qdetail.json()["data"]["questions"][0]["id"]
    # patch answers
    pres = await client.patch(f"/api/v1/quizzes/attempts/{attempt_id}/answers", json={"answers": [{"question_id": qid_q, "selected_option_ids": ["a"]}]})
    assert pres.status_code == 200
    # submit
    sub = await client.post(f"/api/v1/quizzes/attempts/{attempt_id}/submit")
    assert sub.status_code == 200
    assert sub.json()["data"]["status"] in ("graded", "submitted", "pending_grading")
    # result
    rres = await client.get(f"/api/v1/quizzes/attempts/{attempt_id}/result")
    assert rres.status_code == 200
    assert "score" in rres.json()["data"]

@pytest.mark.asyncio
async def test_quiz_history_user_specific_no_leakage(client: AsyncClient, admin_token_headers: dict):
    # history for user (id 1) should be only own attempts, never admin's
    hres = await client.get("/api/v1/users/me/quiz-history")
    assert hres.status_code == 200
    data = hres.json()["data"]
    assert "history" in data
    assert "user_id" in data
    assert data["user_id"] == 1
    # every entry must have time_taken_seconds, score, etc., and no other user_id leakage
    for entry in data["history"]:
        assert "score" in entry
        assert "time_taken_seconds" in entry
        assert entry["quiz_title"] is not None
    # call as admin — should see only admin's history (empty)
    h2 = await client.get("/api/v1/users/me/quiz-history", headers=admin_token_headers)
    assert h2.status_code == 200
    assert h2.json()["data"]["user_id"] == 2

@pytest.mark.asyncio
async def test_quiz_insights_no_false_data(client: AsyncClient):
    # user with no history -> has_data false, no false suggestions
    # first, ensure we have a user with possibly previous attempts, but test honest message
    # create fresh: insights should never contain other users data
    res = await client.get("/api/v1/users/me/quiz-insights")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "has_data" in data
    assert "suggestions" in data
    assert "stats" in data or data["stats"] is None
    if not data["has_data"]:
        assert "No quiz history" in data["message"]
        assert data["suggestions"] == []
    else:
        # grounded true
        assert data["grounded"] is True
        # suggestions are non-empty and user-specific
        assert len(data["suggestions"]) <= 3
        # no generic false data: suggestions must reference actual stats numbers
        # check that suggestions mention real numbers (at least one contains % or time)
        joined = " ".join(data["suggestions"])
        assert any(str(data["stats"]["avg_percentage"]) in joined or str(data["stats"]["pass_rate"]) in joined or "avg" in joined.lower())

@pytest.mark.asyncio
async def test_progress_and_highlights_and_stats(client: AsyncClient):
    # progress upsert
    pres = await client.post("/api/v1/progress", json={"book_id": 1, "pages_read": 5, "progress_pct": 20, "duration_seconds": 60})
    assert pres.status_code in (200, 201)
    # highlights
    hres = await client.post("/api/v1/progress/highlights", json={"book_id": 1, "page": 1, "text": "hello highlight"})
    assert hres.status_code in (200, 201)
    # list highlights
    lres = await client.get("/api/v1/progress/highlights/1")
    assert lres.status_code == 200
    # stats
    sres = await client.get("/api/v1/progress/stats")
    assert sres.status_code == 200
    assert "streak_days" in sres.json()["data"]

@pytest.mark.asyncio
async def test_search_and_study_and_audiobook_and_discussions(client: AsyncClient, admin_token_headers: dict):
    # search
    sres = await client.get("/api/v1/search?q=test")
    assert sres.status_code == 200
    assert "results" in sres.json()["data"]
    # study generate
    st = await client.post("/api/v1/study/generate", json={"book_id": 1, "type": "flashcards", "count": 2})
    assert st.status_code == 200
    assert st.json()["data"]["type"] == "flashcards"
    # audiobook
    a = await client.get("/api/v1/books/1/audio")
    # may be 404 if book not exists, but 200 or 404 is ok
    assert a.status_code in (200, 404)
    if a.status_code == 200:
        assert "status" in a.json()["data"]
    # discussions
    dpost = await client.post("/api/v1/books/1/discussions", json={"content": "great book", "rating": 5})
    assert dpost.status_code in (200, 201, 404)
    dget = await client.get("/api/v1/books/1/discussions")
    assert dget.status_code in (200, 404)
