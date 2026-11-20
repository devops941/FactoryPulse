"""Repository for downtime events and audit logs."""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import math


def _doc(d):
    """Convert MongoDB document to dict with string ID."""
    if d:
        d["id"] = str(d.pop("_id"))
    return d


async def create_event(db: AsyncIOMotorDatabase, data: dict) -> str:
    """
    Create a new downtime event.

    Args:
        db: MongoDB database instance
        data: Event data dictionary

    Returns:
        Event ID as string
    """
    result = await db.downtime_events.insert_one(data)
    return str(result.inserted_id)


async def get_event(db: AsyncIOMotorDatabase, event_id: str) -> dict | None:
    """
    Get a downtime event by ID.

    Args:
        db: MongoDB database instance
        event_id: Event ID as string

    Returns:
        Event document or None if not found
    """
    try:
        doc = await db.downtime_events.find_one({"_id": ObjectId(event_id)})
        return _doc(doc)
    except:
        return None


async def list_events(
    db: AsyncIOMotorDatabase,
    plant_id: str = None,
    machine_id: str = None,
    shift_id: str = None,
    reason_id: str = None,
    start_from: datetime = None,
    start_to: datetime = None,
    status: str = None,
    page: int = 1,
    limit: int = 20
) -> tuple[list[dict], int]:
    """
    List downtime events with filtering and pagination.

    Args:
        db: MongoDB database instance
        plant_id: Filter by plant
        machine_id: Filter by machine
        shift_id: Filter by shift
        reason_id: Filter by reason
        start_from: Filter events starting from this datetime
        start_to: Filter events starting up to this datetime
        status: Filter by status
        page: Page number (1-based)
        limit: Items per page

    Returns:
        Tuple of (events list, total count)
    """
    query = {}

    if plant_id:
        query["plant_id"] = plant_id
    if machine_id:
        query["machine_id"] = machine_id
    if shift_id:
        query["shift_id"] = shift_id
    if reason_id:
        query["reason_id"] = reason_id
    if status:
        query["status"] = status
    else:
        # By default, exclude soft-deleted events
        query["status"] = {"$ne": "soft_deleted"}

    # Date range filter
    if start_from or start_to:
        query["start_at"] = {}
        if start_from:
            query["start_at"]["$gte"] = start_from
        if start_to:
            query["start_at"]["$lte"] = start_to

    total = await db.downtime_events.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.downtime_events.find(query).sort("start_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return [_doc(d) for d in docs], total


async def update_event(db: AsyncIOMotorDatabase, event_id: str, updates: dict) -> bool:
    """
    Update a downtime event.

    Args:
        db: MongoDB database instance
        event_id: Event ID as string
        updates: Dictionary of fields to update

    Returns:
        True if update successful, False otherwise
    """
    result = await db.downtime_events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": updates}
    )
    return result.modified_count > 0


async def soft_delete_event(db: AsyncIOMotorDatabase, event_id: str) -> bool:
    """
    Soft delete a downtime event.

    Args:
        db: MongoDB database instance
        event_id: Event ID as string

    Returns:
        True if soft delete successful, False otherwise
    """
    result = await db.downtime_events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"status": "soft_deleted", "deleted_at": datetime.utcnow()}}
    )
    return result.modified_count > 0


async def create_audit_log(db: AsyncIOMotorDatabase, log_data: dict) -> str:
    """
    Create an audit log entry.

    Args:
        db: MongoDB database instance
        log_data: Audit log data dictionary

    Returns:
        Audit log ID as string
    """
    result = await db.audit_logs.insert_one(log_data)
    return str(result.inserted_id)


async def list_audit_logs(
    db: AsyncIOMotorDatabase,
    entity_id: str = None,
    entity_type: str = None,
    limit: int = 50
) -> list[dict]:
    """
    List audit logs with optional filtering.

    Args:
        db: MongoDB database instance
        entity_id: Filter by entity ID
        entity_type: Filter by entity type
        limit: Maximum number of results

    Returns:
        List of audit log documents
    """
    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    if entity_type:
        query["entity_type"] = entity_type

    cursor = db.audit_logs.find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)

    return [_doc(d) for d in docs]
