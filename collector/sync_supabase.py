import sqlite3
import requests
import json
import os

# Configuration from .env.local
SUPABASE_URL = "https://stmdejospftgrippzdft.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bWRlam9zcGZ0Z3JpcHB6ZGZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEwMTQyMiwiZXhwIjoyMDgwNjc3NDIyfQ.DbM-BTndDyhciSzR2IPU1J0fOomXJCo9Pud8zRdUPQI")
DB_PATH = r"C:\EERS_Data\eers_data.db"

def sync():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all notices
    cursor.execute("SELECT * FROM notices")
    rows = cursor.fetchall()
    
    print(f"Syncing {len(rows)} notices to Supabase...")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    # Supabase UPSERT endpoint
    # Note: On Supabase, you must have a unique constraint on these columns for UPSERT to work.
    url = f"{SUPABASE_URL}/rest/v1/notices?on_conflict=source_system,detail_link,model_name,assigned_office"
    
    batch_size = 50
    for i in range(0, len(rows), batch_size):
        batch = []
        for row in rows[i:i+batch_size]:
            d = dict(row)
            # Remove local ID, use the 4-column unique key for upsert
            item = {k: v for k, v in d.items() if k != 'id'}
            # Handle JSON fields
            if 'raw_data' in item and item['raw_data']:
                try:
                    item['raw_data'] = json.loads(item['raw_data'])
                except:
                    item['raw_data'] = {}
            batch.append(item)
            
        res = requests.post(url, headers=headers, json=batch)
        if res.status_code in [200, 201]:
            print(f"  [OK] Batch {i//batch_size + 1} synced.")
        else:
            print(f"  [Fail] Batch {i//batch_size + 1}: {res.status_code} - {res.text}")

    conn.close()

if __name__ == "__main__":
    sync()
