"""Repository for master data collections (plants, lines, machines, shifts, reasons)."""

import logging
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

logger = logging.getLogger(__name__)


def _doc(d: dict) -> dict:
    """
    Convert MongoDB document by converting _id to id string.

    Args:
        d: MongoDB document

    Returns:
        Document with _id converted to id (string)
    """
    if d is None:
        return None
    d["id"] = str(d.pop("_id"))
    return d


# ============================================================================
# PLANTS
# ============================================================================

async def create_plant(db: AsyncIOMotorDatabase, data: dict) -> str:
    """
    Create a new plant.

    Args:
        db: MongoDB database instance
        data: Plant data dictionary

    Returns:
        Plant ID as string
    """
    result = await db.plants.insert_one(data)
    return str(result.inserted_id)


async def get_plant(db: AsyncIOMotorDatabase, plant_id: str) -> Optional[dict]:
    """
    Get a plant by ID.

    Args:
        db: MongoDB database instance
        plant_id: Plant ID string

    Returns:
        Plant document with id field, or None
    """
    doc = await db.plants.find_one({"_id": ObjectId(plant_id)})
    return _doc(doc) if doc else None


async def list_plants(db: AsyncIOMotorDatabase) -> list[dict]:
    """
    List all plants.

    Args:
        db: MongoDB database instance

    Returns:
        List of plant documents with id field
    """
    cursor = db.plants.find({})
    docs = await cursor.to_list(length=None)
    return [_doc(doc) for doc in docs]


async def update_plant(db: AsyncIOMotorDatabase, plant_id: str, updates: dict) -> bool:
    """
    Update a plant.

    Args:
        db: MongoDB database instance
        plant_id: Plant ID string
        updates: Updates dictionary

    Returns:
        True if document was modified, False otherwise
    """
    result = await db.plants.update_one(
        {"_id": ObjectId(plant_id)},
        {"$set": updates}
    )
    return result.modified_count > 0


# ============================================================================
# PRODUCTION LINES
# ============================================================================

async def create_line(db: AsyncIOMotorDatabase, data: dict) -> str:
    """
    Create a new production line.

    Args:
        db: MongoDB database instance
        data: Line data dictionary

    Returns:
        Line ID as string
    """
    result = await db.lines.insert_one(data)
    return str(result.inserted_id)


async def get_line(db: AsyncIOMotorDatabase, line_id: str) -> Optional[dict]:
    """
    Get a line by ID.

    Args:
        db: MongoDB database instance
        line_id: Line ID string

    Returns:
        Line document with id field, or None
    """
    doc = await db.lines.find_one({"_id": ObjectId(line_id)})
    return _doc(doc) if doc else None


async def list_lines(db: AsyncIOMotorDatabase, plant_id: str) -> list[dict]:
    """
    List all lines for a plant.

    Args:
        db: MongoDB database instance
        plant_id: Plant ID string

    Returns:
        List of line documents with id field
    """
    cursor = db.lines.find({"plant_id": plant_id})
    docs = await cursor.to_list(length=None)
    return [_doc(doc) for doc in docs]


# ============================================================================
# MACHINES
# ============================================================================

async def create_machine(db: AsyncIOMotorDatabase, data: dict) -> str:
    """
    Create a new machine.

    Args:
        db: MongoDB database instance
        data: Machine data dictionary

    Returns:
        Machine ID as string
    """
    result = await db.machines.insert_one(data)
    return str(result.inserted_id)


async def get_machine(db: AsyncIOMotorDatabase, machine_id: str) -> Optional[dict]:
    """
    Get a machine by ID.

    Args:
        db: MongoDB database instance
        machine_id: Machine ID string

    Returns:
        Machine document with id field, or None
    """
    doc = await db.machines.find_one({"_id": ObjectId(machine_id)})
    return _doc(doc) if doc else None


