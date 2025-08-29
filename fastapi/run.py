"""
TripNect India FastAPI Backend
Run this file to start the development server
"""

import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        app,  # use the imported app directly
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
