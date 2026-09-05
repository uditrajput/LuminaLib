"""RBAC Permission Matrix definitions and FastAPI permission dependency checkers."""

from __future__ import annotations

from typing import Callable, Dict, List
from fastapi import Depends, HTTPException, status
from luminalib.api.v1.deps import get_current_user
from luminalib.models.user import User

# Standard permission keys corresponding to Roles.png matrix
PERMISSIONS = {
    "dashboard": "Access main metrics & telemetry dashboard",
    "books_read": "View & read public and assigned private books",
    "books_upload": "Upload public and private books",
    "books_manage": "Edit and delete library books",
    "groups_manage": "Create user groups, enroll members, assign private books",
    "qa_rag": "Perform RAG Q&A and topic practice questions",
    "voice_ai": "Use real-time voice assistant and voice actions",
    "settings_config": "Manage app configs, SMTP, and OAuth providers",
    "users_rbac": "Full administrative access to manage users and roles",
    "quiz_manage": "Create/manage/grade quizzes & assign to groups (AI + manual)",
    "quiz_attempt": "Attempt assigned quizzes and view own results",
    "quiz_review": "Review own quiz submissions & explanations",
}

DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "admin": list(PERMISSIONS.keys()),
    "teacher": [
        "dashboard",
        "books_read",
        "books_upload",
        "groups_manage",
        "qa_rag",
        "voice_ai",
        "quiz_manage",
        "quiz_attempt",
        "quiz_review",
    ],
    "user": [
        "dashboard",
        "books_read",
        "qa_rag",
        "voice_ai",
        "quiz_attempt",
        "quiz_review",
    ],
}


def user_has_permission(user: User, perm: str) -> bool:
    """Check if a user has a specific permission key in their assigned role."""
    if not user or not user.role:
        return False
    if user.role.name.lower() == "admin":
        return True
    role_perms = user.role.permissions_json or {}
    if isinstance(role_perms, list):
        return perm in role_perms
    if isinstance(role_perms, dict):
        return bool(role_perms.get(perm, False))
    return False


def require_permission(perm: str) -> Callable:
    """FastAPI dependency factory enforcing a required permission key."""

    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not user_has_permission(current_user, perm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{perm}'.",
            )
        return current_user

    return permission_checker
