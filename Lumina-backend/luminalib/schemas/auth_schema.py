"""Authentication schemas."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Login payload."""

    email: str
    password: str


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
