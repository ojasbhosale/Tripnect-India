from pydantic import BaseModel, EmailStr, validator
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserProfile(User):
    pass

# Trip schemas
class TripBase(BaseModel):
    title: str
    destination: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    open_slots: int = 1
    budget_min: Optional[Decimal] = None
    budget_max: Optional[Decimal] = None
    preferences: Optional[Dict[str, Any]] = {}

    @validator('end_date')
    def end_date_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

    @validator('open_slots')
    def validate_open_slots(cls, v):
        if v < 1:
            raise ValueError('Open slots must be at least 1')
        return v

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    open_slots: Optional[int] = None
    budget_min: Optional[Decimal] = None
    budget_max: Optional[Decimal] = None
    preferences: Optional[Dict[str, Any]] = None

class Trip(TripBase):
    id: int
    user_id: int
    host_id: int
    status: str
    current_participants: int
    created_at: datetime
    updated_at: datetime
    host: UserProfile
    creator: UserProfile
    
    class Config:
        from_attributes = True

class TripDetail(Trip):
    participants: List['TripParticipant']
    
class TripSummary(BaseModel):
    id: int
    title: str
    destination: str
    start_date: date
    end_date: date
    open_slots: int
    current_participants: int
    budget_min: Optional[Decimal]
    budget_max: Optional[Decimal]
    host: UserProfile
    
    class Config:
        from_attributes = True

# Trip request schemas
class TripRequestBase(BaseModel):
    message: Optional[str] = None

class TripRequestCreate(TripRequestBase):
    trip_id: int

class TripRequest(TripRequestBase):
    id: int
    trip_id: int
    user_id: int
    status: str
    created_at: datetime
    user: UserProfile
    trip: TripSummary
    
    class Config:
        from_attributes = True

class TripRequestUpdate(BaseModel):
    status: str  # accepted, rejected
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ['accepted', 'rejected']:
            raise ValueError('Status must be either accepted or rejected')
        return v

# Trip participant schemas
class TripParticipantBase(BaseModel):
    role: str = "participant"

class TripParticipant(TripParticipantBase):
    id: int
    trip_id: int
    user_id: int
    joined_at: datetime
    user: UserProfile
    
    class Config:
        from_attributes = True

# Chat schemas
class GroupChatBase(BaseModel):
    name: Optional[str] = None

class GroupChat(GroupChatBase):
    id: int
    trip_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    message: str
    message_type: str = "text"

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    chat_id: int
    user_id: int
    created_at: datetime
    user: UserProfile
    
    class Config:
        from_attributes = True

# Response schemas
class TripFeedResponse(BaseModel):
    trips: List[TripSummary]
    total: int
    page: int
    per_page: int

class RequestStatusUpdate(BaseModel):
    message: str
    request: TripRequest

# Update forward references
TripDetail.model_rebuild()