async def list_machines(
    db: AsyncIOMotorDatabase,
    plant_id: Optional[str] = None,
    line_id: Optional[str] = None
) -> list[dict]:
    """
    List machines with optional filtering.

    Args:
        db: MongoDB database instance
        plant_id: Optional plant ID filter
        line_id: Optional line ID filter

    Returns:
        List of machine documents with id field
    """
    query = {}
    if plant_id:
        query["plant_id"] = plant_id
    if line_id:
        query["line_id"] = line_id

    cursor = db.machines.find(query)
    docs = await cursor.to_list(length=None)
    return [_doc(doc) for doc in docs]


async def update_machine(db: AsyncIOMotorDatabase, machine_id: str, updates: dict) -> bool:
    """
    Update a machine.

    Args:
        db: MongoDB database instance
        machine_id: Machine ID string
        updates: Updates dictionary

    Returns:
        True if document was modified, False otherwise
    """
    result = await db.machines.update_one(
        {"_id": ObjectId(machine_id)},
        {"$set": updates}
    )
    return result.modified_count > 0


# ============================================================================
# SHIFTS
# ============================================================================

async def create_shift(db: AsyncIOMotorDatabase, data: dict) -> str:
    """
    Create a new shift.

    Args:
        db: MongoDB database instance
        data: Shift data dictionary

    Returns:
        Shift ID as string
    """
    result = await db.shifts.insert_one(data)
    return str(result.inserted_id)


async def get_shift(db: AsyncIOMotorDatabase, shift_id: str) -> Optional[dict]:
    """
    Get a shift by ID.

    Args:
        db: MongoDB database instance
        shift_id: Shift ID string

    Returns:
        Shift document with id field, or None
    """
    doc = await db.shifts.find_one({"_id": ObjectId(shift_id)})
    return _doc(doc) if doc else None


async def list_shifts(db: AsyncIOMotorDatabase, plant_id: str) -> list[dict]:
    """
    List all shifts for a plant.

    Args:
        db: MongoDB database instance
        plant_id: Plant ID string

    Returns:
        List of shift documents with id field
    """
    cursor = db.shifts.find({"plant_id": plant_id})
    docs = await cursor.to_list(length=None)
    return [_doc(doc) for doc in docs]


# ============================================================================
# DOWNTIME REASONS
# ============================================================================

async def create_reason(db: AsyncIOMotorDatabase, data: dict) -> str:
    """
    Create a new downtime reason.

    Args:
        db: MongoDB database instance
        data: Reason data dictionary

    Returns:
        Reason ID as string
    """
    result = await db.reasons.insert_one(data)
    return str(result.inserted_id)


async def get_reason(db: AsyncIOMotorDatabase, reason_id: str) -> Optional[dict]:
    """
    Get a reason by ID.

    Args:
        db: MongoDB database instance
        reason_id: Reason ID string

    Returns:
        Reason document with id field, or None
    """
    doc = await db.reasons.find_one({"_id": ObjectId(reason_id)})
    return _doc(doc) if doc else None


async def list_reasons(
    db: AsyncIOMotorDatabase,
    plant_id: Optional[str] = None
) -> list[dict]:
    """
    List downtime reasons with optional filtering.

    Args:
        db: MongoDB database instance
        plant_id: Optional plant ID filter

    Returns:
        List of reason documents with id field
    """
    query = {}
    if plant_id:
        query["plant_id"] = plant_id

    cursor = db.reasons.find(query)
    docs = await cursor.to_list(length=None)
    return [_doc(doc) for doc in docs]


async def update_reason(db: AsyncIOMotorDatabase, reason_id: str, updates: dict) -> bool:
    """
    Update a reason.

    Args:
        db: MongoDB database instance
        reason_id: Reason ID string
        updates: Updates dictionary

    Returns:
        True if document was modified, False otherwise
    """
    result = await db.reasons.update_one(
        {"_id": ObjectId(reason_id)},
        {"$set": updates}
    )
    return result.modified_count > 0
