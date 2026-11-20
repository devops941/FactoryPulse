import asyncio
import os
import csv
from datetime import datetime, timedelta
from app.core.database import connect_to_mongo, get_database, close_mongo_connection
from app.repositories import master_repository

async def main():
    await connect_to_mongo()
    db = await get_database()
    plants = await db.plants.find({}).to_list(10)
    if not plants:
        print("No plants found!")
        return
    plant = plants[0]
    plant_id = plant.get("id", str(plant.get("_id")))
    lines = await db.lines.find({"plant_id": plant_id}).to_list(10)
    line_id = lines[0].get("id", str(lines[0].get("_id"))) if lines else ""

    standard_machines = [
        {"code": "MACH_A1", "name": "CNC Milling Machine A1", "rated_output_per_hour": 120, "status": "active"},
        {"code": "MACH_A2", "name": "Injection Molding A2", "rated_output_per_hour": 100, "status": "active"},
        {"code": "MACH_A3", "name": "Robotic Welding A3", "rated_output_per_hour": 80, "status": "active"},
        {"code": "MACH_A4", "name": "Stamping Press A4", "rated_output_per_hour": 150, "status": "active"},
    ]

    for m in standard_machines:
        existing = await db.machines.find_one({"code": m["code"], "plant_id": plant_id})
        if not existing:
            doc = {
                "plant_id": plant_id,
                "line_id": line_id,
                "code": m["code"],
                "name": m["name"],
                "rated_output_per_hour": m["rated_output_per_hour"],
                "status": m["status"],
                "created_at": datetime.utcnow()
            }
            new_id = await master_repository.create_machine(db, doc)
            print(f"Created machine: {m['code']} -> {new_id}")
        else:
            print(f"Machine {m['code']} exists.")

    await close_mongo_connection()

    # Generate sample CSV file
    sample_records = [
        # Morning Shift (06:00 - 14:00)
        {"machine_code": "MACH_A1", "start_time": "2026-11-18 07:15:00", "end_time": "2026-11-18 07:45:00", "reason_code": "TOOL_WEAR", "notes": "Carbide insert chipped, replaced cutter", "operator": "Ramesh Kumar"},
        {"machine_code": "MACH_A2", "start_time": "2026-11-18 09:30:00", "end_time": "2026-11-18 10:15:00", "reason_code": "ELEC_FAULT", "notes": "Thermal overload trip on hydraulic motor", "operator": "Karthik S"},
        {"machine_code": "MACH_A3", "start_time": "2026-11-18 11:00:00", "end_time": "2026-11-18 11:25:00", "reason_code": "OP_ERR", "notes": "Fixture alignment sensor recalibrated", "operator": "Anand P"},
        
        # Afternoon Shift (14:00 - 22:00)
        {"machine_code": "MACH_A4", "start_time": "2026-11-18 15:00:00", "end_time": "2026-11-18 16:30:00", "reason_code": "MECH_FAIL", "notes": "Pneumatic cylinder seal blown, replaced", "operator": "Suresh V"},
        {"machine_code": "MACH_A1", "start_time": "2026-11-18 17:45:00", "end_time": "2026-11-18 18:15:00", "reason_code": "MAT_SHORT", "notes": "Steel billet stock depleted from hopper", "operator": "Ramesh Kumar"},
        {"machine_code": "MACH_A2", "start_time": "2026-11-18 19:10:00", "end_time": "2026-11-18 20:00:00", "reason_code": "PLAN_MAINT", "notes": "Scheduled weekly lube and nozzle purge", "operator": "Karthik S"},

        # Night Shift (22:00 - 06:00)
        {"machine_code": "MACH_A3", "start_time": "2026-11-18 23:20:00", "end_time": "2026-11-19 00:35:00", "reason_code": "ELEC_FAULT", "notes": "Substation fluctuation caused inverter restart", "operator": "Dinesh M"},
        {"machine_code": "MACH_A4", "start_time": "2026-11-19 02:15:00", "end_time": "2026-11-19 03:00:00", "reason_code": "MECH_FAIL", "notes": "Die ejector pin jam cleared", "operator": "Dinesh M"},

        # Day 2 - Nov 19
        {"machine_code": "MACH_A1", "start_time": "2026-11-19 08:30:00", "end_time": "2026-11-19 09:10:00", "reason_code": "TOOL_WEAR", "notes": "Drill bit worn out, swapped with spare", "operator": "Ramesh Kumar"},
        {"machine_code": "MACH_A2", "start_time": "2026-11-19 14:40:00", "end_time": "2026-11-19 15:20:00", "reason_code": "MAT_SHORT", "notes": "Resin pellet dryer feed choked", "operator": "Karthik S"},
        {"machine_code": "MACH_A3", "start_time": "2026-11-19 18:00:00", "end_time": "2026-11-19 19:15:00", "reason_code": "ELEC_FAULT", "notes": "Welding torch cable grounding fault", "operator": "Anand P"},
        {"machine_code": "MACH_A4", "start_time": "2026-11-19 21:00:00", "end_time": "2026-11-19 21:40:00", "reason_code": "OP_ERR", "notes": "Safety light curtain triggered mistakenly", "operator": "Suresh V"},
        
        # Day 3 - Nov 20 (Recent)
        {"machine_code": "MACH_A1", "start_time": "2026-11-20 06:45:00", "end_time": "2026-11-20 07:15:00", "reason_code": "PLAN_MAINT", "notes": "Spindle calibration check", "operator": "Ramesh Kumar"},
        {"machine_code": "MACH_A2", "start_time": "2026-11-20 10:20:00", "end_time": "2026-11-20 11:30:00", "reason_code": "MECH_FAIL", "notes": "Heater band open circuit replaced", "operator": "Karthik S"},
        {"machine_code": "MACH_A3", "start_time": "2026-11-20 12:10:00", "end_time": "2026-11-20 12:55:00", "reason_code": "TOOL_WEAR", "notes": "Gas nozzle slag cleaned & tip replaced", "operator": "Anand P"},
    ]

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    csv_path = os.path.join(project_root, "downtime_import_sample.csv")

    fieldnames = ["machine_code", "start_time", "end_time", "reason_code", "notes", "operator"]
    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sample_records)

    print(f"Sample CSV successfully created at: {csv_path}")

if __name__ == "__main__":
    asyncio.run(main())
