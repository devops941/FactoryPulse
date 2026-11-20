"""Service layer for downtime event management."""

from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories import downtime_repository
from app.schemas.downtime import DowntimeEventResponse


def calculate_duration_min(start_at: datetime, end_at: datetime) -> float:
    """
    Calculate duration in minutes between two datetimes.

    Args:
        start_at: Start datetime
        end_at: End datetime

    Returns:
        Duration in minutes (rounded to 2 decimal places)
    """
    delta = end_at - start_at
    return round(delta.total_seconds() / 60, 2)


def validate_event_times(start_at: datetime, end_at: datetime) -> str | None:
    """
    Validate event start and end times.

    Args:
        start_at: Start datetime
        end_at: End datetime

    Returns:
        Error message string or None if valid
    """
    if end_at <= start_at:
        return "end_at must be later than start_at"

    duration_min = calculate_duration_min(start_at, end_at)
    if duration_min > 1440:  # 24 hours
        return "Event duration exceeds 24 hours — please verify timestamps"

    return None


async def create_downtime_event(
    db: AsyncIOMotorDatabase,
    event_data: dict,
    created_by: str
) -> DowntimeEventResponse:
    """
    Create a new downtime event with audit logging.

    Args:
        db: MongoDB database instance
        event_data: Event data dictionary
        created_by: User ID of the creator

    Returns:
        DowntimeEventResponse

    Raises:
        ValueError: If event times are invalid
    """
    start_at = event_data["start_at"]
    end_at = event_data["end_at"]

    # Validate times
    err = validate_event_times(start_at, end_at)
    if err:
        raise ValueError(err)

    # Calculate duration
    duration_min = calculate_duration_min(start_at, end_at)

    # Prepare document
    doc = {
        **event_data,
        "duration_min": duration_min,
        "source": "manual",
        "created_by": created_by,
        "created_at": datetime.utcnow(),
        "status": "confirmed",
    }

    # Insert event
    event_id = await downtime_repository.create_event(db, doc)

    # Create audit log
    await downtime_repository.create_audit_log(db, {
        "user_id": created_by,
        "action": "create",
        "entity_type": "downtime_event",
        "entity_id": event_id,
        "before": None,
        "after": doc,
        "created_at": datetime.utcnow()
    })

    # Fetch and return event
    event = await downtime_repository.get_event(db, event_id)
    return DowntimeEventResponse(**event)


async def update_downtime_event(
    db: AsyncIOMotorDatabase,
    event_id: str,
    updates: dict,
    updated_by: str
) -> DowntimeEventResponse:
    """
    Update a downtime event with audit logging.

    Args:
        db: MongoDB database instance
        event_id: Event ID
        updates: Dictionary of fields to update
        updated_by: User ID of the updater

    Returns:
        Updated DowntimeEventResponse

    Raises:
        ValueError: If update is invalid
    """
    # Get original event
    original = await downtime_repository.get_event(db, event_id)
    if not original:
        raise ValueError("Event not found")

    # Prepare updates
    update_dict = {}

    # If end_at is being updated, validate and recalculate duration
    if "end_at" in updates:
        new_end = updates["end_at"]
        new_start = updates.get("start_at", original["start_at"])

        err = validate_event_times(new_start, new_end)
        if err:
            raise ValueError(err)

        duration_min = calculate_duration_min(new_start, new_end)
        update_dict["end_at"] = new_end
        update_dict["duration_min"] = duration_min
    elif "start_at" in updates:
        new_start = updates["start_at"]
        new_end = original["end_at"]

        err = validate_event_times(new_start, new_end)
        if err:
            raise ValueError(err)

        duration_min = calculate_duration_min(new_start, new_end)
        update_dict["start_at"] = new_start
        update_dict["duration_min"] = duration_min

    # Add other simple fields
    for field in ["reason_id", "shift_id", "notes"]:
        if field in updates and updates[field] is not None:
            update_dict[field] = updates[field]

    # Update timestamp
    update_dict["updated_at"] = datetime.utcnow()

    # Execute update
    success = await downtime_repository.update_event(db, event_id, update_dict)
    if not success:
        raise ValueError("Failed to update event")

    # Create audit log
    updated_event = await downtime_repository.get_event(db, event_id)
    await downtime_repository.create_audit_log(db, {
        "user_id": updated_by,
        "action": "update",
        "entity_type": "downtime_event",
        "entity_id": event_id,
        "before": original,
        "after": updated_event,
        "created_at": datetime.utcnow()
    })

    return DowntimeEventResponse(**updated_event)


async def delete_downtime_event(
    db: AsyncIOMotorDatabase,
    event_id: str,
    deleted_by: str
) -> None:
    """
    Soft delete a downtime event with audit logging.

    Args:
        db: MongoDB database instance
        event_id: Event ID
        deleted_by: User ID of the deleter

    Raises:
        ValueError: If event not found or deletion fails
    """
    # Get event before deletion
    original = await downtime_repository.get_event(db, event_id)
    if not original:
        raise ValueError("Event not found")

    # Soft delete
    success = await downtime_repository.soft_delete_event(db, event_id)
    if not success:
        raise ValueError("Failed to delete event")

    # Create audit log
    await downtime_repository.create_audit_log(db, {
        "user_id": deleted_by,
        "action": "delete",
        "entity_type": "downtime_event",
        "entity_id": event_id,
        "before": original,
        "after": None,
        "created_at": datetime.utcnow()
    })
