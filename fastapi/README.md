# TripNect India - FastAPI Backend

A FastAPI backend for TripNect India's Explore Trips feature, enabling users to create, discover, and join group travel experiences.

## Features

### 🌍 Explore Trips
- **Trip Creation**: Users can create trips with destinations, dates, slots, budget, and preferences
- **Trip Feed**: Browse available trips with filtering and search capabilities
- **Join Requests**: Request to join trips with host approval system
- **Group Chat**: Real-time communication for trip participants

## Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL database
- Node.js backend (for authentication)

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT settings
```

3. Update database schema:
```bash
# Run the database_schema_update.sql file in your PostgreSQL database
psql -U postgres -d tripnect_db -f database_schema_update.sql
```

4. Initialize Alembic (for future migrations):
```bash
alembic upgrade head
```

5. Run the development server:
```bash
python run.py
```

The API will be available at `http://localhost:8000`

## API Documentation

### Interactive Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Endpoints

#### Trips
- `POST /api/v1/trips/` - Create a new trip
- `GET /api/v1/trips/feed` - Get trip feed with filters
- `GET /api/v1/trips/{trip_id}` - Get trip details
- `PUT /api/v1/trips/{trip_id}` - Update trip (host only)
- `DELETE /api/v1/trips/{trip_id}` - Cancel trip (host only)

#### Requests
- `POST /api/v1/requests/` - Request to join trip
- `GET /api/v1/requests/trip/{trip_id}` - Get trip requests (host only)
- `PUT /api/v1/requests/{request_id}` - Accept/reject request (host only)
- `DELETE /api/v1/requests/{request_id}` - Cancel request (requester only)

#### Participants
- `GET /api/v1/participants/trip/{trip_id}` - Get trip participants
- `DELETE /api/v1/participants/trip/{trip_id}/user/{user_id}` - Remove participant

#### Chats
- `GET /api/v1/chats/trip/{trip_id}` - Get trip group chat
- `GET /api/v1/chats/{chat_id}/messages` - Get chat messages
- `POST /api/v1/chats/{chat_id}/messages` - Send message

## Database Schema

The backend extends your existing schema with:
- `trip_requests` - Join requests with approval workflow
- `trip_participants` - Trip members and roles
- `group_chats` - Group chat rooms for each trip
- `chat_messages` - Chat message history

## Authentication

This backend expects JWT tokens from your Node.js authentication system. The tokens should contain the user ID in the `sub` claim.

## Development

### Running Tests
```bash
pytest
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

## Production Notes

- Update `SECRET_KEY` in production
- Configure proper CORS origins
- Set up database connection pooling
- Enable logging and monitoring
- Configure rate limiting