import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_start_ingestion(client: AsyncClient):
    from unittest.mock import patch
    with patch("luminalib.api.v1.endpoints.ingestion.asyncio.create_task") as mock_task:
        # First, create a document to ingest
        doc_resp = await client.post(
            "/api/v1/documents",
            json={"filename": "ingest.txt", "content": "Test ingestion content"}
        )
        assert doc_resp.status_code == 201
        doc_id = doc_resp.json()["data"]["id"]

        # Trigger ingestion
        ingest_resp = await client.post(f"/api/v1/ingestion/{doc_id}")
        assert ingest_resp.status_code == 202
        job_id = ingest_resp.json()["data"]["id"]

        # List jobs
        list_jobs = await client.get("/api/v1/ingestion/jobs")
        assert list_jobs.status_code == 200
        assert len(list_jobs.json()["data"]) >= 1

        # Get job status
        job_status = await client.get(f"/api/v1/ingestion/jobs/{job_id}")
        assert job_status.status_code == 200
        assert job_status.json()["data"]["id"] == job_id
        
        mock_task.assert_called_once()

@pytest.mark.asyncio
async def test_ingest_missing_document(client: AsyncClient):
    response = await client.post("/api/v1/ingestion/99999")
    assert response.status_code == 404
