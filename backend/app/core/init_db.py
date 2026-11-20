"""Database initialization utilities."""

import logging
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import random
from app.core.security import hash_password
from app.repositories import master_repository

logger = logging.getLogger(__name__)


async def create_indexes(db) -> None:
    """Create MongoDB indexes for optimal query performance."""
    try:
        await db.downtime_events.create_index([("plant_id", 1), ("start_at", -1)])
        await db.downtime_events.create_index([("plant_id", 1), ("machine_id", 1), ("start_at", -1)])
        await db.downtime_events.create_index([("plant_id", 1), ("reason_id", 1), ("start_at", -1)])
        await db.downtime_events.create_index([("batch_id", 1)])
        await db.users.create_index([("email", 1)], unique=True)
        await db.machines.create_index([("plant_id", 1), ("code", 1)], unique=True)
        logger.info("MongoDB indexes created")
    except Exception as e:
        logger.warning(f"Index creation skipped (Atlas collection limit may be reached): {e}")


async def seed_admin(db: AsyncIOMotorDatabase) -> None:
    """
    Seed a default admin user if no users exist.

    Args:
        db: MongoDB database instance
    """
    # Check if any users exist
    existing = await db.users.find_one({"email": "admin@gmail.com"})
    if existing:
        logger.info("Admin user already exists")
        return

    # Create default admin user
    admin_user = {
        "name": "Admin",
        "email": "admin@gmail.com",
        "password_hash": hash_password("Admin@123"),
        "role": "admin",
        "plant_ids": [],
        "is_active": True,
        "created_at": datetime.utcnow(),
    }

    result = await db.users.insert_one(admin_user)
    logger.info(f"Default admin created with ID: {result.inserted_id}")
    logger.info("Admin email: admin@gmail.com")
    logger.info("Admin password: Admin@123")
    print("\n" + "=" * 60)
    print("FactoryPulse - Default Admin User Created")
    print("=" * 60)
    print("Email:    admin@gmail.com")
    print("Password: Admin@123")
    print("=" * 60 + "\n")


async def seed_master_data(db: AsyncIOMotorDatabase) -> None:
    """
    Seed master data (plants, lines, machines, shifts, reasons) if not already seeded.

    Args:
        db: MongoDB database instance
    """
    # Check if plants already exist
    existing_plant = await db.plants.find_one({})
    if existing_plant:
        logger.info("Master data already seeded")
        return

    logger.info("Seeding master data...")

    # Create Plant Alpha
    plant_data = {
        "name": "Plant Alpha",
        "code": "PLANT_01",
        "timezone": "UTC",
    }
    plant_id = await master_repository.create_plant(db, plant_data)
    logger.info(f"Created plant: {plant_id}")

    # Create Line A
    line_data = {
        "plant_id": plant_id,
        "name": "Line A",
        "code": "LINE_A",
    }
    line_id = await master_repository.create_line(db, line_data)
    logger.info(f"Created line: {line_id}")

    # Create 3 machines on Line A
    machines = [
        {
            "plant_id": plant_id,
            "line_id": line_id,
            "code": "MACH_A1",
            "name": "Machine A1",
            "rated_output_per_hour": 100.0,
            "status": "active",
        },
        {
            "plant_id": plant_id,
            "line_id": line_id,
            "code": "MACH_A2",
            "name": "Machine A2",
            "rated_output_per_hour": 80.0,
            "status": "active",
        },
        {
            "plant_id": plant_id,
            "line_id": line_id,
            "code": "MACH_A3",
            "name": "Machine A3",
            "rated_output_per_hour": 120.0,
            "status": "active",
        },
    ]
    for machine_data in machines:
        machine_id = await master_repository.create_machine(db, machine_data)
        logger.info(f"Created machine: {machine_id} ({machine_data['code']})")

    # Create 3 shifts
    shifts = [
        {
            "plant_id": plant_id,
            "name": "Morning",
            "start_local": "06:00",
            "end_local": "14:00",
        },
        {
            "plant_id": plant_id,
            "name": "Afternoon",
            "start_local": "14:00",
            "end_local": "22:00",
        },
        {
            "plant_id": plant_id,
            "name": "Night",
            "start_local": "22:00",
            "end_local": "06:00",
        },
    ]
    for shift_data in shifts:
        shift_id = await master_repository.create_shift(db, shift_data)
        logger.info(f"Created shift: {shift_id} ({shift_data['name']})")

    # Create 6 downtime reasons
    reasons = [
        {
            "plant_id": plant_id,
            "code": "MECH_FAIL",
            "label": "Mechanical Failure",
            "category": "mechanical",
            "is_planned": False,
            "active": True,
        },
        {
            "plant_id": plant_id,
            "code": "ELEC_FAULT",
            "label": "Electrical Fault",
            "category": "electrical",
            "is_planned": False,
            "active": True,
        },
        {
            "plant_id": plant_id,
            "code": "MAT_SHORT",
            "label": "Material Shortage",
            "category": "material",
            "is_planned": False,
            "active": True,
        },
        {
            "plant_id": plant_id,
            "code": "OP_ERR",
            "label": "Operator Error",
            "category": "operator",
            "is_planned": False,
            "active": True,
        },
        {
            "plant_id": plant_id,
            "code": "PLAN_MAINT",
            "label": "Planned Maintenance",
            "category": "planned",
            "is_planned": True,
            "active": True,
        },
        {
            "plant_id": plant_id,
            "code": "CHANGEOVER",
            "label": "Changeover",
            "category": "planned",
            "is_planned": True,
            "active": True,
        },
    ]
    for reason_data in reasons:
        reason_id = await master_repository.create_reason(db, reason_data)
        logger.info(f"Created reason: {reason_id} ({reason_data['code']})")

    logger.info("Master data seeding complete")


