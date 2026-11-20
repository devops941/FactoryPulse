"""Authentication-related Pydantic schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response body."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Refresh token request body."""
    refresh_token: str


class UserResponse(BaseModel):
    """User response (safe to send to client)."""
    id: str
    name: str
    email: str
    role: str
    plant_ids: list[str]
    is_active: bool


class CreateUserRequest(BaseModel):
    """Create user request body."""
    name: str
    email: EmailStr
    password: str
    role: str
    plant_ids: list[str] = []
