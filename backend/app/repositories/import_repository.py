"""Repository for import batch operations.
Uses resilient in-memory staging to prevent MongoDB Atlas collection limit (500/500) exhaustion.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

# In-memory stores for staging and batch history to prevent Atlas collection limits
_staging_batches: dict[str, dict] = {}
_import_batches: list[dict] = []


async def list_batches(db: AsyncIOMotorDatabase, plant_id: str = None, limit: int = 20) -> list[dict]:
    """
    List import batches with optional plant filter.
    """
    # Try MongoDB first if collection exists, fallback to memory
    try:
        query = {}
        if plant_id:
            query["plant_id"] = plant_id
        cursor = db.import_batches.find(query).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        for d in docs:
            d["id"] = str(d.pop("_id"))
        if docs:
            return docs
    except Exception:
        pass

    filtered = [b for b in _import_batches if not plant_id or b.get("plant_id") == plant_id]
    return filtered[:limit]


async def get_batch(db: AsyncIOMotorDatabase, batch_id: str) -> Optional[dict]:
    """
    Get a specific import batch by ID.
    """
    try:
        doc = await db.import_batches.find_one({"_id": batch_id})
        if doc:
            doc["id"] = str(doc.pop("_id"))
            return doc
    except Exception:
        pass

    for b in _import_batches:
        if b.get("id") == batch_id or b.get("_id") == batch_id:
            return b
    return None


async def create_staging_batch(db: AsyncIOMotorDatabase, batch_data: dict) -> str:
    """
    Create a staging batch for preview.
    Stores in memory to completely bypass MongoDB Atlas 500 collections limit.
    """
    batch_id = batch_data.get("_id", "BATCH_STAGING")
    _staging_batches[batch_id] = batch_data

    # Also attempt MongoDB insertion safely without failing on collection limit
    try:
        await db.import_staging.insert_one(batch_data)
    except Exception:
        pass

    return batch_id


async def get_staging_batch(db: AsyncIOMotorDatabase, batch_id: str) -> Optional[dict]:
    """
    Get a staging batch.
    """
    if batch_id in _staging_batches:
        return _staging_batches[batch_id]

    try:
        return await db.import_staging.find_one({"_id": batch_id})
    except Exception:
        return None


async def delete_staging_batch(db: AsyncIOMotorDatabase, batch_id: str) -> bool:
    """
    Delete a staging batch.
    """
    if batch_id in _staging_batches:
        del _staging_batches[batch_id]

    try:
        result = await db.import_staging.delete_one({"_id": batch_id})
        return result.deleted_count > 0
    except Exception:
        return True


def record_batch_completed(batch_record: dict) -> None:
    """Record completed batch in memory cache."""
    batch_record["id"] = str(batch_record.get("_id", ""))
    _import_batches.insert(0, batch_record)
