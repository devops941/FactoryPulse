"""Analytics service orchestrating analytics pipeline."""

from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

from app.repositories import downtime_repository, master_repository
from app.analytics.metrics import (
    events_to_dataframe, recalculate_durations, calculate_total_downtime,
    calculate_downtime_rate, calculate_availability, calculate_mttr,
    calculate_mtbf, calculate_estimated_units_lost, calculate_pareto,
    calculate_daily_trend, calculate_machine_ranking, calculate_shift_comparison,
    calculate_data_quality_summary, CALCULATION_VERSION
)

PLANNED_HOURS_PER_SHIFT = 8  # default; ideally from shift config


async def get_overview_analytics(
    db: AsyncIOMotorDatabase,
    plant_id: str,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    machine_id: Optional[str] = None,
    shift_id: Optional[str] = None,
    reason_id: Optional[str] = None,
    planned_production_hours: Optional[float] = None
) -> dict:
    """Full overview analytics pipeline."""

    events, total = await downtime_repository.list_events(
        db,
        plant_id=plant_id,
        machine_id=machine_id,
        shift_id=shift_id,
        reason_id=reason_id,
        start_from=from_date,
        start_to=to_date,
        limit=10000  # large limit for analytics
    )

    machines = await master_repository.list_machines(db, plant_id=plant_id)
    shifts = await master_repository.list_shifts(db, plant_id=plant_id)
    reasons = await master_repository.list_reasons(db, plant_id=plant_id)

    reason_map = {r["id"]: r for r in reasons}

    df = events_to_dataframe(events)
    if not df.empty:
        df = recalculate_durations(df)

    # Planned production time — use configured or fallback
    if planned_production_hours is None:
        if from_date and to_date:
            days = max(1, (to_date - from_date).days)
            planned_production_hours = days * 24  # 24h/day if not configured
        else:
            planned_production_hours = 30 * 24  # default 30 days
    planned_min = planned_production_hours * 60

    total_downtime = calculate_total_downtime(df)
    downtime_rate = calculate_downtime_rate(total_downtime, planned_min)
    availability = calculate_availability(total_downtime, planned_min)
    mttr = calculate_mttr(df)

    # Average rated output for units lost estimate
    avg_rated = sum(m.get("rated_output_per_hour", 0) for m in machines) / max(len(machines), 1)
    est_units_lost = calculate_estimated_units_lost(total_downtime, avg_rated)

    failure_count = len(df)
    operating_min = planned_min - total_downtime
    mtbf = calculate_mtbf(operating_min, failure_count)

    # Pareto by reason
    pareto_raw = calculate_pareto(df)
    pareto = []
    for item in pareto_raw:
        r = reason_map.get(item["reason_id"], {})
        pareto.append({
            "reason_id": item["reason_id"],
            "reason_label": r.get("label", item["reason_id"]),
            "total_minutes": item["total_minutes"],
            "event_count": item["event_count"],
            "share_pct": item["share_pct"],
            "cumulative_pct": item["cumulative_pct"],
        })

    trend = calculate_daily_trend(df)
    machine_ranking = calculate_machine_ranking(df, machines)
    shift_comparison = calculate_shift_comparison(df, shifts)
    data_quality = calculate_data_quality_summary(df)

    return {
        "filters": {
            "plant_id": plant_id,
            "from": str(from_date.date()) if from_date else None,
            "to": str(to_date.date()) if to_date else None,
            "machine_id": machine_id,
            "shift_id": shift_id,
        },
        "calculation_version": CALCULATION_VERSION,
        "kpis": {
            "downtime_minutes": total_downtime,
            "downtime_rate_pct": downtime_rate,
            "availability_pct": availability,
            "event_count": len(df),
            "estimated_units_lost": est_units_lost,
            "mttr_min": mttr,
            "mtbf_min": mtbf,
        },
        "trend": trend,
        "top_reasons": pareto[:10],
        "machine_ranking": machine_ranking,
        "shift_comparison": shift_comparison,
        "data_quality": data_quality,
    }


