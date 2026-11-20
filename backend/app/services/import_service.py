"""Service layer for import operations."""

from datetime import datetime
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.import_parser import (
    parse_file, auto_map_columns, validate_rows, compute_file_checksum
)
from app.repositories import master_repository, downtime_repository, import_repository
from app.services.downtime_service import calculate_duration_min


async def preview_import(
    db: AsyncIOMotorDatabase,
    file_bytes: bytes,
    filename: str,
    plant_id: str
) -> dict:
    """
    Parse file, validate rows, return preview without committing.

    Args:
        db: MongoDB database instance
        file_bytes: File contents as bytes
        filename: Original filename
        plant_id: Plant ID for validation context

    Returns:
        Dictionary with preview data and batch_id for later commit

    Raises:
        ValueError: If file cannot be parsed
        HTTPException: If validation fails
    """
    try:
        # Compute checksum
        checksum = compute_file_checksum(file_bytes)

        # Get known machines and reasons for validation
        machines = await master_repository.list_machines(db, plant_id=plant_id)
        reasons = await master_repository.list_reasons(db, plant_id=plant_id)
        known_machines = {m["code"] for m in machines}
        known_reasons = {r["code"] for r in reasons}

        # Parse file
        df = parse_file(file_bytes, filename)
        detected_columns = list(df.columns)
        col_map = auto_map_columns(detected_columns)

        # Validate rows
        rows = validate_rows(df, col_map, known_machines, known_reasons)

        # Count by status
        valid = [r for r in rows if r["status"] == "valid"]
        warnings = [r for r in rows if r["status"] == "warning"]
        errors = [r for r in rows if r["status"] == "error"]
        duplicates = [r for r in rows if any("Duplicate" in i for i in r["issues"])]

        # Create batch ID
        batch_id = f"BATCH_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{checksum[:8]}"

        # Store batch metadata and rows in staging
        await import_repository.create_staging_batch(db, {
            "_id": batch_id,
            "plant_id": plant_id,
            "filename": filename,
            "checksum": checksum,
            "col_map": col_map,
            "rows": rows,
            "created_at": datetime.utcnow(),
        })

        return {
            "batch_id": batch_id,
            "total_rows": len(rows),
            "valid_count": len(valid),
            "warning_count": len(warnings),
            "error_count": len(errors),
            "duplicate_candidates": len(duplicates),
            "column_mapping": col_map,
            "preview_rows": rows[:20],  # first 20 rows
            "detected_columns": detected_columns,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import preview failed: {str(e)}")


async def commit_import(
    db: AsyncIOMotorDatabase,
    batch_id: str,
    plant_id: str,
    user_id: str,
    skip_duplicates: bool = True
) -> dict:
    """
    Commit validated rows to downtime_events collection.

    Args:
        db: MongoDB database instance
        batch_id: Staging batch ID
        plant_id: Plant ID
        user_id: User performing the import
        skip_duplicates: Whether to skip duplicate rows

    Returns:
        Dictionary with commit results

    Raises:
        HTTPException: If batch not found or commit fails
    """
    # Get staging batch
    staging = await import_repository.get_staging_batch(db, batch_id)
    if not staging:
        raise HTTPException(status_code=404, detail="Import batch not found. Please re-upload.")

    # Get machine, reason, and shift ID maps
    machines = await master_repository.list_machines(db, plant_id=plant_id)
    reasons = await master_repository.list_reasons(db, plant_id=plant_id)
    shifts = await master_repository.list_shifts(db, plant_id=plant_id)
    lines = await master_repository.list_lines(db, plant_id=plant_id)
    default_line_id = lines[0]["id"] if lines else ""

    machine_map = {m["code"]: m["id"] for m in machines}
    reason_map = {r["code"]: r["id"] for r in reasons}

    rows = staging.get("rows", [])
    accepted = 0
    rejected = 0
    skipped = 0
    errors_list = []

    for row in rows:
        # Skip error rows
        if row["status"] == "error":
            rejected += 1
            errors_list.append({
                "row": row["row_number"],
                "issues": row["issues"]
            })
            continue

        # Skip duplicates if requested
        if skip_duplicates and any("Duplicate" in i for i in row["issues"]):
            skipped += 1
            continue

        # Extract parsed data
        parsed = row["parsed"]
        machine_code = parsed.get("machine_code")
        machine_id = machine_map.get(machine_code)
        reason_code = parsed.get("reason_code")
        reason_id = reason_map.get(reason_code)
        start_at = parsed.get("start_at")
        end_at = parsed.get("end_at")

        # Auto-create machine if not already registered
        if not machine_id and machine_code:
            try:
                new_mach = {
                    "plant_id": plant_id,
                    "line_id": default_line_id,
                    "code": str(machine_code).strip().upper(),
                    "name": f"Machine {machine_code}",
                    "rated_output_per_hour": 100,
                    "status": "active",
                    "created_at": datetime.utcnow(),
                }
                new_id = await master_repository.create_machine(db, new_mach)
                machine_id = new_id
                machine_map[machine_code] = new_id
                machines.append({**new_mach, "id": new_id})
            except Exception:
                pass

        # Validate required fields
        if not machine_id or not start_at or not end_at:
            rejected += 1
            continue

        # Get machine details for line_id
        machine = next((m for m in machines if m["id"] == machine_id), None)
        line_id = machine.get("line_id", "") if machine else default_line_id

        # Calculate duration
        duration_min = calculate_duration_min(start_at, end_at)

        # Match or fallback reason
        if not reason_id and reasons:
            for r in reasons:
                if (
                    r.get("code", "").upper() == str(reason_code).upper()
                    or r.get("label", "").lower() == str(reason_code).lower()
                ):
                    reason_id = r["id"]
                    break
            if not reason_id:
                reason_id = reasons[0]["id"]

        # Automatically determine Shift by start_at time
        assigned_shift_id = ""
        if isinstance(start_at, datetime):
            event_time_str = start_at.strftime("%H:%M")
            for s in shifts:
                s_start = s.get("start_local", "06:00")
                s_end = s.get("end_local", "14:00")
                if s_start < s_end:
                    if s_start <= event_time_str < s_end:
                        assigned_shift_id = s["id"]
                        break
                else:  # Overnight shift (e.g. 22:00 - 06:00)
                    if event_time_str >= s_start or event_time_str < s_end:
                        assigned_shift_id = s["id"]
                        break
        if not assigned_shift_id and shifts:
            assigned_shift_id = shifts[0]["id"]

        # Create document
        doc = {
            "plant_id": plant_id,
            "machine_id": machine_id,
            "line_id": line_id,
            "start_at": start_at,
            "end_at": end_at,
            "duration_min": duration_min,
            "reason_id": reason_id or "UNCLASSIFIED",
            "shift_id": assigned_shift_id,
            "source": "csv_import",
            "batch_id": batch_id,
            "source_row": row["row_number"],
            "notes": parsed.get("notes"),
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "status": "confirmed",
        }

        # Insert into downtime_events
        try:
            await downtime_repository.create_event(db, doc)
            accepted += 1
        except Exception as e:
            rejected += 1
            errors_list.append({
                "row": row["row_number"],
                "error": str(e)
            })

    # Store import batch record
    batch_doc = {
        "_id": batch_id,
        "plant_id": plant_id,
        "file_name": staging.get("filename"),
        "checksum": staging.get("checksum"),
        "uploaded_by": user_id,
        "status": "completed",
        "total_rows": len(rows),
        "accepted": accepted,
        "rejected": rejected,
        "skipped": skipped,
        "errors": errors_list[:50],
        "created_at": datetime.utcnow(),
    }

    try:
        await db.import_batches.insert_one(batch_doc)
    except Exception:
        pass

    import_repository.record_batch_completed(batch_doc)

    # Clean up staging
    await import_repository.delete_staging_batch(db, batch_id)

    return {
        "batch_id": batch_id,
        "accepted": accepted,
        "rejected": rejected,
        "skipped": skipped,
        "total": len(rows),
        "status": "completed"
    }
