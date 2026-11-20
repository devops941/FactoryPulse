import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.core.init_db import seed_admin, seed_master_data, seed_downtime_events, create_indexes
from app.api.v1.router import router as api_v1_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("FactoryPulse API starting...")
    await connect_to_mongo()

    # Seed database with default admin user and master data
    db = await get_database()
    await create_indexes(db)
    try:
        await seed_admin(db)
        await seed_master_data(db)
        await seed_downtime_events(db)
    except Exception as e:
        logger.warning(f"Seeding skipped — Atlas collection limit reached. Free space in your cluster then restart: {e}")

    logger.info("Application startup complete")
    yield
    # Shutdown
    logger.info("FactoryPulse API shutting down...")
    await close_mongo_connection()
    logger.info("Application shutdown complete")


# Create FastAPI application
settings = get_settings()
app = FastAPI(
    title="FactoryPulse API",
    description="Machine Downtime Intelligence & Production Loss Estimator",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS origins configured: {origins}")


# Health check endpoint at root
@app.get("/health")
async def health_root():
    """Root health check endpoint."""
    return {"status": "ok", "service": "factorypulse-api"}


# Include API v1 router
app.include_router(api_v1_router)

logger.info("FactoryPulse API configured successfully")
