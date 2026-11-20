import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

logger = logging.getLogger(__name__)

motor_client: AsyncIOMotorClient | None = None


async def connect_to_mongo() -> None:
    """Connect to MongoDB on startup."""
    global motor_client
    settings = get_settings()
    motor_client = AsyncIOMotorClient(settings.MONGODB_URI)
    logger.info(f"Connected to MongoDB at {settings.MONGODB_URI}")


async def close_mongo_connection() -> None:
    """Close MongoDB connection on shutdown."""
    global motor_client
    if motor_client:
        motor_client.close()
        logger.info("Closed MongoDB connection")


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB database instance."""
    if motor_client is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    settings = get_settings()
    return motor_client[settings.MONGODB_DATABASE]