async def seed_downtime_events(db: AsyncIOMotorDatabase) -> None:
    """
    Seed sample downtime events if none exist.

    Args:
        db: MongoDB database instance
    """
    # Check if events already exist
    existing_event = await db.downtime_events.find_one({})
    if existing_event:
        logger.info("Downtime events already seeded")
        return

    logger.info("Seeding sample downtime events...")

    # Get master data for seeds
    machines = await db.machines.find({}).to_list(length=None)
    shifts = await db.shifts.find({}).to_list(length=None)
    reasons = await db.reasons.find({}).to_list(length=None)
    plants = await db.plants.find({}).to_list(length=None)

    if not machines or not shifts or not reasons or not plants:
        logger.info("Not enough master data to seed events")
        return

    plant_id = str(plants[0]["_id"])
    machine_ids = [str(m["_id"]) for m in machines]
    shift_ids = [str(s["_id"]) for s in shifts]
    reason_ids = [str(r["_id"]) for r in reasons]

    # Get line_id from first machine
    line_id = str(machines[0]["line_id"]) if machines[0].get("line_id") else str(machines[0]["_id"])

    # Generate 50 sample events over the last 30 days
    now = datetime.utcnow()
    start_date = now - timedelta(days=30)

    for i in range(50):
        # Random start time in the past 30 days
        random_offset = random.randint(0, 30 * 24 * 60)  # minutes
        start_at = start_date + timedelta(minutes=random_offset)

        # Random duration between 15 and 120 minutes
        duration_min = random.randint(15, 120)
        end_at = start_at + timedelta(minutes=duration_min)

        event = {
            "plant_id": plant_id,
            "machine_id": random.choice(machine_ids),
            "line_id": line_id,
            "start_at": start_at,
            "end_at": end_at,
            "duration_min": float(duration_min),
            "reason_id": random.choice(reason_ids),
            "shift_id": random.choice(shift_ids),
            "source": "manual",
            "created_by": "admin@factorypulse.com",
            "created_at": datetime.utcnow(),
            "status": "confirmed",
            "notes": f"Sample downtime event #{i+1}"
        }

        result = await db.downtime_events.insert_one(event)
        logger.debug(f"Created sample event: {result.inserted_id}")

    logger.info(f"Seeded 50 downtime events")
