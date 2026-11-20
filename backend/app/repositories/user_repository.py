"""User repository for MongoDB operations."""

import logging
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> dict | None:
    """
    Get user by email address.

    Args:
        db: MongoDB database instance
        email: User email

    Returns:
        User document or None
    """
    user = await db.users.find_one({"email": email})
    if user:
        user["id"] = str(user["_id"])
    return user


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> dict | None:
    """
    Get user by ID.

    Args:
        db: MongoDB database instance
        user_id: User ID as string

    Returns:
        User document or None
    """
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["id"] = str(user["_id"])
        return user
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {str(e)}")
        return None


async def create_user(db: AsyncIOMotorDatabase, user_data: dict) -> str:
    """
    Create a new user.

    Args:
        db: MongoDB database instance
        user_data: User data dictionary

    Returns:
        Inserted user ID as string
    """
    result = await db.users.insert_one(user_data)
    return str(result.inserted_id)


async def list_users(
    db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 20
) -> list[dict]:
    """
    List users with pagination.

    Args:
        db: MongoDB database instance
        skip: Number of records to skip
        limit: Number of records to return

    Returns:
        List of user documents
    """
    users = await db.users.find({}).skip(skip).limit(limit).to_list(length=limit)
    for user in users:
        user["id"] = str(user["_id"])
    return users


async def update_user(db: AsyncIOMotorDatabase, user_id: str, updates: dict) -> bool:
    """
    Update user fields.

    Args:
        db: MongoDB database instance
        user_id: User ID as string
        updates: Dictionary of fields to update

    Returns:
        True if update was successful, False otherwise
    """
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {str(e)}")
        return False
