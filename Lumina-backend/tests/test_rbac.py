"""Unit and API tests for Role-Based Access Control (RBAC)."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.core.rbac import PERMISSIONS, user_has_permission
from luminalib.models.role import Role
from luminalib.models.user import User


@pytest.mark.asyncio
async def test_list_roles_and_permissions(client: AsyncClient, admin_token_headers: dict):
    res = await client.get("/api/v1/roles", headers=admin_token_headers)
    assert res.status_code == 200
    roles = res.json()["data"]
    assert len(roles) >= 3
    role_names = [r["name"] for r in roles]
    assert "admin" in role_names
    assert "teacher" in role_names
    assert "user" in role_names

    perms_res = await client.get("/api/v1/roles/permissions", headers=admin_token_headers)
    assert perms_res.status_code == 200
    perms_data = perms_res.json()["data"]
    assert "users_rbac" in perms_data


@pytest.mark.asyncio
async def test_create_and_update_custom_role(client: AsyncClient, admin_token_headers: dict):
    # Create custom role
    req = {
        "name": "head_librarian",
        "description": "Head Librarian with catalog & group permissions",
        "permissions": ["dashboard", "books_read", "books_upload", "groups_manage"]
    }
    res = await client.post("/api/v1/roles", json=req, headers=admin_token_headers)
    assert res.status_code == 201
    data = res.json()["data"]
    role_id = data["id"]
    assert data["name"] == "head_librarian"

    # Update role
    upd_req = {
        "description": "Updated Head Librarian Description",
        "permissions": ["dashboard", "books_read", "books_upload", "groups_manage", "qa_rag"]
    }
    upd_res = await client.put(f"/api/v1/roles/{role_id}", json=upd_req, headers=admin_token_headers)
    assert upd_res.status_code == 200
    upd_data = upd_res.json()["data"]
    assert "qa_rag" in upd_data["permissions_json"]

    # Delete custom role
    del_res = await client.delete(f"/api/v1/roles/{role_id}", headers=admin_token_headers)
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_system_admin_role_immutability(client: AsyncClient, admin_token_headers: dict):
    # Admin role is role_id 1
    upd_req = {"description": "Attempt modify", "permissions": ["dashboard"]}
    res = await client.put("/api/v1/roles/1", json=upd_req, headers=admin_token_headers)
    assert res.status_code == 400
    body = res.json()
    msg = body.get("error_message") or body.get("detail") or ""
    assert "immutable" in msg.lower()
