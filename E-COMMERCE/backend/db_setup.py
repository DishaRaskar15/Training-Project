import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

sql = """
CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    full_name  TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

try:
    supabase.rpc("exec_sql", {"query": sql}).execute()
    print("✅ users table created.")
except Exception as e:
    print(f"RPC not available: {e}")
    print("👉 Please run this SQL manually in Supabase SQL Editor:")
    print(sql)
