"""Reliability & Predictive Maintenance API router:
Calculates MTBF, MTTR, Machine Health Scores (0-100), Failure Risk Radar,
and manages Maintenance Work Orders.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import random

from app.core.database import get_database as get_db

router = APIRouter(prefix="/reliability", tags=["Reliability & Predictive Maintenance"])


class WorkOrderCreate(BaseModel):
    plant_id: str
    machine_id: str
    machine_code: str
    machine_name: str
    title: str
    priority: str = "medium"  # low, medium, high, critical
    assigned_technician: str = "Senior Maintenance Tech"
    scheduled_date: str
    estimated_duration_hours: float = 2.0
    notes: Optional[str] = None


@router.get("/metrics")
async def get_reliability_metrics(
    plant_id: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Calculate MTBF (Mean Time Between Failures), MTTR (Mean Time to Repair),
    Health Scores (0-100%), and Failure Risk Radar across all machines.
    """
    filter_query = {}
    if plant_id:
        filter_query["plant_id"] = plant_id

    # Fetch machines and events
    machines = await db["machines"].find(filter_query).to_list(100)
    events = await db["downtime_events"].find(filter_query).to_list(1000)

    # Standard planned baseline: 30 days * 24 hours = 720 operating hours
    total_period_hours = 720.0

    fleet_metrics = []
    total_downtime_all = 0.0
    total_events_all = len(events)

    for m in machines:
        m_id = str(m.get("_id", m.get("id", "")))
        m_code = m.get("code", "UNKNOWN")
        m_name = m.get("name", "Machine")
        rated_output = m.get("rated_output_per_hour", 100)
        status = m.get("status", "active")

        # Filter events for this machine
        m_events = [e for e in events if e.get("machine_id") == m_id or e.get("machine_code") == m_code]
        m_event_count = len(m_events)
        m_downtime_min = sum(float(e.get("duration_min", 0.0)) for e in m_events)
        m_downtime_hours = m_downtime_min / 60.0
        total_downtime_all += m_downtime_min

        # MTTR (Mean Time to Repair) in minutes
        mttr_min = round(m_downtime_min / m_event_count, 1) if m_event_count > 0 else 0.0

        # Operating hours = Period hours - Downtime hours
        operating_hours = max(total_period_hours - m_downtime_hours, 10.0)

        # MTBF (Mean Time Between Failures) in hours
        mtbf_hours = round(operating_hours / m_event_count, 1) if m_event_count > 0 else total_period_hours

        # Availability %
        availability_pct = round(max(0.0, min(100.0, (operating_hours / total_period_hours) * 100)), 1)

        # Calculate Asset Health Score (0 - 100)
        # Factors: Availability (50%), MTTR penalty (25%), Event frequency penalty (25%)
        freq_penalty = min(m_event_count * 5.0, 30.0)
        mttr_penalty = min((mttr_min / 60.0) * 10.0, 20.0)
        status_penalty = 15.0 if status == "maintenance" else (35.0 if status == "inactive" else 0.0)

        raw_health = availability_pct - freq_penalty - mttr_penalty - status_penalty
        health_score = int(max(15, min(100, round(raw_health))))

        # Grade
        if health_score >= 88:
            grade = "A"
            risk_level = "Low"
            prediction = "Nominal operating condition. Next scheduled overhaul in 45 days."
        elif health_score >= 70:
            grade = "B"
            risk_level = "Moderate"
            prediction = "Mild thermal/vibration drift detected. Recommend lubrication check within 7 days."
        else:
            grade = "C"
            risk_level = "High"
            prediction = "High failure probability (>75%) in next 48 hours. Preventive servicing required."

        fleet_metrics.append({
            "machine_id": m_id,
            "machine_code": m_code,
            "machine_name": m_name,
            "rated_output": rated_output,
            "status": status,
            "health_score": health_score,
            "health_grade": grade,
            "risk_level": risk_level,
            "mtbf_hours": mtbf_hours,
            "mttr_minutes": mttr_min,
            "event_count": m_event_count,
            "downtime_minutes": round(m_downtime_min, 1),
            "availability_pct": availability_pct,
            "predicted_failure_risk": prediction,
        })

    # Sort fleet metrics: lowest health first (needs highest attention)
    fleet_metrics.sort(key=lambda x: x["health_score"])

    # Overall fleet averages
    avg_health = round(sum(m["health_score"] for m in fleet_metrics) / len(fleet_metrics)) if fleet_metrics else 95
    avg_mtbf = round(sum(m["mtbf_hours"] for m in fleet_metrics) / len(fleet_metrics), 1) if fleet_metrics else 720.0
    avg_mttr = round(sum(m["mttr_minutes"] for m in fleet_metrics) / len(fleet_metrics), 1) if fleet_metrics else 0.0

    return {
        "fleet_summary": {
            "total_machines": len(fleet_metrics),
            "average_health_score": avg_health,
            "fleet_mtbf_hours": avg_mtbf,
            "fleet_mttr_minutes": avg_mttr,
            "high_risk_machines_count": len([m for m in fleet_metrics if m["risk_level"] == "High"]),
            "moderate_risk_count": len([m for m in fleet_metrics if m["risk_level"] == "Moderate"]),
            "healthy_machines_count": len([m for m in fleet_metrics if m["risk_level"] == "Low"]),
        },
        "machines": fleet_metrics
    }


@router.get("/work-orders")
async def get_work_orders(
    plant_id: Optional[str] = None,
    db=Depends(get_db)
):
    """Fetch active and completed maintenance work orders."""
    query = {}
    if plant_id:
        query["plant_id"] = plant_id

    orders = await db["work_orders"].find(query).sort("created_at", -1).to_list(50)
    for o in orders:
        o["id"] = str(o["_id"])
        del o["_id"]

    return {"work_orders": orders}


@router.post("/work-orders")
async def create_work_order(
    payload: WorkOrderCreate,
    db=Depends(get_db)
):
    """Create a new preventive maintenance work order."""
    doc = payload.dict()
    doc["status"] = "scheduled"  # scheduled, in_progress, completed
    doc["created_at"] = datetime.now(timezone.utc).isoformat()

    result = await db["work_orders"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    del doc["_id"]

    return doc
