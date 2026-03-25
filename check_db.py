import sqlite3

# Connect to the database
conn = sqlite3.connect("fuel_prices.db")
cursor = conn.cursor()

# Replace with your actual table name for national averages
table_name = "national_averages"

# 1️⃣ Check if table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
if table_name not in tables:
    print(f"Table '{table_name}' does not exist. Available tables: {tables}")
else:
    # 2️⃣ Fetch all rows from the national averages table
    cursor.execute(f"SELECT * FROM {table_name};")
    rows = cursor.fetchall()
    
    # 3️⃣ Get column names
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = [col[1] for col in cursor.fetchall()]
    
    # 4️⃣ Print results in a readable format
    print(f"\nData from '{table_name}':")
    for row in rows:
        record = {columns[i]: row[i] for i in range(len(columns))}
        print(record)

# Close connection
conn.close()