from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List

from app.database import get_db
from app.models import Trip, TripParticipant, User
from app.schemas import TripParticipant as TripParticipantSchema
from app.auth import get_current_user

router = APIRouter()

@router.get("/trip/{trip_id}", response_model=List[TripParticipantSchema])
async def get_trip_participants(
    trip_id: int,
    db: Session = Depends(get_db)
):
    """Get all participants for a trip"""
    try:
        # Check if trip exists
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        participants = db.query(TripParticipant).options(
            joinedload(TripParticipant.user)
        ).filter(TripParticipant.trip_id == trip_id).all()
        
        return participants
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching participants: {str(e)}")

@router.delete("/trip/{trip_id}/user/{user_id}")
async def remove_participant(
    trip_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a participant from trip (by host) or leave trip (by participant)"""
    try:
        # Get trip and participant
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        participant = db.query(TripParticipant).filter(
            and_(
                TripParticipant.trip_id == trip_id,
                TripParticipant.user_id == user_id
            )
        ).first()
        
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Check permissions
        is_host = trip.host_id == current_user.id
        is_self = user_id == current_user.id
        
        if not (is_host or is_self):
            raise HTTPException(
                status_code=403, 
                detail="Can only remove yourself or be removed by host"
            )
        
        # Cannot remove host
        if participant.role == "host":
            raise HTTPException(status_code=400, detail="Cannot remove trip host")
        
        # Remove participant
        db.delete(participant)
        db.commit()
        
        action = "left" if is_self else "removed from"
        return {"message": f"Successfully {action} the trip"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error removing participant: {str(e)}")

@router.get("/user/my-participations", response_model=List[TripParticipantSchema])
async def get_user_participations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's trip participations"""
    try:
        participations = db.query(TripParticipant).options(
            joinedload(TripParticipant.user)
        ).filter(TripParticipant.user_id == current_user.id).all()
        
        return participations
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching participations: {str(e)}")