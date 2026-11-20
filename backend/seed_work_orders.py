import asyncio
from datetime import datetime, timezone
from app.core.database import connect_to_mongo, get_database, close_mongo_connection

async def main():
    await connect_to_mongo()
    db = await get_database()
    plants = await db.plants.find({}).to_list(10)
    if not plants:
        print("No plants found")
        return
    plant_id = plants[0].get("id", str(plants[0].get("_id")))

    machines = await db.machines.find({"plant_id": plant_id}).to_list(10)
    mach_map = {m["code"]: m for m in machines}

    # Clean existing work orders for fresh state
    await db.work_orders.delete_many({"plant_id": plant_id})

    m2 = mach_map.get("MACH_A2", machines[0])
    m1 = mach_map.get("MACH_A1", machines[1] if len(machines) > 1 else machines[0])

    work_orders = [
        {
            "plant_id": plant_id,
            "machine_id": str(m2.get("_id", m2.get("id"))),
            "machine_code": m2.get("code", "MACH_A2"),
            "machine_name": m2.get("name", "Injection Molding A2"),
            "title": "Hydraulic Overload & Valve Seal Servicing",
            "priority": "critical",
            "assigned_technician": "M. Rajesh (Hydraulics Specialist)",
            "scheduled_date": "2026-11-21",
            "estimated_duration_hours": 3.0,
            "notes": "Replace worn hydraulic cylinder seals and inspect pump pressure regulator.",
            "status": "in_progress",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "plant_id": plant_id,
            "machine_id": str(m1.get("_id", m1.get("id"))),
            "machine_code": m1.get("code", "MACH_A1"),
            "machine_name": m1.get("name", "CNC Milling Machine A1"),
            "title": "Spindle Bearing Lubrication & Collet Recalibration",
            "priority": "high",
            "assigned_technician": "K. Suresh (Senior Millwright)",
            "scheduled_date": "2026-11-22",
            "estimated_duration_hours": 2.0,
            "notes": "Perform ultrasonic vibration test on spindle housing and replenish synthetic grease.",
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ]

    result = await db.work_orders.insert_many(work_orders)
    print(f"Successfully seeded {len(result.inserted_ids)} work orders into MongoDB Atlas!")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
