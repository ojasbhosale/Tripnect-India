from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
from dotenv import load_dotenv

from app.database import engine, Base
from app.routers import trips, requests, participants, chats

# Load environment variables
load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="TripNect India API",
    description="Backend API for TripNect India - Explore Trips Feature",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure this properly for production
)

# Include routers
app.include_router(trips.router, prefix="/api/v1/trips", tags=["trips"])
app.include_router(requests.router, prefix="/api/v1/requests", tags=["requests"])
app.include_router(participants.router, prefix="/api/v1/participants", tags=["participants"])
app.include_router(chats.router, prefix="/api/v1/chats", tags=["chats"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to TripNect India API",
        "feature": "Explore Trips",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tripnect-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )