"""
Analytics engine unit tests.
Uses known test fixtures to verify exact calculations.
"""
import pytest
from datetime import datetime, timezone
from app.analytics.metrics import (
    events_to_dataframe, recalculate_durations,
    calculate_total_downtime, calculate_downtime_rate,
    calculate_availability, calculate_pareto,
    calculate_daily_trend, calculate_estimated_units_lost,
    calculate_mttr, calculate_data_quality_summary,
    calculate_machine_ranking, calculate_shift_comparison,
    remove_overlapping_intervals
)

# --- Test fixture ---
# Machine: 480 planned production minutes (8 hours)
# Two eligible stoppages: 30 min and 18 min
# Total downtime = 48 min
# Downtime rate = 48/480 * 100 = 10%
# Availability = 90%
# Standard output = 120 units/hour → lost = 0.8 hours * 120 = 96 units

SAMPLE_EVENTS = [
    {
        "id": "1",
        "machine_id": "MCH_01",
        "reason_id": "REASON_MECHANICAL",
        "shift_id": "SHIFT_1",
        "start_at": datetime(2026, 11, 18, 6, 0, tzinfo=timezone.utc),
        "end_at": datetime(2026, 11, 18, 6, 30, tzinfo=timezone.utc),
        "duration_min": 30.0,
        "source": "manual",
        "status": "confirmed",
    },
    {
        "id": "2",
        "machine_id": "MCH_01",
        "reason_id": "REASON_ELECTRICAL",
        "shift_id": "SHIFT_1",
        "start_at": datetime(2026, 11, 18, 8, 0, tzinfo=timezone.utc),
        "end_at": datetime(2026, 11, 18, 8, 18, tzinfo=timezone.utc),
        "duration_min": 18.0,
        "source": "csv_import",
        "status": "confirmed",
    },
]

PLANNED_PRODUCTION_MIN = 480  # 8 hours = 480 minutes


class TestDataFrameConversion:
    """Test dataframe conversion from events."""

    def test_events_to_dataframe_basic(self):
        """Test basic dataframe creation from events."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        assert len(df) == 2
        assert list(df.columns).count("start_at") == 1
        assert df["duration_min"].iloc[0] == 30.0

    def test_events_to_dataframe_empty(self):
        """Test dataframe creation from empty events."""
        df = events_to_dataframe([])
        assert len(df) == 0
        assert "id" in df.columns
        assert "machine_id" in df.columns

    def test_recalculate_durations(self):
        """Test duration recalculation from timestamps."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        df = recalculate_durations(df)
        # First event: 6:00 to 6:30 = 30 minutes
        assert df["duration_min"].iloc[0] == 30.0
        # Second event: 8:00 to 8:18 = 18 minutes
        assert df["duration_min"].iloc[1] == 18.0