async def get_machine_analytics(
    db: AsyncIOMotorDatabase,
    machine_id: str,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None
) -> dict:
    """Machine-level analytics."""
    from bson import ObjectId

    # Get machine info
    machine_doc = await db.machines.find_one({"_id": ObjectId(machine_id)})
    machine_data = {}
    if machine_doc:
        machine_data["id"] = str(machine_doc.pop("_id"))
        machine_data.update(machine_doc)

    events, _ = await downtime_repository.list_events(
        db,
        machine_id=machine_id,
        start_from=from_date,
        start_to=to_date,
        limit=5000
    )

    reasons_all = await db.reasons.find({}).to_list(length=500)
    reason_map = {}
    for r in reasons_all:
        reason_map[str(r.get("_id", ""))] = r

    df = events_to_dataframe(events)
    if not df.empty:
        df = recalculate_durations(df)

    total_downtime = calculate_total_downtime(df)
    pareto_raw = calculate_pareto(df)
    pareto = []
    for item in pareto_raw:
        reason_obj = reason_map.get(item["reason_id"], {})
        pareto.append({
            "reason_id": item["reason_id"],
            "reason_label": reason_obj.get("label", item["reason_id"]),
            "total_minutes": item["total_minutes"],
            "event_count": item["event_count"],
            "share_pct": item["share_pct"],
            "cumulative_pct": item["cumulative_pct"],
        })

    # Determine planned time for availability calculation
    if from_date and to_date:
        days = max(1, (to_date - from_date).days)
        planned_min = days * 24 * 60
    else:
        planned_min = 30 * 24 * 60

    rated_output = machine_data.get("rated_output_per_hour", 0)
    est_units = calculate_estimated_units_lost(total_downtime, rated_output)

    return {
        "machine_id": machine_id,
        "machine_name": machine_data.get("name", machine_id),
        "kpis": {
            "downtime_minutes": total_downtime,
            "downtime_rate_pct": calculate_downtime_rate(total_downtime, planned_min),
            "availability_pct": calculate_availability(total_downtime, planned_min),
            "event_count": len(df),
            "estimated_units_lost": est_units,
            "mttr_min": calculate_mttr(df),
            "mtbf_min": calculate_mtbf(planned_min - total_downtime, len(df)),
        },
        "trend": calculate_daily_trend(df),
        "reason_breakdown": pareto,
    }


async def get_shift_analytics(
    db: AsyncIOMotorDatabase,
    plant_id: str,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None
) -> dict:
    """Shift-level analytics."""

    events, _ = await downtime_repository.list_events(
        db,
        plant_id=plant_id,
        start_from=from_date,
        start_to=to_date,
        limit=10000
    )

    shifts = await master_repository.list_shifts(db, plant_id=plant_id)

    df = events_to_dataframe(events)
    if not df.empty:
        df = recalculate_durations(df)

    shift_comparison = calculate_shift_comparison(df, shifts)

    # Heatmap: hour of day vs event count
    heatmap_data = []
    if not df.empty:
        df_copy = df.copy()
        df_copy["hour"] = df_copy["start_at"].dt.hour
        hourly = df_copy.groupby("hour").size().reset_index(name="event_count")
        heatmap_data = hourly.to_dict("records")

    return {
        "shifts": shift_comparison,
        "heatmap": heatmap_data,
    }


async def get_reason_analytics(
    db: AsyncIOMotorDatabase,
    plant_id: str,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None
) -> dict:
    """Reason-based analytics."""

    events, _ = await downtime_repository.list_events(
        db,
        plant_id=plant_id,
        start_from=from_date,
        start_to=to_date,
        limit=10000
    )

    reasons = await master_repository.list_reasons(db, plant_id=plant_id)
    reason_map = {r["id"]: r for r in reasons}

    df = events_to_dataframe(events)
    if not df.empty:
        df = recalculate_durations(df)

    total_downtime = calculate_total_downtime(df)
    pareto_raw = calculate_pareto(df)
    pareto = []
    for item in pareto_raw:
        r = reason_map.get(item["reason_id"], {})
        pareto.append({
            "reason_id": item["reason_id"],
            "reason_label": r.get("label", item["reason_id"]),
            "total_minutes": item["total_minutes"],
            "event_count": item["event_count"],
            "share_pct": item["share_pct"],
            "cumulative_pct": item["cumulative_pct"],
        })

    return {
        "pareto": pareto,
        "total_downtime_minutes": total_downtime,
    }
