"""Tests for import parser functionality."""

import pytest
import pandas as pd
from app.analytics.import_parser import (
    auto_map_columns,
    parse_datetime_flexible,
    validate_rows,
    compute_file_checksum
)
from datetime import datetime


def test_auto_map_columns():
    """Test automatic column mapping."""
    cols = [
        "machine",
        "start_at",
        "end",
        "reason_description",
        "remarks"
    ]
    mapping = auto_map_columns(cols)
    assert mapping["machine"] == "machine_code"
    assert mapping["start_at"] == "start_time"
    assert mapping["end"] == "end_time"


def test_parse_datetime_flexible():
    """Test flexible datetime parsing."""
    # ISO format
    result = parse_datetime_flexible("2026-11-18 10:30:00")
    assert isinstance(result, datetime)

    # DD/MM/YYYY format
    result = parse_datetime_flexible("18/11/2026 10:30")
    assert isinstance(result, datetime)

    # Empty string
    assert parse_datetime_flexible("") is None

    # None
    assert parse_datetime_flexible(None) is None


def test_checksum():
    """Test file checksum computation."""
    b = b"test content"
    cs = compute_file_checksum(b)
    assert len(cs) == 32
    # Should be idempotent
    assert compute_file_checksum(b) == cs


def test_validate_rows_empty():
    """Test validation with valid row data."""
    df = pd.DataFrame([{
        "machine_code": "MCH_01",
        "start_time": "2026-11-18 06:00:00",
        "end_time": "2026-11-18 06:30:00",
        "reason_code": "MECHANICAL"
    }])
    results = validate_rows(df, {}, set(), set())
    assert len(results) == 1
    assert results[0]["status"] == "valid"


def test_validate_rows_missing_machine():
    """Test validation with missing machine code."""
    df = pd.DataFrame([{
        "machine_code": "",
        "start_time": "2026-11-18 06:00:00",
        "end_time": "2026-11-18 06:30:00",
        "reason_code": "MECHANICAL"
    }])
    results = validate_rows(df, {}, set(), set())
    assert results[0]["status"] == "error"
    assert any(
        "machine_code is required" in issue
        for issue in results[0]["issues"]
    )
