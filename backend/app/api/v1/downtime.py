"""API endpoints for downtime event management."""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.services.auth_service import get_current_user, require_permission
from app.services import downtime_service
from app.repositories import downtime_repository
from app.schemas.downtime import (
    DowntimeEventCreate,
    DowntimeEventUpdate,
    DowntimeEventResponse,
    DowntimeEventListResponse,
    AuditLogResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/downtime-events", tags=["Downtime Events"])


@router.get(
    "",
    response_model=DowntimeEventListResponse,
    summary="List downtime events",
    description="Get a paginated list of downtime events with optional filters"
)
async def list_events(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    plant_id: str = Query(None, description="Filter by plant ID"),
    machine_id: str = Query(None, description="Filter by machine ID"),
    shift_id: str = Query(None, description="Filter by shift ID"),
    reason_id: str = Query(None, description="Filter by reason ID"),
    from_date: datetime = Query(None, description="Start date (inclusive)"),
    to_date: datetime = Query(None, description="End date (inclusive)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    Get a paginated list of downtime events.

    Query Parameters:
    - plant_id: Filter by plant
    - machine_id: Filter by machine
    - shift_id: Filter by shift
    - reason_id: Filter by reason
    - from_date: Filter events starting from this date
    - to_date: Filter events starting up to this date
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    """
    try:
        events, total = await downtime_repository.list_events(
            db,
            plant_id=plant_id,
            machine_id=machine_id,
            shift_id=shift_id,
            reason_id=reason_id,
            start_from=from_date,
            start_to=to_date,
            page=page,
            limit=limit
        )

        pages = (total + limit - 1) // limit

        return DowntimeEventListResponse(
            items=[DowntimeEventResponse(**event) for event in events],
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )
    except Exception as e:
        logger.error(f"Error listing events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list events"
        )


@router.post(
    "",
    response_model=DowntimeEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create downtime event",
    description="Create a new downtime event manually"
)
async def create_event(
    event_data: DowntimeEventCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(require_permission("write:events")),
):
    """
    Create a new downtime event.

    Required permission: write:events

    Request body:
    - plant_id: ID of the plant
    - machine_id: ID of the machine
    - line_id: ID of the production line
    - start_at: Event start datetime (ISO 8601)
    - end_at: Event end datetime (ISO 8601)
    - reason_id: ID of the downtime reason
    - shift_id: ID of the shift
    - notes: Optional notes
    """
    try:
        event = await downtime_service.create_downtime_event(
            db,
            event_data.model_dump(),
            created_by=current_user["id"]
        )
        return event
    except ValueError as e:
        logger.warning(f"Validation error creating event: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event"
        )


@router.get(
    "/{event_id}",
    response_model=DowntimeEventResponse,
    summary="Get downtime event",
    description="Get a specific downtime event by ID"
)
async def get_event(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific downtime event."""
    try:
        event = await downtime_repository.get_event(db, event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        return DowntimeEventResponse(**event)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get event"
        )


@router.patch(
    "/{event_id}",
    response_model=DowntimeEventResponse,
    summary="Update downtime event",
    description="Update specific fields of a downtime event"
)
async def update_event(
    event_id: str,
    updates: DowntimeEventUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(require_permission("write:events")),
):
    """
    Update a downtime event.

    Required permission: write:events

    You can update:
    - end_at: Event end time
    - reason_id: Downtime reason
    - shift_id: Shift
    - notes: Notes
    """
    try:
        # Filter out None values
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        if not update_data:
            raise ValueError("No fields to update")

        event = await downtime_service.update_downtime_event(
            db,
            event_id,
            update_data,
            updated_by=current_user["id"]
        )
        return event
    except ValueError as e:
        logger.warning(f"Validation error updating event: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update event"
        )


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete downtime event",
    description="Soft delete a downtime event"
)
async def delete_event(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(require_permission("admin:all")),
):
    """
    Soft delete a downtime event.

    Required permission: admin:all

    This marks the event as deleted but retains the data for audit purposes.
    """
    try:
        await downtime_service.delete_downtime_event(
            db,
            event_id,
            deleted_by=current_user["id"]
        )
    except ValueError as e:
        logger.warning(f"Validation error deleting event: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error deleting event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete event"
        )


@router.get(
    "/{event_id}/audit",
    response_model=list[AuditLogResponse],
    summary="Get audit history",
    description="Get audit log entries for a specific event"
)
async def get_audit_history(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Get audit history for a downtime event.

    Shows all changes made to the event over time.
    """
    try:
        logs = await downtime_repository.list_audit_logs(
            db,
            entity_id=event_id,
            entity_type="downtime_event",
            limit=limit
        )
        return [AuditLogResponse(**log) for log in logs]
    except Exception as e:
        logger.error(f"Error getting audit history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get audit history"
        )
