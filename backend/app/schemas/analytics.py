"""Pydantic response schemas for analytics endpoints."""

from pydantic import BaseModel
from typing import Optional, Any


class KpiResponse(BaseModel):
    """Key Performance Indicators response."""
    downtime_minutes: float
    downtime_rate_pct: float
    availability_pct: float
    event_count: int
    estimated_units_lost: float
    mttr_min: Optional[float] = None
    mtbf_min: Optional[float] = None


class TrendPoint(BaseModel):
    """Daily trend data point."""
    date: str
    downtime_minutes: float
    event_count: int


class ParetoItem(BaseModel):
    """Pareto analysis item (grouped by reason)."""
    reason_id: str
    reason_label: str
    total_minutes: float
    event_count: int
    share_pct: float
    cumulative_pct: float


class MachineRankItem(BaseModel):
    """Machine ranking item."""
    machine_id: str
    machine_name: str
    machine_code: str
    total_minutes: float
    event_count: int
    estimated_units_lost: float


class ShiftCompareItem(BaseModel):
    """Shift comparison item."""
    shift_id: str
    shift_name: str
    total_minutes: float
    event_count: int


class OverviewAnalyticsResponse(BaseModel):
    """Full overview analytics response."""
    filters: dict
    calculation_version: str
    kpis: KpiResponse
    trend: list[TrendPoint]
    top_reasons: list[ParetoItem]
    machine_ranking: list[MachineRankItem]
    shift_comparison: list[ShiftCompareItem]
    data_quality: dict


class MachineAnalyticsResponse(BaseModel):
    """Machine-level analytics response."""
    machine_id: str
    machine_name: str
    kpis: KpiResponse
    trend: list[TrendPoint]
    reason_breakdown: list[ParetoItem]


class ShiftAnalyticsResponse(BaseModel):
    """Shift comparison analytics response."""
    shifts: list[ShiftCompareItem]
    heatmap: list[dict]  # hour_of_day vs event_count


class ReasonAnalyticsResponse(BaseModel):
    """Reason-based analytics response."""
    pareto: list[ParetoItem]
    total_downtime_minutes: float
