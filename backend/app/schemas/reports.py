"""Pydantic schemas for report generation."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReportCreateRequest(BaseModel):
    """Request schema for creating a report."""
    plant_id: str
    from_date: str  # YYYY-MM-DD
    to_date: str
    machine_id: Optional[str] = None
    shift_id: Optional[str] = None
    format: str = "pdf"  # pdf | csv | xlsx
    title: str = "Downtime Analysis Report"


class ReportResponse(BaseModel):
    """Response schema for report metadata."""
    id: str
    plant_id: str
    title: str
    format: str
    status: str  # pending | completed | failed
    from_date: str
    to_date: str
    created_by: str
    created_at: datetime
    file_path: Optional[str] = None
    file_size_kb: Optional[float] = None

    class Config:
        from_attributes = True
