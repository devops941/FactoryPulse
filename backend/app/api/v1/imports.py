"""API endpoints for import operations."""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse
import io

from app.schemas.imports import (
    ImportPreviewResponse,
    ImportCommitRequest,
    ImportCommitResponse,
    ImportBatchResponse,
    ImportPreviewRow,
)
from app.services.import_service import preview_import, commit_import
from app.repositories import import_repository
from app.core.database import get_database as get_db
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/imports", tags=["Imports"])


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_file_upload(
    file: UploadFile = File(...),
    plant_id: str = Form(...),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Upload and preview import file without committing.

    Args:
        file: CSV or XLSX file to preview
        plant_id: Plant ID for validation context
        db: Database instance
        current_user: Current authenticated user

    Returns:
        ImportPreviewResponse with batch_id and preview data
    """
    file_bytes = await file.read()

    result = await preview_import(db, file_bytes, file.filename or "upload.csv", plant_id)

    # Convert parsed datetime objects to ISO strings for JSON serialization
    preview_rows = []
    for row in result.get("preview_rows", []):
        preview_row_dict = {
            "row_number": row["row_number"],
            "data": row["data"],
            "status": row["status"],
            "issues": row["issues"],
        }
        preview_rows.append(preview_row_dict)

    return ImportPreviewResponse(
        batch_id=result["batch_id"],
        total_rows=result["total_rows"],
        valid_count=result["valid_count"],
        warning_count=result["warning_count"],
        error_count=result["error_count"],
        duplicate_candidates=result["duplicate_candidates"],
        column_mapping=result["column_mapping"],
        preview_rows=[ImportPreviewRow(**r) for r in preview_rows],
        detected_columns=result["detected_columns"],
    )


@router.post("/commit", response_model=ImportCommitResponse)
async def commit_import_batch(
    request: ImportCommitRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Commit a preview batch to the database.

    Args:
        request: ImportCommitRequest with batch_id, plant_id, skip_duplicates
        db: Database instance
        current_user: Current authenticated user

    Returns:
        ImportCommitResponse with results
    """
    result = await commit_import(
        db,
        request.batch_id,
        request.plant_id,
        current_user.get("id") or current_user.get("user_id"),
        skip_duplicates=request.skip_duplicates,
    )

    return ImportCommitResponse(
        batch_id=result["batch_id"],
        accepted=result["accepted"],
        rejected=result["rejected"],
        skipped=result["skipped"],
        total=result["total"],
        status=result["status"],
    )


@router.get("", response_model=list[ImportBatchResponse])
@router.get("/", response_model=list[ImportBatchResponse], include_in_schema=False)
async def list_import_batches(
    plant_id: str = None,
    limit: int = 20,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    List import batches with optional plant filter.

    Args:
        plant_id: Optional plant ID to filter by
        limit: Maximum number of batches to return
        db: Database instance
        current_user: Current authenticated user

    Returns:
        List of ImportBatchResponse
    """
    batches = await import_repository.list_batches(db, plant_id=plant_id, limit=limit)

    return [
        ImportBatchResponse(
            id=batch["id"],
            plant_id=batch["plant_id"],
            file_name=batch["file_name"],
            uploaded_by=batch["uploaded_by"],
            status=batch["status"],
            total_rows=batch["total_rows"],
            accepted=batch["accepted"],
            rejected=batch["rejected"],
            skipped=batch["skipped"],
            errors=batch.get("errors", []),
            created_at=batch["created_at"],
        )
        for batch in batches
    ]


@router.get("/{batch_id}", response_model=ImportBatchResponse)
async def get_import_batch(
    batch_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get a specific import batch by ID.

    Args:
        batch_id: Batch ID
        db: Database instance
        current_user: Current authenticated user

    Returns:
        ImportBatchResponse
    """
    batch = await import_repository.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    return ImportBatchResponse(
        id=batch["id"],
        plant_id=batch["plant_id"],
        file_name=batch["file_name"],
        uploaded_by=batch["uploaded_by"],
        status=batch["status"],
        total_rows=batch["total_rows"],
        accepted=batch["accepted"],
        rejected=batch["rejected"],
        skipped=batch["skipped"],
        errors=batch.get("errors", []),
        created_at=batch["created_at"],
    )


@router.get("/template/download")
async def download_import_template():
    """
    Download CSV template with correct columns and active sample rows matching current plant machinery.

    Returns:
        StreamingResponse with CSV file
    """
    csv_buffer = io.StringIO()

    headers = [
        "machine_code",
        "start_time",
        "end_time",
        "reason_code",
        "notes",
        "operator",
    ]
    csv_buffer.write(",".join(headers) + "\n")

    # Accurate sample rows matching active machinery and taxonomy
    sample_rows = [
        ["MACH_A1", "2026-11-18 07:15:00", "2026-11-18 07:45:00", "TOOL_WEAR", "Carbide insert chipped, replaced cutter", "Ramesh Kumar"],
        ["MACH_A2", "2026-11-18 09:30:00", "2026-11-18 10:15:00", "ELEC_FAULT", "Thermal overload trip on hydraulic motor", "Karthik S"],
        ["MACH_A3", "2026-11-18 11:00:00", "2026-11-18 11:25:00", "OP_ERR", "Fixture alignment sensor recalibrated", "Anand P"],
        ["MACH_A4", "2026-11-18 15:00:00", "2026-11-18 16:30:00", "MECH_FAIL", "Pneumatic cylinder seal blown, replaced", "Suresh V"],
        ["MACH_A1", "2026-11-18 17:45:00", "2026-11-18 18:15:00", "MAT_SHORT", "Steel billet stock depleted from hopper", "Ramesh Kumar"],
        ["MACH_A2", "2026-11-18 19:10:00", "2026-11-18 20:00:00", "PLAN_MAINT", "Scheduled weekly lube and nozzle purge", "Karthik S"],
        ["MACH_A3", "2026-11-18 23:20:00", "2026-11-19 00:35:00", "ELEC_FAULT", "Substation fluctuation caused inverter restart", "Dinesh M"],
        ["MACH_A4", "2026-11-19 02:15:00", "2026-11-19 03:00:00", "MECH_FAIL", "Die ejector pin jam cleared", "Dinesh M"],
        ["MACH_A1", "2026-11-19 08:30:00", "2026-11-19 09:10:00", "TOOL_WEAR", "Drill bit worn out, swapped with spare", "Ramesh Kumar"],
        ["MACH_A2", "2026-11-19 14:40:00", "2026-11-19 15:20:00", "MAT_SHORT", "Resin pellet dryer feed choked", "Karthik S"],
        ["MACH_A3", "2026-11-19 18:00:00", "2026-11-19 19:15:00", "ELEC_FAULT", "Welding torch cable grounding fault", "Anand P"],
        ["MACH_A4", "2026-11-19 21:00:00", "2026-11-19 21:40:00", "OP_ERR", "Safety light curtain triggered mistakenly", "Suresh V"],
        ["MACH_A1", "2026-11-20 06:45:00", "2026-11-20 07:15:00", "PLAN_MAINT", "Spindle calibration check", "Ramesh Kumar"],
        ["MACH_A2", "2026-11-20 10:20:00", "2026-11-20 11:30:00", "MECH_FAIL", "Heater band open circuit replaced", "Karthik S"],
        ["MACH_A3", "2026-11-20 12:10:00", "2026-11-20 12:55:00", "TOOL_WEAR", "Gas nozzle slag cleaned & tip replaced", "Anand P"],
    ]

    for row in sample_rows:
        csv_buffer.write(",".join([f'"{val}"' for val in row]) + "\n")

    csv_buffer.seek(0)
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=downtime_import_sample.csv"},
    )
