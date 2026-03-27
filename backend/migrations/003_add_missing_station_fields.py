"""
Database migration script to add missing fields to stations table.
This adds network_logo, updatedate, services, and contact_details columns.
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def migrate():
    """Add missing fields to stations table."""
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cursor = conn.cursor()

    print("Starting database migration...")
    print("Adding missing fields to stations table...")

    # Add network_logo column
    try:
        cursor.execute("""
            ALTER TABLE stations 
            ADD COLUMN IF NOT EXISTS network_logo TEXT
        """)
        print("✓ Added network_logo column")
    except Exception as e:
        print(f"  network_logo column already exists or error: {e}")

    # Add updatedate column
    try:
        cursor.execute("""
            ALTER TABLE stations 
            ADD COLUMN IF NOT EXISTS updatedate TEXT
        """)
        print("✓ Added updatedate column")
    except Exception as e:
        print(f"  updatedate column already exists or error: {e}")

    # Add services column (JSON array)
    try:
        cursor.execute("""
            ALTER TABLE stations 
            ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb
        """)
        print("✓ Added services column")
    except Exception as e:
        print(f"  services column already exists or error: {e}")

    # Add contact_details column
    try:
        cursor.execute("""
            ALTER TABLE stations 
            ADD COLUMN IF NOT EXISTS contact_details TEXT
        """)
        print("✓ Added contact_details column")
    except Exception as e:
        print(f"  contact_details column already exists or error: {e}")

    conn.commit()
    conn.close()

    print("\n✅ Migration completed successfully!")
    print("New columns added to stations table:")
    print("  - network_logo (TEXT)")
    print("  - updatedate (TEXT)")
    print("  - services (JSONB)")
    print("  - contact_details (TEXT)")


if __name__ == "__main__":
    migrate()
