"""Pydantic schemas for master data entities."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# --- Plants ---
class PlantCreate(BaseModel):
    """Schema for creating a plant."""
    name: str
    code: str
    timezone: str = "UTC"


class PlantResponse(BaseModel):
    """Schema for plant response."""
    id: str
    name: str
    code: str
    timezone: str


# --- Production Lines ---
class LineCreate(BaseModel):
    """Schema for creating a production line."""
    plant_id: str
    name: str
    code: str


class LineResponse(BaseModel):
    """Schema for production line response."""
    id: str
    plant_id: str
    name: str
    code: str


# --- Machines ---
class MachineCreate(BaseModel):
    """Schema for creating a machine."""
    plant_id: str
    line_id: str
    code: str
    name: str
    rated_output_per_hour: float = 0.0
    status: str = "active"  # active | inactive | maintenance


class MachineResponse(BaseModel):
    """Schema for machine response."""
    id: str
    plant_id: str
    line_id: str
    code: str
    name: str
    rated_output_per_hour: float
    status: str


class MachineUpdate(BaseModel):
    """Schema for updating a machine."""
    name: Optional[str] = None
    rated_output_per_hour: Optional[float] = None
    status: Optional[str] = None


# --- Shifts ---
class ShiftCreate(BaseModel):
    """Schema for creating a shift."""
    plant_id: str
    name: str
    start_local: str  # "06:00"
    end_local: str    # "14:00"


class ShiftResponse(BaseModel):
    """Schema for shift response."""
    id: str
    plant_id: str
    name: str
    start_local: str
    end_local: str


# --- Downtime Reasons ---
class ReasonCreate(BaseModel):
    """Schema for creating a downtime reason."""
    plant_id: str
    code: str
    label: str
    category: str  # mechanical | electrical | material | operator | planned | other
    is_planned: bool = False


class ReasonResponse(BaseModel):
    """Schema for downtime reason response."""
    id: str
    plant_id: str
    code: str
    label: str
    category: str
    is_planned: bool
    active: bool
