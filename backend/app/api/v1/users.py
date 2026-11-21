"""Users management endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.security import hash_password
from app.schemas.auth import CreateUserRequest, UserResponse
from app.services.auth_service import get_current_user, require_permission
from app.repositories import user_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
@router.get("/", response_model=list[UserResponse], include_in_schema=False)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_permission("read:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List all users (manager/admin only).

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        List of users
    """
    users = await user_repository.list_users(db, skip=skip, limit=limit)
    return [
        UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            plant_ids=user.get("plant_ids", []),
            is_active=user.get("is_active", False),
        )
        for user in users
    ]


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: CreateUserRequest,
    current_user: dict = Depends(require_permission("*")),  # admin only
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Create a new user (admin only).

    Args:
        request: Create user request
        current_user: Current authenticated user (must be admin)
        db: MongoDB database instance

    Returns:
        Created user
    """
    # Check if user already exists
    existing = await user_repository.get_user_by_email(db, request.email)
    if existing:
        logger.warning(f"Attempt to create duplicate user: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    # Validate role
    valid_roles = ["admin", "manager", "engineer", "supervisor", "analyst"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    # Create user
    from datetime import datetime
    user_data = {
        "name": request.name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "role": request.role,
        "plant_ids": request.plant_ids,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }

    user_id = await user_repository.create_user(db, user_data)
    logger.info(f"New user created: {request.email} with role {request.role}")

    return UserResponse(
        id=user_id,
        name=request.name,
        email=request.email,
        role=request.role,
        plant_ids=request.plant_ids,
        is_active=True,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get user by ID.

    Args:
        user_id: User ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        User details
    """
    user = await user_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        plant_ids=user.get("plant_ids", []),
        is_active=user.get("is_active", False),
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    updates: dict,
    current_user: dict = Depends(require_permission("*")),  # admin only
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Update user fields (admin only).

    Args:
        user_id: User ID
        updates: Fields to update (role, plant_ids, is_active)
        current_user: Current authenticated user (must be admin)
        db: MongoDB database instance

    Returns:
        Updated user
    """
    # Allowed fields to update
    allowed_fields = {"role", "plant_ids", "is_active"}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update",
        )

    # Validate role if provided
    if "role" in update_data:
        valid_roles = ["admin", "manager", "engineer", "supervisor", "analyst"]
        if update_data["role"] not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
            )

    success = await user_repository.update_user(db, user_id, update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Fetch and return updated user
    user = await user_repository.get_user_by_id(db, user_id)
    logger.info(f"User updated: {user['email']} with updates: {list(update_data.keys())}")

    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        plant_ids=user.get("plant_ids", []),
        is_active=user.get("is_active", False),
    )
