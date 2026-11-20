import os
import sys
from datetime import datetime, timedelta
import random

# Read .env manually
env_vars = {}
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()

mongo_uri = env_vars.get("MONGODB_URI", "")
db_name = env_vars.get("MONGODB_DATABASE", "FactoryPulse")

print(f"Connecting to MongoDB Atlas...")
print(f"Target Database: {db_name}")

try:
    import pymongo
    import bcrypt

    client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    # Check connection
    client.admin.command('ping')
    print("Ping to MongoDB Atlas successful!")

    db = client[db_name]

    # 1. Seed Admin User
    existing_admin = db.users.find_one({"email": "admin@factorypulse.com"})
    if not existing_admin:
        pwd_hash = bcrypt.hashpw(b"Admin@123", bcrypt.gensalt()).decode("utf-8")
        admin_doc = {
            "name": "Admin",
            "email": "admin@factorypulse.com",
            "password_hash": pwd_hash,
            "role": "admin",
            "plant_ids": [],
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        res = db.users.insert_one(admin_doc)
        print(f"Created Admin User in 'users' collection (ID: {res.inserted_id})")
    else:
        print("Admin user already exists in 'users' collection.")

    # 2. Seed Master Data: Plant
    plant = db.plants.find_one({"code": "PLANT_01"})
    if not plant:
        plant_id = str(db.plants.insert_one({
            "name": "Plant Alpha",
            "code": "PLANT_01",
            "timezone": "UTC",
            "created_at": datetime.utcnow()
        }).inserted_id)
        print(f"Created Plant: {plant_id}")
    else:
        plant_id = str(plant["_id"])
        print(f"Plant exists: {plant_id}")

    # Seed Line
    line = db.lines.find_one({"code": "LINE_A", "plant_id": plant_id})
    if not line:
        line_id = str(db.lines.insert_one({
            "plant_id": plant_id,
            "name": "Line A",
            "code": "LINE_A",
            "created_at": datetime.utcnow()
        }).inserted_id)
        print(f"Created Line: {line_id}")
    else:
        line_id = str(line["_id"])
        print(f"Line exists: {line_id}")

    # Seed Machines
    machines_data = [
        {"code": "MACH_A1", "name": "CNC Milling Machine A1", "rated_output_per_hour": 100.0, "status": "active"},
        {"code": "MACH_A2", "name": "Injection Molding A2", "rated_output_per_hour": 80.0, "status": "active"},
        {"code": "MACH_A3", "name": "Robotic Welding A3", "rated_output_per_hour": 120.0, "status": "active"},
    ]
    machine_ids = []
    for m in machines_data:
        existing_m = db.machines.find_one({"code": m["code"], "plant_id": plant_id})
        if not existing_m:
            m_doc = {**m, "plant_id": plant_id, "line_id": line_id, "created_at": datetime.utcnow()}
            mid = str(db.machines.insert_one(m_doc).inserted_id)
            print(f"Created Machine: {m['name']} ({mid})")
            machine_ids.append(mid)
        else:
            machine_ids.append(str(existing_m["_id"]))

    # Seed Shifts
    shifts_data = [
        {"name": "Morning Shift", "start_local": "06:00", "end_local": "14:00"},
        {"name": "Afternoon Shift", "start_local": "14:00", "end_local": "22:00"},
        {"name": "Night Shift", "start_local": "22:00", "end_local": "06:00"},
    ]
    shift_ids = []
    for s in shifts_data:
        existing_s = db.shifts.find_one({"name": s["name"], "plant_id": plant_id})
        if not existing_s:
            s_doc = {**s, "plant_id": plant_id, "created_at": datetime.utcnow()}
            sid = str(db.shifts.insert_one(s_doc).inserted_id)
            print(f"Created Shift: {s['name']} ({sid})")
            shift_ids.append(sid)
        else:
            shift_ids.append(str(existing_s["_id"]))

    # Seed Reasons
    reasons_data = [
        {"code": "MECH_FAIL", "label": "Mechanical Breakdown", "category": "mechanical", "is_planned": False, "active": True},
        {"code": "ELEC_FAULT", "label": "Electrical Power Trip", "category": "electrical", "is_planned": False, "active": True},
        {"code": "MAT_SHORT", "label": "Raw Material Shortage", "category": "material", "is_planned": False, "active": True},
        {"code": "OP_ERR", "label": "Operator Setup Error", "category": "operator", "is_planned": False, "active": True},
        {"code": "PLAN_MAINT", "label": "Preventive Maintenance", "category": "planned", "is_planned": True, "active": True},
        {"code": "TOOL_WEAR", "label": "Cutting Tool Replacement", "category": "mechanical", "is_planned": False, "active": True},
    ]
    reason_ids = []
    for r in reasons_data:
        existing_r = db.reasons.find_one({"code": r["code"], "plant_id": plant_id})
        if not existing_r:
            r_doc = {**r, "plant_id": plant_id, "created_at": datetime.utcnow()}
            rid = str(db.reasons.insert_one(r_doc).inserted_id)
            print(f"Created Reason: {r['label']} ({rid})")
            reason_ids.append(rid)
        else:
            reason_ids.append(str(existing_r["_id"]))

    # Seed Sample Downtime Events (last 14 days)
    events_count = db.downtime_events.count_documents({"plant_id": plant_id})
    if events_count < 10:
        print(f"Current downtime events: {events_count}. Generating 25 realistic sample downtime events...")
        now = datetime.utcnow()
        sample_events = []
        for i in range(25):
            days_ago = random.randint(0, 14)
            hours_ago = random.randint(0, 23)
            duration_minutes = random.choice([15, 25, 40, 60, 90, 120, 180])
            start_at = now - timedelta(days=days_ago, hours=hours_ago)
            end_at = start_at + timedelta(minutes=duration_minutes)

            m_id = random.choice(machine_ids)
            r_id = random.choice(reason_ids)
            s_id = random.choice(shift_ids)

            sample_events.append({
                "plant_id": plant_id,
                "machine_id": m_id,
                "line_id": line_id,
                "shift_id": s_id,
                "reason_id": r_id,
                "start_at": start_at,
                "end_at": end_at,
                "duration_min": float(duration_minutes),
                "duration_minutes": float(duration_minutes),
                "planned": False,
                "source": "manual",
                "created_by": "admin@factorypulse.com",
                "status": "confirmed",
                "notes": f"Simulated production downtime event #{i+1}",
                "created_at": now
            })
        db.downtime_events.insert_many(sample_events)
        print("Successfully seeded 25 downtime events into 'downtime_events' collection!")
    else:
        print(f"Downtime events already exist ({events_count} events).")

    print("\n--- DATABASE SUMMARY ---")
    for col in db.list_collection_names():
        cnt = db[col].count_documents({})
        print(f"Collection: {col.ljust(20)} -> {cnt} documents")

    print("\nSUCCESS: All data successfully pushed to MongoDB Atlas!")

except Exception as ex:
    print(f"Error connecting or seeding MongoDB: {ex}")
    sys.exit(1)
