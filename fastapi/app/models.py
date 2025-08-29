from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, DECIMAL, Date, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    hosted_trips = relationship("Trip", foreign_keys="Trip.host_id", back_populates="host")
    created_trips = relationship("Trip", foreign_keys="Trip.user_id", back_populates="creator")
    trip_requests = relationship("TripRequest", back_populates="user")
    participations = relationship("TripParticipant", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False)
    description = Column(Text)
    open_slots = Column(Integer, nullable=False, default=1)
    budget_min = Column(DECIMAL(10, 2))
    budget_max = Column(DECIMAL(10, 2))
    preferences = Column(JSON, default={})
    status = Column(String(20), default="active", index=True)  # active, completed, cancelled
    current_participants = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[user_id], back_populates="created_trips")
    host = relationship("User", foreign_keys=[host_id], back_populates="hosted_trips")
    trip_requests = relationship("TripRequest", back_populates="trip", cascade="all, delete-orphan")
    participants = relationship("TripParticipant", back_populates="trip", cascade="all, delete-orphan")
    group_chat = relationship("GroupChat", back_populates="trip", uselist=False, cascade="all, delete-orphan")

class TripRequest(Base):
    __tablename__ = "trip_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="pending", index=True)  # pending, accepted, rejected
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="trip_requests")
    user = relationship("User", back_populates="trip_requests")

class TripParticipant(Base):
    __tablename__ = "trip_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="participant")  # host, participant
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="participants")
    user = relationship("User", back_populates="participations")

class GroupChat(Base):
    __tablename__ = "group_chats"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="group_chat")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("group_chats.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # text, image, system
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    chat = relationship("GroupChat", back_populates="messages")
    user = relationship("User", back_populates="chat_messages")