import asyncio
from datetime import datetime, timezone
from app.core.database import connect_to_mongo, get_database, close_mongo_connection
from app.core.security import hash_password

async def main():
    await connect_to_mongo()
    db = await get_database()

    print("--- CLEARING DATABASE COLLECTIONS ---")
    
    # 1. Clear downtime events
    del_events = await db.downtime_events.delete_many({})
    print(f"Cleared downtime_events: {del_events.deleted_count} removed")

    # 2. Clear work orders
    del_wo = await db.work_orders.delete_many({})
    print(f"Cleared work_orders: {del_wo.deleted_count} removed")

    # 3. Clear import batches & staging
    del_batches = await db.import_batches.delete_many({})
    del_staging = await db.import_staging.delete_many({})
    print(f"Cleared import_batches: {del_batches.deleted_count}, staging: {del_staging.deleted_count}")

    # 4. Clear machines
    del_mach = await db.machines.delete_many({})
    print(f"Cleared machines: {del_mach.deleted_count} removed")

    # 5. Clear all users and insert admin@gmail.com / Admin@123
    del_users = await db.users.delete_many({})
    print(f"Cleared old users: {del_users.deleted_count} removed")

    new_admin = {
        "name": "Admin",
        "email": "admin@gmail.com",
        "password_hash": hash_password("Admin@123"),
        "role": "admin",
        "plant_ids": [],
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    user_res = await db.users.insert_one(new_admin)
    print(f"Created new user: admin@gmail.com (ID: {user_res.inserted_id}) with password 'Admin@123'")

    # Verify plants, lines, shifts, reasons exist as clean foundation
    plant_count = await db.plants.count_documents({})
    if plant_count == 0:
        plant_doc = {
            "name": "Plant Alpha",
            "code": "PLANT_01",
            "timezone": "Asia/Kolkata",
            "created_at": datetime.now(timezone.utc),
        }
        p_res = await db.plants.insert_one(plant_doc)
        p_id = str(p_res.inserted_id)

        line_doc = {
            "plant_id": p_id,
            "name": "Line A",
            "code": "LINE_A",
            "created_at": datetime.now(timezone.utc),
        }
        await db.lines.insert_one(line_doc)

        shifts_docs = [
            {"plant_id": p_id, "name": "Morning Shift", "start_local": "06:00", "end_local": "14:00"},
            {"plant_id": p_id, "name": "Afternoon Shift", "start_local": "14:00", "end_local": "22:00"},
            {"plant_id": p_id, "name": "Night Shift", "start_local": "22:00", "end_local": "06:00"},
        ]
        await db.shifts.insert_many(shifts_docs)

        reasons_docs = [
            {"plant_id": p_id, "code": "MECH_FAIL", "label": "Mechanical Breakdown", "category": "mechanical", "is_planned": False, "active": True},
            {"plant_id": p_id, "code": "ELEC_FAULT", "label": "Electrical Power Trip", "category": "electrical", "is_planned": False, "active": True},
            {"plant_id": p_id, "code": "MAT_SHORT", "label": "Raw Material Shortage", "category": "operational", "is_planned": False, "active": True},
            {"plant_id": p_id, "code": "OP_ERR", "label": "Operator Setup Error", "category": "operational", "is_planned": False, "active": True},
            {"plant_id": p_id, "code": "PLAN_MAINT", "label": "Preventive Maintenance", "category": "maintenance", "is_planned": True, "active": True},
            {"plant_id": p_id, "code": "TOOL_WEAR", "label": "Cutting Tool Replacement", "category": "tooling", "is_planned": False, "active": True},
        ]
        await db.reasons.insert_many(reasons_docs)
        print("Base plant, line, shifts, and reasons initialized.")
    else:
        print(f"Master taxonomy preserved: {plant_count} plant(s) present.")

    print("\n--- DATABASE RESET COMPLETE ---")
    print("User Credentials:")
    print("Email:    admin@gmail.com")
    print("Password: Admin@123")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
