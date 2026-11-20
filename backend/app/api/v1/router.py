from fastapi import APIRouter
from app.api.v1 import auth, users, master_data, downtime, imports, analytics, reports, reliability, financial

router = APIRouter(prefix="/api/v1")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Health sub-router
health_router = APIRouter(prefix="/health", tags=["Health"])


@health_router.get("")
async def health_status():
    """Get API health status."""
    return {"status": "ok"}


router.include_router(health_router)

# Include auth and users routers
router.include_router(auth.router)
router.include_router(users.router)

# Include master data routers
router.include_router(master_data.plants_router)
router.include_router(master_data.lines_router)
router.include_router(master_data.machines_router)
router.include_router(master_data.shifts_router)
router.include_router(master_data.reasons_router)

# Include downtime router
router.include_router(downtime.router)

# Include imports router
router.include_router(imports.router)

# Include analytics router
router.include_router(analytics.router)

# Include reports router
router.include_router(reports.router)

# Include reliability & predictive maintenance router
router.include_router(reliability.router)

# Include financial loss & OEE calculator router
router.include_router(financial.router)
