from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc
from typing import List

from app.database import get_db
from app.models import Trip, GroupChat, ChatMessage, User, TripParticipant
from app.schemas import GroupChat as GroupChatSchema, ChatMessage as ChatMessageSchema, ChatMessageCreate
from app.auth import get_current_user

router = APIRouter()

@router.get("/trip/{trip_id}", response_model=GroupChatSchema)
async def get_trip_chat(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get group chat for a trip"""
    try:
        # Check if user is participant
        participant = db.query(TripParticipant).filter(
            and_(
                TripParticipant.trip_id == trip_id,
                TripParticipant.user_id == current_user.id
            )
        ).first()
        
        if not participant:
            raise HTTPException(status_code=403, detail="Only trip participants can access chat")
        
        # Get or create group chat
        chat = db.query(GroupChat).filter(GroupChat.trip_id == trip_id).first()
        
        if not chat:
            # Create group chat if it doesn't exist
            trip = db.query(Trip).filter(Trip.id == trip_id).first()
            chat = GroupChat(
                trip_id=trip_id,
                name=f"Trip to {trip.destination}"
            )
            db.add(chat)
            db.commit()
            db.refresh(chat)
        
        return chat
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error getting chat: {str(e)}")

@router.get("/{chat_id}/messages", response_model=List[ChatMessageSchema])
async def get_chat_messages(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get chat messages with pagination"""
    try:
        # Check if user has access to this chat
        chat = db.query(GroupChat).filter(GroupChat.id == chat_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        participant = db.query(TripParticipant).filter(
            and_(
                TripParticipant.trip_id == chat.trip_id,
                TripParticipant.user_id == current_user.id
            )
        ).first()
        
        if not participant:
            raise HTTPException(status_code=403, detail="Access denied to this chat")
        
        # Get messages with pagination
        messages = db.query(ChatMessage).options(
            joinedload(ChatMessage.user)
        ).filter(
            ChatMessage.chat_id == chat_id
        ).order_by(
            desc(ChatMessage.created_at)
        ).offset(
            (page - 1) * per_page
        ).limit(per_page).all()
        
        # Reverse to get chronological order
        messages.reverse()
        
        return messages
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching messages: {str(e)}")

@router.post("/{chat_id}/messages", response_model=ChatMessageSchema)
async def send_message(
    chat_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to group chat"""
    try:
        # Check if user has access to this chat
        chat = db.query(GroupChat).filter(GroupChat.id == chat_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        participant = db.query(TripParticipant).filter(
            and_(
                TripParticipant.trip_id == chat.trip_id,
                TripParticipant.user_id == current_user.id
            )
        ).first()
        
        if not participant:
            raise HTTPException(status_code=403, detail="Access denied to this chat")
        
        # Create message
        db_message = ChatMessage(
            chat_id=chat_id,
            user_id=current_user.id,
            message=message_data.message,
            message_type=message_data.message_type
        )
        
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        
        # Load user relationship
        db_message = db.query(ChatMessage).options(
            joinedload(ChatMessage.user)
        ).filter(ChatMessage.id == db_message.id).first()
        
        return db_message
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error sending message: {str(e)}")

@router.get("/user/my-chats", response_model=List[GroupChatSchema])
async def get_user_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all chats for current user"""
    try:
        # Get trip IDs where user is participant
        participant_trips = db.query(TripParticipant.trip_id).filter(
            TripParticipant.user_id == current_user.id
        ).subquery()
        
        # Get chats for those trips
        chats = db.query(GroupChat).filter(
            GroupChat.trip_id.in_(participant_trips)
        ).all()
        
        return chats
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching user chats: {str(e)}")