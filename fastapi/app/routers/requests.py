from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List

from app.database import get_db
from app.models import Trip, TripRequest, User, TripParticipant, GroupChat
from app.schemas import TripRequest as TripRequestSchema, TripRequestCreate, TripRequestUpdate, RequestStatusUpdate
from app.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=TripRequestSchema)
async def create_trip_request(
    request_data: TripRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request to join a trip"""
    try:
        # Check if trip exists and is active
        trip = db.query(Trip).filter(
            and_(Trip.id == request_data.trip_id, Trip.status == "active")
        ).first()
        
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found or not active")
        
        # Check if user is not the host
        if trip.host_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot request to join your own trip")
        
        # Check if user already requested or is already a participant
        existing_request = db.query(TripRequest).filter(
            and_(
                TripRequest.trip_id == request_data.trip_id,
                TripRequest.user_id == current_user.id
            )
        ).first()
        
        if existing_request:
            raise HTTPException(status_code=400, detail="Request already exists for this trip")
        
        existing_participant = db.query(TripParticipant).filter(
            and_(
                TripParticipant.trip_id == request_data.trip_id,
                TripParticipant.user_id == current_user.id
            )
        ).first()
        
        if existing_participant:
            raise HTTPException(status_code=400, detail="Already a participant in this trip")
        
        # Check if trip has available slots
        if trip.current_participants >= trip.open_slots:
            raise HTTPException(status_code=400, detail="No available slots for this trip")
        
        # Create request
        db_request = TripRequest(
            trip_id=request_data.trip_id,
            user_id=current_user.id,
            message=request_data.message
        )
        
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        
        # Load relationships for response
        db_request = db.query(TripRequest).options(
            joinedload(TripRequest.user),
            joinedload(TripRequest.trip).joinedload(Trip.host)
        ).filter(TripRequest.id == db_request.id).first()
        
        return db_request
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating request: {str(e)}")

@router.get("/trip/{trip_id}", response_model=List[TripRequestSchema])
async def get_trip_requests(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all requests for a trip (only by host)"""
    # Check if user is the host
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if trip.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only trip host can view requests")
    
    try:
        requests = db.query(TripRequest).options(
            joinedload(TripRequest.user),
            joinedload(TripRequest.trip).joinedload(Trip.host)
        ).filter(TripRequest.trip_id == trip_id).all()
        
        return requests
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching requests: {str(e)}")

@router.get("/user/my-requests", response_model=List[TripRequestSchema])
async def get_user_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's trip requests"""
    try:
        requests = db.query(TripRequest).options(
            joinedload(TripRequest.user),
            joinedload(TripRequest.trip).joinedload(Trip.host)
        ).filter(TripRequest.user_id == current_user.id).all()
        
        return requests
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching user requests: {str(e)}")

@router.put("/{request_id}", response_model=RequestStatusUpdate)
async def update_request_status(
    request_id: int,
    status_update: TripRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept or reject a trip request (only by host)"""
    try:
        # Get request with trip info
        request = db.query(TripRequest).options(
            joinedload(TripRequest.trip),
            joinedload(TripRequest.user)
        ).filter(TripRequest.id == request_id).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Check if user is the host
        if request.trip.host_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only trip host can update request status")
        
        # Check if request is still pending
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Request is no longer pending")
        
        # Check available slots if accepting
        if status_update.status == "accepted":
            if request.trip.current_participants >= request.trip.open_slots:
                raise HTTPException(status_code=400, detail="No available slots for this trip")
            
            # Create participant record
            participant = TripParticipant(
                trip_id=request.trip_id,
                user_id=request.user_id,
                role="participant"
            )
            db.add(participant)
        
        # Update request status
        request.status = status_update.status
        db.commit()
        
        # Reload request with all relationships
        request = db.query(TripRequest).options(
            joinedload(TripRequest.user),
            joinedload(TripRequest.trip).joinedload(Trip.host)
        ).filter(TripRequest.id == request_id).first()
        
        message = f"Request {status_update.status} successfully"
        return RequestStatusUpdate(message=message, request=request)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating request: {str(e)}")

@router.delete("/{request_id}")
async def delete_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a trip request (by requester only)"""
    request = db.query(TripRequest).filter(TripRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own requests")
    
    try:
        db.delete(request)
        db.commit()
        return {"message": "Request deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting request: {str(e)}")