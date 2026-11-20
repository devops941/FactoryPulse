"""Pydantic schemas for import operations."""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ImportPreviewRow(BaseModel):
    """Schema for a single preview row in import preview."""
    row_number: int
    data: dict[str, Any]
    status: str  # valid | warning | error
    issues: list[str] = []


class ImportPreviewResponse(BaseModel):
    """Schema for import preview response."""
    batch_id: str
    total_rows: int
    valid_count: int
    warning_count: int
    error_count: int
    duplicate_candidates: int
    column_mapping: dict[str, str]
    preview_rows: list[ImportPreviewRow]  # first 20 rows with status
    detected_columns: list[str]


class ImportCommitRequest(BaseModel):
    """Schema for committing an import batch."""
    batch_id: str
    plant_id: str
    skip_duplicates: bool = True


class ImportCommitResponse(BaseModel):
    """Schema for import commit response."""
    batch_id: str
    accepted: int
    rejected: int
    skipped: int
    total: int
    status: str


class ImportBatchResponse(BaseModel):
    """Schema for import batch response."""
    id: str
    plant_id: str
    file_name: str
    uploaded_by: str
    status: str  # processing | completed | failed
    total_rows: int
    accepted: int
    rejected: int
    skipped: int
    errors: list[dict] = []
    created_at: datetime
