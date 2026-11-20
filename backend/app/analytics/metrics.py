"""
Core downtime analytics metrics.
All functions accept a list of event dicts and configuration, return typed results.
Calculation version: 1.0.0
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional

CALCULATION_VERSION = "1.0.0"


def events_to_dataframe(events: list[dict]) -> pd.DataFrame:
    """Convert event dicts to a clean DataFrame with proper types."""
    if not events:
        return pd.DataFrame(columns=["id", "machine_id", "reason_id", "shift_id",
                                      "start_at", "end_at", "duration_min", "source", "status"])
    df = pd.DataFrame(events)
    df["start_at"] = pd.to_datetime(df["start_at"], utc=True, errors="coerce")
    df["end_at"] = pd.to_datetime(df["end_at"], utc=True, errors="coerce")
    df["duration_min"] = pd.to_numeric(df["duration_min"], errors="coerce").fillna(0)
    return df


def recalculate_durations(df: pd.DataFrame) -> pd.DataFrame:
    """Recalculate durations from source timestamps (more reliable than stored duration)."""
    mask = df["start_at"].notna() & df["end_at"].notna()
    df.loc[mask, "duration_min"] = (
        (df.loc[mask, "end_at"] - df.loc[mask, "start_at"]).dt.total_seconds() / 60
    ).round(2)
    return df


def remove_overlapping_intervals(df: pd.DataFrame) -> pd.DataFrame:
    """
    Per machine: merge overlapping intervals to avoid double-counting.
    Returns cleaned DataFrame with merged events.
    """
    if df.empty:
        return df

    result_rows = []
    for machine_id, group in df.groupby("machine_id"):
        group = group.sort_values("start_at").reset_index(drop=True)
        merged_start = group["start_at"].iloc[0]
        merged_end = group["end_at"].iloc[0]

        for _, row in group.iloc[1:].iterrows():
            if row["start_at"] <= merged_end:
                merged_end = max(merged_end, row["end_at"])
            else:
                result_rows.append({
                    "machine_id": machine_id,
                    "start_at": merged_start,
                    "end_at": merged_end,
                    "duration_min": (merged_end - merged_start).total_seconds() / 60,
                })
                merged_start = row["start_at"]
                merged_end = row["end_at"]

        result_rows.append({
            "machine_id": machine_id,
            "start_at": merged_start,
            "end_at": merged_end,
            "duration_min": (merged_end - merged_start).total_seconds() / 60,
        })

    if not result_rows:
        return pd.DataFrame()
    return pd.DataFrame(result_rows)


def calculate_total_downtime(df: pd.DataFrame) -> float:
    """Total downtime minutes from eligible events."""
    return round(float(df["duration_min"].sum()), 2)


def calculate_downtime_rate(total_downtime_min: float, planned_production_min: float) -> float:
    """
    Downtime Rate = (downtime_minutes / planned_production_minutes) * 100
    Returns percentage rounded to 2 decimal places.
    """
    if planned_production_min <= 0:
        return 0.0
    return round((total_downtime_min / planned_production_min) * 100, 2)


def calculate_availability(total_downtime_min: float, planned_production_min: float) -> float:
    """
    Availability = ((planned_time - downtime) / planned_time) * 100
    Returns percentage.
    """
    if planned_production_min <= 0:
        return 0.0
    operating_time = planned_production_min - total_downtime_min
    return round((operating_time / planned_production_min) * 100, 2)


def calculate_mttr(df: pd.DataFrame, repair_categories: set = None) -> Optional[float]:
    """
    MTTR = Total repair downtime / Number of repair events
    Only uses events classified as repair/failure (not all stoppages).
    """
    if repair_categories:
        repair_df = df[df.get("category", pd.Series(dtype=str)).isin(repair_categories)]
    else:
        repair_df = df  # use all if no classification available

    if repair_df.empty or len(repair_df) == 0:
        return None

    return round(float(repair_df["duration_min"].mean()), 2)


def calculate_mtbf(operating_time_min: float, failure_count: int) -> Optional[float]:
    """
    MTBF = Operating time / Number of failures
    Returns minutes between failures, or None if no failures.
    """
    if failure_count <= 0 or operating_time_min <= 0:
        return None
    return round(operating_time_min / failure_count, 2)


def calculate_estimated_units_lost(downtime_min: float, rated_output_per_hour: float) -> float:
    """
    Estimated units lost = (downtime_hours) * rated_output_per_hour
    This is an ESTIMATE — labeled as such in all outputs.
    """
    downtime_hours = downtime_min / 60
    return round(downtime_hours * rated_output_per_hour, 2)


def calculate_pareto(df: pd.DataFrame, group_col: str = "reason_id") -> list[dict]:
    """
    Pareto analysis: group by reason, sort desc by total minutes,
    calculate share% and cumulative share%.
    """
    if df.empty:
        return []

    grouped = (
        df.groupby(group_col)["duration_min"]
        .agg(["sum", "count"])
        .reset_index()
    )
    grouped.columns = [group_col, "total_minutes", "event_count"]
    grouped = grouped.sort_values("total_minutes", ascending=False).reset_index(drop=True)

    total = grouped["total_minutes"].sum()
    if total <= 0:
        return []

    grouped["share_pct"] = (grouped["total_minutes"] / total * 100).round(2)
    grouped["cumulative_pct"] = grouped["share_pct"].cumsum().round(2).clip(upper=100.0)
    if not grouped.empty:
        grouped.loc[grouped.index[-1], "cumulative_pct"] = 100.0

    return grouped.to_dict("records")


def calculate_daily_trend(df: pd.DataFrame) -> list[dict]:
    """Daily aggregation: total downtime minutes and event count per day."""
    if df.empty:
        return []

    df = df.copy()
    df["date"] = df["start_at"].dt.date
    daily = (
        df.groupby("date")
        .agg(downtime_minutes=("duration_min", "sum"), event_count=("duration_min", "count"))
        .reset_index()
    )
    daily["date"] = daily["date"].astype(str)
    return daily.to_dict("records")


def calculate_machine_ranking(df: pd.DataFrame, machines: list[dict]) -> list[dict]:
    """
    Per-machine: total downtime minutes, event count, downtime rate.
    machines: list of machine dicts with id, name, code, rated_output_per_hour.
    """
    if df.empty:
        return []

    machine_map = {m["id"]: m for m in machines}

    ranked = (
        df.groupby("machine_id")
        .agg(total_minutes=("duration_min", "sum"), event_count=("duration_min", "count"))
        .reset_index()
    )
    ranked = ranked.sort_values("total_minutes", ascending=False).reset_index(drop=True)

    result = []
    for _, row in ranked.iterrows():
        machine = machine_map.get(row["machine_id"], {})
        rated = machine.get("rated_output_per_hour", 0)
        est_units = calculate_estimated_units_lost(row["total_minutes"], rated)
        result.append({
            "machine_id": row["machine_id"],
            "machine_name": machine.get("name", row["machine_id"]),
            "machine_code": machine.get("code", ""),
            "total_minutes": round(float(row["total_minutes"]), 2),
            "event_count": int(row["event_count"]),
            "estimated_units_lost": est_units,
        })

    return result


def calculate_shift_comparison(df: pd.DataFrame, shifts: list[dict]) -> list[dict]:
    """Per-shift: total downtime minutes and event count."""
    if df.empty:
        return []

    shift_map = {s["id"]: s for s in shifts}

    grouped = (
        df.groupby("shift_id")
        .agg(total_minutes=("duration_min", "sum"), event_count=("duration_min", "count"))
        .reset_index()
    )

    result = []
    for _, row in grouped.iterrows():
        shift = shift_map.get(row["shift_id"], {})
        result.append({
            "shift_id": row["shift_id"],
            "shift_name": shift.get("name", row["shift_id"]),
            "total_minutes": round(float(row["total_minutes"]), 2),
            "event_count": int(row["event_count"]),
        })
    return sorted(result, key=lambda x: x["total_minutes"], reverse=True)


def calculate_data_quality_summary(df: pd.DataFrame) -> dict:
    """
    Data quality indicators:
    - missing reason %
    - invalid timestamps count
    - overlap candidates count
    - total events
    """
    total = len(df)
    if total == 0:
        return {"total": 0, "missing_reason_pct": 0, "invalid_timestamps": 0, "overlapping_events": 0}

    missing_reason = df["reason_id"].isna().sum() + (df["reason_id"] == "").sum()
    invalid_ts = df["start_at"].isna().sum() + df["end_at"].isna().sum()
    negative_duration = (df["duration_min"] <= 0).sum()

    return {
        "total": total,
        "missing_reason_count": int(missing_reason),
        "missing_reason_pct": round(missing_reason / total * 100, 1),
        "invalid_timestamps": int(invalid_ts),
        "negative_duration_events": int(negative_duration),
    }