class TestBasicMetrics:
    """Test fundamental metric calculations."""

    def test_total_downtime(self):
        """Test total downtime calculation."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        df = recalculate_durations(df)
        result = calculate_total_downtime(df)
        assert result == 48.0  # 30 + 18

    def test_downtime_rate(self):
        """Test downtime rate calculation."""
        result = calculate_downtime_rate(48.0, PLANNED_PRODUCTION_MIN)
        assert result == 10.0  # 48/480 * 100 = 10%

    def test_downtime_rate_zero_planned(self):
        """Test downtime rate with zero planned time."""
        result = calculate_downtime_rate(100.0, 0)
        assert result == 0.0

    def test_availability(self):
        """Test availability calculation."""
        result = calculate_availability(48.0, PLANNED_PRODUCTION_MIN)
        assert result == 90.0  # (480-48)/480 * 100 = 90%

    def test_availability_zero_planned(self):
        """Test availability with zero planned time."""
        result = calculate_availability(100.0, 0)
        assert result == 0.0

    def test_availability_full_downtime(self):
        """Test availability when downtime equals planned time."""
        result = calculate_availability(480.0, 480.0)
        assert result == 0.0

    def test_availability_no_downtime(self):
        """Test availability with no downtime."""
        result = calculate_availability(0.0, 480.0)
        assert result == 100.0


class TestEstimatedUnitsLost:
    """Test estimated units lost calculation."""

    def test_estimated_units_lost(self):
        """Test units lost calculation."""
        # 48 min downtime, 120 units/hour → 0.8 hours * 120 = 96
        result = calculate_estimated_units_lost(48.0, 120.0)
        assert result == 96.0

    def test_estimated_units_lost_zero_rate(self):
        """Test units lost with zero rated output."""
        result = calculate_estimated_units_lost(48.0, 0.0)
        assert result == 0.0

    def test_estimated_units_lost_zero_downtime(self):
        """Test units lost with zero downtime."""
        result = calculate_estimated_units_lost(0.0, 120.0)
        assert result == 0.0

    def test_estimated_units_lost_fractional(self):
        """Test units lost with fractional rates."""
        # 60 min, 100 units/hour = 100 units
        result = calculate_estimated_units_lost(60.0, 100.0)
        assert result == 100.0


class TestParetoAnalysis:
    """Test Pareto analysis calculations."""

    def test_pareto_basic(self):
        """Test basic Pareto analysis."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        result = calculate_pareto(df)
        assert len(result) == 2
        # Mechanical (30 min) is top
        assert result[0]["reason_id"] == "REASON_MECHANICAL"
        assert result[0]["total_minutes"] == 30.0
        # Check shares add to 100
        assert abs(result[0]["share_pct"] + result[1]["share_pct"] - 100.0) < 0.1

    def test_pareto_shares_and_cumulative(self):
        """Test share and cumulative percentages."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        result = calculate_pareto(df)
        # Mechanical: 30/48 = 62.5%
        assert result[0]["share_pct"] == pytest.approx(62.5, abs=0.1)
        # Electrical: 18/48 = 37.5%
        assert result[1]["share_pct"] == pytest.approx(37.5, abs=0.1)
        # Cumulative should reach 100
        assert result[-1]["cumulative_pct"] == pytest.approx(100.0, abs=0.1)

    def test_pareto_empty_dataframe(self):
        """Test Pareto with empty dataframe."""
        df = events_to_dataframe([])
        result = calculate_pareto(df)
        assert result == []

    def test_pareto_single_reason(self):
        """Test Pareto with single reason."""
        df = events_to_dataframe([SAMPLE_EVENTS[0]])
        result = calculate_pareto(df)
        assert len(result) == 1
        assert result[0]["share_pct"] == 100.0
        assert result[0]["cumulative_pct"] == 100.0


class TestTrendAnalysis:
    """Test daily trend calculations."""

    def test_daily_trend(self):
        """Test daily trend aggregation."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        result = calculate_daily_trend(df)
        assert len(result) == 1
        assert result[0]["date"] == "2026-11-18"
        assert result[0]["downtime_minutes"] == pytest.approx(48.0, abs=0.1)
        assert result[0]["event_count"] == 2

    def test_daily_trend_empty(self):
        """Test daily trend with empty dataframe."""
        df = events_to_dataframe([])
        result = calculate_daily_trend(df)
        assert result == []

    def test_daily_trend_multiple_days(self):
        """Test daily trend across multiple days."""
        multi_day_events = [
            {
                "id": "1",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": datetime(2026, 11, 18, 6, 0, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 18, 6, 30, tzinfo=timezone.utc),
                "duration_min": 30.0,
                "source": "manual",
                "status": "confirmed",
            },
            {
                "id": "2",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": datetime(2026, 11, 19, 8, 0, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 19, 8, 18, tzinfo=timezone.utc),
                "duration_min": 18.0,
                "source": "manual",
                "status": "confirmed",
            },
        ]
        df = events_to_dataframe(multi_day_events)
        result = calculate_daily_trend(df)
        assert len(result) == 2
        assert result[0]["date"] in ["2026-11-18", "2026-11-19"]
        assert result[1]["date"] in ["2026-11-18", "2026-11-19"]


