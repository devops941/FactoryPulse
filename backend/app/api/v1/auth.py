"""Authentication endpoints."""

import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, UserResponse
from app.services.auth_service import authenticate_user, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Authenticate user and return access and refresh tokens.

    Args:
        request: Login credentials
        db: MongoDB database instance

    Returns:
        TokenResponse with access_token and refresh_token
    """
    user = await authenticate_user(db, request.email, request.password)
    if not user:
        logger.warning(f"Failed login attempt for email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.get("is_active", False):
        logger.warning(f"Login attempt for inactive user: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    # Create tokens
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role": user["role"]}
    )
    refresh_token = create_refresh_token(
        data={"sub": user["id"], "email": user["email"]}
    )

    logger.info(f"User logged in: {request.email}")
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: RefreshRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Issue a new access token using a refresh token.

    Args:
        request: Refresh token request
        db: MongoDB database instance

    Returns:
        TokenResponse with new access_token
    """
    payload = decode_token(request.refresh_token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Verify user still exists and is active
    from app.repositories import user_repository
    user = await user_repository.get_user_by_id(db, user_id)
    if not user or not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new access token
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role": user["role"]}
    )
    new_refresh_token = create_refresh_token(
        data={"sub": user["id"], "email": user["email"]}
    )

    logger.info(f"Token refreshed for user: {user['email']}")
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout endpoint (stateless - client removes token).

    Args:
        current_user: Current authenticated user

    Returns:
        Success message
    """
    logger.info(f"User logged out: {current_user['email']}")
    return {"message": "logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current user profile.

    Args:
        current_user: Current authenticated user

    Returns:
        UserResponse with user details
    """
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        plant_ids=current_user.get("plant_ids", []),
        is_active=current_user.get("is_active", False),
    )
