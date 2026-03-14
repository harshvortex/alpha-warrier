import os
import sqlite3

def reset():
    print("🧹 Cleaning Alpha Warrior Security Logs...")
    
    # Reset SQLite DB
    db_path = "SentinelLayer/security_logs.db"
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM security_events")
            cursor.execute("DELETE FROM pending_approvals")
            conn.commit()
            conn.close()
            print("✅ Database cleared.")
        except Exception as e:
            print(f"❌ DB Error: {e}")

    # Reset JSONL SIEM Log
    siem_path = "SentinelLayer/backend/logs/siem_audit.jsonl"
    if os.path.exists(siem_path):
        with open(siem_path, "w") as f:
            f.write("")
        print("✅ SIEM Logs cleared.")

    # Reset Outbox
    outbox_path = "outbox.log"
    if os.path.exists(outbox_path):
        os.remove(outbox_path)
        print("✅ Simulation outbox cleared.")

    print("\n🚀 System is now FRESH and ready for judging!")

if __name__ == "__main__":
    reset()
