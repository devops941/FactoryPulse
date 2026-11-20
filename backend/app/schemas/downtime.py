"""Pydantic schemas for downtime events."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DowntimeEventCreate(BaseModel):
    """Schema for creating a downtime event."""
    plant_id: str
    machine_id: str
    line_id: str
    start_at: datetime
    end_at: datetime
    reason_id: str
    shift_id: str
    notes: Optional[str] = None


class DowntimeEventUpdate(BaseModel):
    """Schema for updating a downtime event."""
    end_at: Optional[datetime] = None
    reason_id: Optional[str] = None
    shift_id: Optional[str] = None
    notes: Optional[str] = None
    correction_note: Optional[str] = None  # required when updating


class DowntimeEventResponse(BaseModel):
    """Schema for downtime event response."""
    id: str
    plant_id: str
    machine_id: str
    line_id: str
    start_at: datetime
    end_at: datetime
    duration_min: float
    reason_id: str
    shift_id: str
    source: str  # manual | csv_import
    batch_id: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    status: str  # confirmed | pending_review | soft_deleted


class DowntimeEventListResponse(BaseModel):
    """Schema for paginated downtime events response."""
    items: list[DowntimeEventResponse]
    total: int
    page: int
    limit: int
    pages: int


class AuditLogResponse(BaseModel):
    """Schema for audit log entry."""
    id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    before: Optional[dict] = None
    after: Optional[dict] = None
    created_at: datetime