class TestMachineRanking:
    """Test machine ranking calculations."""

    def test_machine_ranking_basic(self):
        """Test basic machine ranking."""
        machines = [
            {"id": "MCH_01", "name": "Machine A", "code": "MA", "rated_output_per_hour": 100.0}
        ]
        df = events_to_dataframe(SAMPLE_EVENTS)
        result = calculate_machine_ranking(df, machines)
        assert len(result) == 1
        assert result[0]["machine_id"] == "MCH_01"
        assert result[0]["machine_name"] == "Machine A"
        assert result[0]["machine_code"] == "MA"
        assert result[0]["total_minutes"] == 48.0
        assert result[0]["event_count"] == 2
        assert result[0]["estimated_units_lost"] == 80.0  # 48/60 * 100

    def test_machine_ranking_multiple(self):
        """Test machine ranking with multiple machines."""
        machines = [
            {"id": "MCH_01", "name": "Machine A", "code": "MA", "rated_output_per_hour": 100.0},
            {"id": "MCH_02", "name": "Machine B", "code": "MB", "rated_output_per_hour": 150.0}
        ]
        events = SAMPLE_EVENTS + [
            {
                "id": "3",
                "machine_id": "MCH_02",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": datetime(2026, 11, 18, 10, 0, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 18, 10, 20, tzinfo=timezone.utc),
                "duration_min": 20.0,
                "source": "manual",
                "status": "confirmed",
            }
        ]
        df = events_to_dataframe(events)
        result = calculate_machine_ranking(df, machines)
        assert len(result) == 2
        # MCH_01 has more downtime (48 > 20), so it should be first
        assert result[0]["machine_id"] == "MCH_01"
        assert result[1]["machine_id"] == "MCH_02"

    def test_machine_ranking_empty(self):
        """Test machine ranking with no events."""
        machines = [{"id": "MCH_01", "name": "Machine A", "code": "MA", "rated_output_per_hour": 100.0}]
        df = events_to_dataframe([])
        result = calculate_machine_ranking(df, machines)
        assert result == []


class TestShiftComparison:
    """Test shift comparison calculations."""

    def test_shift_comparison_basic(self):
        """Test basic shift comparison."""
        shifts = [{"id": "SHIFT_1", "name": "Morning Shift"}]
        df = events_to_dataframe(SAMPLE_EVENTS)
        result = calculate_shift_comparison(df, shifts)
        assert len(result) == 1
        assert result[0]["shift_id"] == "SHIFT_1"
        assert result[0]["shift_name"] == "Morning Shift"
        assert result[0]["total_minutes"] == 48.0
        assert result[0]["event_count"] == 2

    def test_shift_comparison_sorted(self):
        """Test that shift comparison is sorted by downtime."""
        shifts = [
            {"id": "SHIFT_1", "name": "Morning"},
            {"id": "SHIFT_2", "name": "Evening"}
        ]
        events = SAMPLE_EVENTS + [
            {
                "id": "3",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_2",
                "start_at": datetime(2026, 11, 18, 14, 0, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 18, 14, 60, tzinfo=timezone.utc),
                "duration_min": 60.0,
                "source": "manual",
                "status": "confirmed",
            }
        ]
        df = events_to_dataframe(events)
        result = calculate_shift_comparison(df, shifts)
        assert len(result) == 2
        # SHIFT_2 has more downtime (60 > 48), so it should be first
        assert result[0]["shift_id"] == "SHIFT_2"
        assert result[1]["shift_id"] == "SHIFT_1"

    def test_shift_comparison_empty(self):
        """Test shift comparison with no events."""
        shifts = [{"id": "SHIFT_1", "name": "Morning Shift"}]
        df = events_to_dataframe([])
        result = calculate_shift_comparison(df, shifts)
        assert result == []


