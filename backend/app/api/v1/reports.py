"""Reports router — PDF/CSV/XLSX export endpoints."""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.services.auth_service import get_current_user
from app.core.database import get_database
from app.schemas.reports import ReportCreateRequest, ReportResponse
from app.services.report_service import generate_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/", response_model=dict)
async def create_report(
    request: ReportCreateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Create and immediately generate a report.
    Returns file as StreamingResponse and stores metadata in reports collection.
    """
    try:
        # Validate date range
        from_date = datetime.fromisoformat(request.from_date)
        to_date = datetime.fromisoformat(request.to_date)

        if from_date > to_date:
            raise HTTPException(status_code=400, detail="from_date must be before to_date")

        # Prepare report config
        report_config = {
            "plant_id": request.plant_id,
            "from_date": request.from_date,
            "to_date": request.to_date,
            "machine_id": request.machine_id,
            "shift_id": request.shift_id,
            "format": request.format,
            "title": request.title,
        }

        # Generate report
        report_data = await generate_report(db, report_config, current_user["email"])

        # Store report metadata in DB
        report_record = {
            "plant_id": request.plant_id,
            "title": request.title,
            "format": request.format,
            "status": "completed",
            "from_date": request.from_date,
            "to_date": request.to_date,
            "created_by": current_user["email"],
            "created_at": datetime.utcnow(),
            "file_size_kb": len(report_data["content"]) / 1024,
        }

        result = await db.reports.insert_one(report_record)
        report_record["id"] = str(result.inserted_id)

        # Return file as streaming response
        return StreamingResponse(
            iter([report_data["content"]]),
            media_type=report_data["content_type"],
            headers={"Content-Disposition": f"attachment; filename={report_data['filename']}"}
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Report generation failed")


@router.get("/", response_model=dict)
async def list_reports(
    plant_id: str = Query(...),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    List report history for a plant.
    Returns paginated list of report metadata.
    """
    try:
        # Count total reports
        total = await db.reports.count_documents({"plant_id": plant_id})

        # Fetch paginated reports
        cursor = db.reports.find({"plant_id": plant_id}).sort("created_at", -1).skip(skip).limit(limit)
        reports = []

        async for report in cursor:
            report["id"] = str(report["_id"])
            del report["_id"]
            reports.append(report)

        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "reports": reports
        }

    except Exception as e:
        logger.error(f"Error listing reports: {str(e)}")
        raise HTTPException(status_code=500, detail="Error listing reports")


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Re-download a previously generated report.
    Returns the file as StreamingResponse if still available.
    """
    try:
        from bson.objectid import ObjectId

        # Fetch report metadata
        report = await db.reports.find_one({"_id": ObjectId(report_id)})

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        if report["status"] != "completed":
            raise HTTPException(status_code=400, detail="Report not ready or failed")

        # For MVP, just indicate that re-download would work
        # In production, you'd fetch the file from storage (S3, etc.)
        return {
            "message": "Report download endpoint - file would be served here",
            "report_id": report_id,
            "filename": f"factorypulse_report_{report_id}.{report['format']}"
        }

    except Exception as e:
        logger.error(f"Error downloading report: {str(e)}")
        raise HTTPException(status_code=500, detail="Error downloading report")
