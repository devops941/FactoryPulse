"""Authentication service layer."""

import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.security import verify_password, decode_token
from app.core.permissions import has_permission
from app.repositories import user_repository

logger = logging.getLogger(__name__)

# OAuth2 scheme for automatic OpenAPI documentation
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def authenticate_user(
    db: AsyncIOMotorDatabase, email: str, password: str
) -> dict | None:
    """
    Authenticate user by email and password.

    Args:
        db: MongoDB database instance
        email: User email
        password: Plain text password

    Returns:
        User document if authentication successful, None otherwise
    """
    user = await user_repository.get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    """
    Get current user from JWT token.

    Args:
        token: JWT token from Authorization header
        db: MongoDB database instance

    Returns:
        User document

    Raises:
        HTTPException: If token is invalid or user not found
    """
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_permission(permission: str):
    """
    Dependency to require a specific permission.

    Args:
        permission: Permission string to check

    Returns:
        Async function that checks permission
    """
    async def permission_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        """Check if user has required permission."""
        if not has_permission(current_user["role"], permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {permission}",
            )
        return current_user

    return permission_checker