class TestMTTR:
    """Test Mean Time To Repair calculations."""

    def test_mttr_basic(self):
        """Test basic MTTR calculation."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        result = calculate_mttr(df)
        # MTTR = (30 + 18) / 2 = 24
        assert result == 24.0

    def test_mttr_single_event(self):
        """Test MTTR with single event."""
        df = events_to_dataframe([SAMPLE_EVENTS[0]])
        result = calculate_mttr(df)
        assert result == 30.0

    def test_mttr_empty(self):
        """Test MTTR with no events."""
        df = events_to_dataframe([])
        result = calculate_mttr(df)
        assert result is None


class TestDataQualitySummary:
    """Test data quality assessment."""

    def test_data_quality_good_data(self):
        """Test data quality with valid data."""
        df = events_to_dataframe(SAMPLE_EVENTS)
        result = calculate_data_quality_summary(df)
        assert result["total"] == 2
        assert result["missing_reason_count"] == 0
        assert result["missing_reason_pct"] == 0.0
        assert result["invalid_timestamps"] == 0

    def test_data_quality_missing_reason(self):
        """Test data quality with missing reasons."""
        events = SAMPLE_EVENTS.copy()
        events[0] = events[0].copy()
        events[0]["reason_id"] = None
        df = events_to_dataframe(events)
        result = calculate_data_quality_summary(df)
        assert result["missing_reason_count"] == 1
        assert result["missing_reason_pct"] == 50.0

    def test_data_quality_empty(self):
        """Test data quality with no events."""
        df = events_to_dataframe([])
        result = calculate_data_quality_summary(df)
        assert result["total"] == 0
        assert result["missing_reason_pct"] == 0

    def test_data_quality_invalid_timestamps(self):
        """Test data quality with invalid timestamps."""
        events = [
            {
                "id": "1",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": None,
                "end_at": None,
                "duration_min": 30.0,
                "source": "manual",
                "status": "confirmed",
            }
        ]
        df = events_to_dataframe(events)
        result = calculate_data_quality_summary(df)
        assert result["invalid_timestamps"] == 2  # start_at and end_at


class TestOverlappingIntervals:
    """Test overlap removal logic."""

    def test_remove_overlapping_intervals_no_overlap(self):
        """Test that non-overlapping intervals are preserved."""
        events = [
            {
                "id": "1",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": datetime(2026, 11, 18, 6, 0, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 18, 6, 30, tzinfo=timezone.utc),
                "duration_min": 30.0,
                "source": "manual",
                "status": "confirmed",
            },
            {
                "id": "2",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": datetime(2026, 11, 18, 8, 0, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 18, 8, 30, tzinfo=timezone.utc),
                "duration_min": 30.0,
                "source": "manual",
                "status": "confirmed",
            }
        ]
        df = events_to_dataframe(events)
        result = remove_overlapping_intervals(df)
        assert len(result) == 2

    def test_remove_overlapping_intervals_with_overlap(self):
        """Test that overlapping intervals are merged."""
        events = [
            {
                "id": "1",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": datetime(2026, 11, 18, 6, 0, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 18, 6, 30, tzinfo=timezone.utc),
                "duration_min": 30.0,
                "source": "manual",
                "status": "confirmed",
            },
            {
                "id": "2",
                "machine_id": "MCH_01",
                "reason_id": "REASON_1",
                "shift_id": "SHIFT_1",
                "start_at": datetime(2026, 11, 18, 6, 15, tzinfo=timezone.utc),
                "end_at": datetime(2026, 11, 18, 6, 45, tzinfo=timezone.utc),
                "duration_min": 30.0,
                "source": "manual",
                "status": "confirmed",
            }
        ]
        df = events_to_dataframe(events)
        result = remove_overlapping_intervals(df)
        assert len(result) == 1
        # Merged interval should be 6:00 to 6:45 = 45 minutes
        assert result["duration_min"].iloc[0] == pytest.approx(45.0, abs=0.1)

    def test_remove_overlapping_intervals_empty(self):
        """Test overlap removal with empty dataframe."""
        df = events_to_dataframe([])
        result = remove_overlapping_intervals(df)
        assert len(result) == 0
