"""Analytics endpoints: overview, machine, shift, reason analytics."""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import Optional

from app.core.database import get_database as get_db
from app.services import analytics_service
from app.schemas.analytics import (
    OverviewAnalyticsResponse, MachineAnalyticsResponse,
    ShiftAnalyticsResponse, ReasonAnalyticsResponse
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=OverviewAnalyticsResponse)
async def get_overview_analytics(
    plant_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    machine_id: Optional[str] = None,
    shift_id: Optional[str] = None,
    reason_id: Optional[str] = None,
    planned_hours: Optional[float] = None,
    db=Depends(get_db)
):
    """
    Get full overview analytics for a plant.

    Query params:
    - plant_id: (required) Plant ID
    - from_date: Optional start date (YYYY-MM-DD)
    - to_date: Optional end date (YYYY-MM-DD)
    - machine_id: Optional machine filter
    - shift_id: Optional shift filter
    - reason_id: Optional reason filter
    - planned_hours: Planned production hours (default: calculated from date range)

    Returns full overview with KPIs, trends, Pareto, rankings, etc.
    """
    if not plant_id:
        raise HTTPException(status_code=400, detail="plant_id is required")

    from_dt = None
    to_dt = None

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="from_date must be YYYY-MM-DD")

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="to_date must be YYYY-MM-DD")

    result = await analytics_service.get_overview_analytics(
        db,
        plant_id=plant_id,
        from_date=from_dt,
        to_date=to_dt,
        machine_id=machine_id,
        shift_id=shift_id,
        reason_id=reason_id,
        planned_production_hours=planned_hours
    )

    return result


@router.get("/machines/{machine_id}", response_model=MachineAnalyticsResponse)
async def get_machine_analytics(
    machine_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Get machine-level analytics.

    Path params:
    - machine_id: Machine ID

    Query params:
    - from_date: Optional start date (YYYY-MM-DD)
    - to_date: Optional end date (YYYY-MM-DD)

    Returns machine analytics with KPIs, trends, reason breakdown.
    """
    from_dt = None
    to_dt = None

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="from_date must be YYYY-MM-DD")

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="to_date must be YYYY-MM-DD")

    result = await analytics_service.get_machine_analytics(
        db,
        machine_id=machine_id,
        from_date=from_dt,
        to_date=to_dt
    )

    return result


@router.get("/shifts", response_model=ShiftAnalyticsResponse)
async def get_shift_analytics(
    plant_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Get shift comparison analytics.

    Query params:
    - plant_id: (required) Plant ID
    - from_date: Optional start date (YYYY-MM-DD)
    - to_date: Optional end date (YYYY-MM-DD)

    Returns shift comparison and hourly heatmap.
    """
    if not plant_id:
        raise HTTPException(status_code=400, detail="plant_id is required")

    from_dt = None
    to_dt = None

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="from_date must be YYYY-MM-DD")

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="to_date must be YYYY-MM-DD")

    result = await analytics_service.get_shift_analytics(
        db,
        plant_id=plant_id,
        from_date=from_dt,
        to_date=to_dt
    )

    return result


@router.get("/reasons", response_model=ReasonAnalyticsResponse)
async def get_reason_analytics(
    plant_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Get reason-based Pareto analytics.

    Query params:
    - plant_id: (required) Plant ID
    - from_date: Optional start date (YYYY-MM-DD)
    - to_date: Optional end date (YYYY-MM-DD)

    Returns Pareto analysis of downtime reasons.
    """
    if not plant_id:
        raise HTTPException(status_code=400, detail="plant_id is required")

    from_dt = None
    to_dt = None

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="from_date must be YYYY-MM-DD")

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="to_date must be YYYY-MM-DD")

    result = await analytics_service.get_reason_analytics(
        db,
        plant_id=plant_id,
        from_date=from_dt,
        to_date=to_dt
    )

    return result
