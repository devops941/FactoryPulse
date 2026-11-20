"""CSV/XLSX import parser using Pandas."""

import pandas as pd
import hashlib
import io
from datetime import datetime
from typing import BinaryIO

REQUIRED_COLUMNS = ["machine_code", "start_time", "end_time", "reason_code"]
OPTIONAL_COLUMNS = ["plant_code", "line_code", "shift_code", "notes", "operator"]

STANDARD_COLUMN_MAP = {
    # common CSV column name variations → standard name
    "machine": "machine_code",
    "machine_id": "machine_code",
    "machine_name": "machine_code",
    "start": "start_time",
    "start_at": "start_time",
    "begin": "start_time",
    "end": "end_time",
    "end_at": "end_time",
    "stop": "end_time",
    "reason": "reason_code",
    "reason_description": "reason_code",
    "failure_reason": "reason_code",
    "downtime_reason": "reason_code",
    "line": "line_code",
    "production_line": "line_code",
    "plant": "plant_code",
    "shift": "shift_code",
    "shift_name": "shift_code",
    "comment": "notes",
    "remarks": "notes",
}


def auto_map_columns(detected_cols: list[str]) -> dict[str, str]:
    """
    Auto-map detected CSV columns to standard names.

    Args:
        detected_cols: List of column names from CSV

    Returns:
        Dictionary mapping original column names to standard names
    """
    mapping = {}
    for col in detected_cols:
        normalized = col.strip().lower().replace(" ", "_")
        if normalized in STANDARD_COLUMN_MAP:
            mapping[col] = STANDARD_COLUMN_MAP[normalized]
        elif normalized in REQUIRED_COLUMNS + OPTIONAL_COLUMNS:
            mapping[col] = normalized
    return mapping


def parse_datetime_flexible(val) -> datetime | None:
    """
    Try to parse a datetime from various formats.

    Args:
        val: Value to parse

    Returns:
        Parsed datetime or None
    """
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val

    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%m/%d/%Y %H:%M",
        "%Y-%m-%d %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(str(val).strip(), fmt)
        except (ValueError, AttributeError):
            continue

    return None


def compute_file_checksum(file_bytes: bytes) -> str:
    """
    Compute MD5 checksum of file bytes.

    Args:
        file_bytes: File contents as bytes

    Returns:
        Hex string of MD5 checksum
    """
    return hashlib.md5(file_bytes).hexdigest()


def parse_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Parse CSV or XLSX bytes to DataFrame.

    Args:
        file_bytes: File contents as bytes
        filename: Original filename to determine format

    Returns:
        Parsed DataFrame

    Raises:
        ValueError: If file format is not supported
    """
    if filename.endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    elif filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    else:
        raise ValueError("Unsupported file format. Use CSV or XLSX.")


def validate_rows(df: pd.DataFrame, col_map: dict, known_machines: set, known_reasons: set) -> list[dict]:
    """
    Validate each row and return list of annotated row dicts.

    Args:
        df: Pandas DataFrame
        col_map: Column name mapping
        known_machines: Set of valid machine codes
        known_reasons: Set of valid reason codes

    Returns:
        List of validated row dictionaries with status and issues
    """
    results = []
    seen_fingerprints = set()

    # Rename using col_map
    df = df.rename(columns=col_map)

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed, header is row 1
        issues = []
        status = "valid"

        machine_code = str(row.get("machine_code", "")).strip()
        start_str = row.get("start_time", "")
        end_str = row.get("end_time", "")
        reason_code = str(row.get("reason_code", "")).strip()

        # Required field checks
        if not machine_code:
            issues.append("machine_code is required")
            status = "error"
        elif known_machines and machine_code not in known_machines:
            issues.append(f"Unknown machine_code: {machine_code}")
            status = "warning"

        if not start_str:
            issues.append("start_time is required")
            status = "error"

        if not end_str:
            issues.append("end_time is required")
            status = "error"

        if not reason_code:
            issues.append("reason_code is required")
            status = "warning"  # warning, not error
        elif known_reasons and reason_code not in known_reasons:
            issues.append(f"Unknown reason_code: {reason_code}")
            status = "warning"

        start_dt = parse_datetime_flexible(start_str) if start_str else None
        end_dt = parse_datetime_flexible(end_str) if end_str else None

        if start_str and start_dt is None:
            issues.append(f"Cannot parse start_time: {start_str}")
            status = "error"

        if end_str and end_dt is None:
            issues.append(f"Cannot parse end_time: {end_str}")
            status = "error"

        if start_dt and end_dt:
            if end_dt <= start_dt:
                issues.append("end_time must be after start_time")
                status = "error"

        # Duplicate detection (within this file)
        fingerprint = f"{machine_code}|{start_str}|{end_str}|{reason_code}"
        if fingerprint in seen_fingerprints:
            issues.append("Duplicate row detected within file")
            status = "warning" if status == "valid" else status
        seen_fingerprints.add(fingerprint)

        results.append({
            "row_number": row_num,
            "data": row.to_dict(),
            "status": status,
            "issues": issues,
            "parsed": {
                "machine_code": machine_code,
                "start_at": start_dt,
                "end_at": end_dt,
                "reason_code": reason_code,
                "notes": str(row.get("notes", "")).strip() or None,
            }
        })

    return results
