"""API routes for master data management (plants, lines, machines, shifts, reasons)."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.services.auth_service import get_current_user, require_permission
from app.schemas.master_data import (
    PlantCreate,
    PlantResponse,
    LineCreate,
    LineResponse,
    MachineCreate,
    MachineResponse,
    MachineUpdate,
    ShiftCreate,
    ShiftResponse,
    ReasonCreate,
    ReasonResponse,
)
from app.repositories import master_repository

logger = logging.getLogger(__name__)

# ============================================================================
# PLANTS ROUTER
# ============================================================================

plants_router = APIRouter(prefix="/plants", tags=["Plants"])


@plants_router.get("", response_model=list[PlantResponse])
async def list_plants(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List all plants that current user has access to.

    Args:
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        List of plants
    """
    plants = await master_repository.list_plants(db)
    return plants


@plants_router.post("", response_model=PlantResponse, status_code=201)
async def create_plant(
    plant: PlantCreate,
    current_user: dict = Depends(require_permission("write:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Create a new plant.

    Args:
        plant: Plant data
        current_user: Current user (must be admin)
        db: MongoDB database instance

    Returns:
        Created plant with ID
    """
    plant_data = plant.model_dump()
    plant_id = await master_repository.create_plant(db, plant_data)
    created = await master_repository.get_plant(db, plant_id)
    return created


@plants_router.get("/{plant_id}", response_model=PlantResponse)
async def get_plant(
    plant_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get a specific plant by ID.

    Args:
        plant_id: Plant ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        Plant details

    Raises:
        HTTPException: If plant not found
    """
    plant = await master_repository.get_plant(db, plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


# ============================================================================
# PRODUCTION LINES ROUTER
# ============================================================================

lines_router = APIRouter(prefix="/lines", tags=["Production Lines"])


@lines_router.get("", response_model=list[LineResponse])
async def list_lines(
    plant_id: str = Query(..., description="Plant ID"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List production lines for a plant.

    Args:
        plant_id: Plant ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        List of lines for the plant
    """
    lines = await master_repository.list_lines(db, plant_id)
    return lines


@lines_router.post("", response_model=LineResponse, status_code=201)
async def create_line(
    line: LineCreate,
    current_user: dict = Depends(require_permission("write:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Create a new production line.

    Args:
        line: Line data
        current_user: Current user (must be admin)
        db: MongoDB database instance

    Returns:
        Created line with ID
    """
    line_data = line.model_dump()
    line_id = await master_repository.create_line(db, line_data)
    created = await master_repository.get_line(db, line_id)
    return created


@lines_router.get("/{line_id}", response_model=LineResponse)
async def get_line(
    line_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get a specific production line by ID.

    Args:
        line_id: Line ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        Line details

    Raises:
        HTTPException: If line not found
    """
    line = await master_repository.get_line(db, line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")
    return line


# ============================================================================
# MACHINES ROUTER
# ============================================================================

machines_router = APIRouter(prefix="/machines", tags=["Machines"])


@machines_router.get("", response_model=list[MachineResponse])
async def list_machines(
    plant_id: str = Query(None, description="Optional plant ID filter"),
    line_id: str = Query(None, description="Optional line ID filter"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List machines with optional filtering.

    Args:
        plant_id: Optional plant ID to filter
        line_id: Optional line ID to filter
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        List of machines matching filters
    """
    machines = await master_repository.list_machines(db, plant_id, line_id)
    return machines


@machines_router.post("", response_model=MachineResponse, status_code=201)
async def create_machine(
    machine: MachineCreate,
    current_user: dict = Depends(require_permission("write:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Create a new machine.

    Args:
        machine: Machine data
        current_user: Current user (must be admin or manager)
        db: MongoDB database instance

    Returns:
        Created machine with ID
    """
    machine_data = machine.model_dump()
    machine_id = await master_repository.create_machine(db, machine_data)
    created = await master_repository.get_machine(db, machine_id)
    return created


@machines_router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get a specific machine by ID.

    Args:
        machine_id: Machine ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        Machine details

    Raises:
        HTTPException: If machine not found
    """
    machine = await master_repository.get_machine(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine


@machines_router.patch("/{machine_id}", response_model=MachineResponse)
async def update_machine(
    machine_id: str,
    updates: MachineUpdate,
    current_user: dict = Depends(require_permission("write:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Update a machine (only non-None fields are updated).

    Args:
        machine_id: Machine ID
        updates: Fields to update (only non-None values)
        current_user: Current user (must be admin or manager)
        db: MongoDB database instance

    Returns:
        Updated machine

    Raises:
        HTTPException: If machine not found
    """
    # Only include non-None fields
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        # If no updates, just return current machine
        machine = await master_repository.get_machine(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        return machine

    success = await master_repository.update_machine(db, machine_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Machine not found")

    updated = await master_repository.get_machine(db, machine_id)
    return updated


# ============================================================================
# SHIFTS ROUTER
# ============================================================================

shifts_router = APIRouter(prefix="/shifts", tags=["Shifts"])


@shifts_router.get("", response_model=list[ShiftResponse])
@shifts_router.get("/", response_model=list[ShiftResponse], include_in_schema=False)
async def list_shifts(
    plant_id: Optional[str] = Query(None, description="Plant ID"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List shifts for a plant.

    Args:
        plant_id: Plant ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        List of shifts for the plant
    """
    if not plant_id:
        return []
    shifts = await master_repository.list_shifts(db, plant_id)
    return shifts


@shifts_router.post("", response_model=ShiftResponse, status_code=201)
async def create_shift(
    shift: ShiftCreate,
    current_user: dict = Depends(require_permission("write:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Create a new shift.

    Args:
        shift: Shift data
        current_user: Current user (must be admin)
        db: MongoDB database instance

    Returns:
        Created shift with ID
    """
    shift_data = shift.model_dump()
    shift_id = await master_repository.create_shift(db, shift_data)
    created = await master_repository.get_shift(db, shift_id)
    return created


@shifts_router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get a specific shift by ID.

    Args:
        shift_id: Shift ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        Shift details

    Raises:
        HTTPException: If shift not found
    """
    shift = await master_repository.get_shift(db, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


# ============================================================================
# DOWNTIME REASONS ROUTER
# ============================================================================

reasons_router = APIRouter(prefix="/reasons", tags=["Downtime Reasons"])


@reasons_router.get("", response_model=list[ReasonResponse])
async def list_reasons(
    plant_id: str = Query(None, description="Optional plant ID filter"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List downtime reasons with optional filtering.

    Args:
        plant_id: Optional plant ID to filter
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        List of reasons matching filters
    """
    reasons = await master_repository.list_reasons(db, plant_id)
    return reasons


@reasons_router.post("", response_model=ReasonResponse, status_code=201)
async def create_reason(
    reason: ReasonCreate,
    current_user: dict = Depends(require_permission("write:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Create a new downtime reason.

    Args:
        reason: Reason data
        current_user: Current user (must be admin)
        db: MongoDB database instance

    Returns:
        Created reason with ID
    """
    reason_data = reason.model_dump()
    reason_data["active"] = True  # Default active state
    reason_id = await master_repository.create_reason(db, reason_data)
    created = await master_repository.get_reason(db, reason_id)
    return created


@reasons_router.get("/{reason_id}", response_model=ReasonResponse)
async def get_reason(
    reason_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get a specific reason by ID.

    Args:
        reason_id: Reason ID
        current_user: Current authenticated user
        db: MongoDB database instance

    Returns:
        Reason details

    Raises:
        HTTPException: If reason not found
    """
    reason = await master_repository.get_reason(db, reason_id)
    if not reason:
        raise HTTPException(status_code=404, detail="Reason not found")
    return reason


@reasons_router.patch("/{reason_id}/deactivate", response_model=ReasonResponse)
async def deactivate_reason(
    reason_id: str,
    current_user: dict = Depends(require_permission("write:masters")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Soft-delete a reason by deactivating it.

    Args:
        reason_id: Reason ID
        current_user: Current user (must be admin)
        db: MongoDB database instance

    Returns:
        Updated reason

    Raises:
        HTTPException: If reason not found
    """
    success = await master_repository.update_reason(db, reason_id, {"active": False})
    if not success:
        raise HTTPException(status_code=404, detail="Reason not found")

    updated = await master_repository.get_reason(db, reason_id)
    return updated
