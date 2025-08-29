-- TripNect India Database Schema Update
-- Updated PostgreSQL Database Setup for Explore Trips Feature

-- Drop existing tables if needed (uncomment if you want to reset)
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS group_chats CASCADE;
-- DROP TABLE IF EXISTS trip_participants CASCADE;
-- DROP TABLE IF EXISTS trip_requests CASCADE;

-- Update existing trips table to support new explore trips feature
ALTER TABLE trips 
DROP COLUMN IF EXISTS start_location,
DROP COLUMN IF EXISTS travelers,
DROP COLUMN IF EXISTS interests,
DROP COLUMN IF EXISTS budget_level,
DROP COLUMN IF EXISTS itinerary,
DROP COLUMN IF EXISTS route_coordinates;

-- Add new columns to trips table for explore trips feature
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS open_slots INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS budget_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS budget_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 1;

-- Update host_id for existing trips (set to user_id)
UPDATE trips SET host_id = user_id WHERE host_id IS NULL;

-- Trip requests table
CREATE TABLE IF NOT EXISTS trip_requests (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, user_id)
);

-- Trip participants table (for accepted requests)
CREATE TABLE IF NOT EXISTS trip_participants (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
    UNIQUE(trip_id, user_id)
);

-- Group chats table
CREATE TABLE IF NOT EXISTS group_chats (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_requests_trip_id ON trip_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_user_id ON trip_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips(destination);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- Add triggers for updated_at
CREATE TRIGGER update_trip_requests_updated_at BEFORE UPDATE ON trip_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_chats_updated_at BEFORE UPDATE ON group_chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create group chat when first participant joins
CREATE OR REPLACE FUNCTION create_group_chat_on_participant()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is the first participant (excluding host)
    IF NOT EXISTS (
        SELECT 1 FROM group_chats WHERE trip_id = NEW.trip_id
    ) THEN
        INSERT INTO group_chats (trip_id, name)
        SELECT NEW.trip_id, CONCAT('Trip to ', destination)
        FROM trips WHERE id = NEW.trip_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create group chat
CREATE TRIGGER create_chat_on_participant
    AFTER INSERT ON trip_participants
    FOR EACH ROW EXECUTE FUNCTION create_group_chat_on_participant();

-- Function to update current_participants count
CREATE OR REPLACE FUNCTION update_trip_participants_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE trips 
        SET current_participants = current_participants + 1 
        WHERE id = NEW.trip_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE trips 
        SET current_participants = current_participants - 1 
        WHERE id = OLD.trip_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update participant count
CREATE TRIGGER update_participants_count_insert
    AFTER INSERT ON trip_participants
    FOR EACH ROW EXECUTE FUNCTION update_trip_participants_count();

CREATE TRIGGER update_participants_count_delete
    AFTER DELETE ON trip_participants
    FOR EACH ROW EXECUTE FUNCTION update_trip_participants_count();