# app.py - Simple wrapper that imports from the new backend module
# This file now serves as a compatibility layer for existing setups

from backend.main import app

# Make app available at module level for uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
