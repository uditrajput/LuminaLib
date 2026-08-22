"""Unit and API tests for User Groups (Classes/Cohorts) and Private Entitlements."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from luminalib.services.user_group_service import UserGroupService


@pytest.mark.asyncio
async def test_user_groups_crud(client: AsyncClient, admin_token_headers: dict):
    # Create group
    req = {"name": "CS101 Intro to AI", "description": "Fall 2026 Cohort"}
    res = await client.post("/api/v1/groups", json=req, headers=admin_token_headers)
    assert res.status_code == 201
    group_id = res.json()["data"]["id"]

    # List groups
    list_res = await client.get("/api/v1/groups", headers=admin_token_headers)
    assert list_res.status_code == 200
    groups = list_res.json()["data"]
    assert any(g["id"] == group_id for g in groups)

    # Add member to group
    mem_req = {"user_id": 1, "role_in_group": "teacher"}
    mem_res = await client.post(f"/api/v1/groups/{group_id}/members", json=mem_req, headers=admin_token_headers)
    assert mem_res.status_code == 200
