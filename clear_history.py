from backend.database import clear_price_history, init_db
init_db()
clear_price_history()
print('Old data cleared successfully')