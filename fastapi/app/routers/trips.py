from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models import Trip, User, TripParticipant
from app.schemas import Trip as TripSchema, TripCreate, TripUpdate, TripFeedResponse, TripDetail, TripSummary
from app.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=TripSchema)
async def create_trip(
    trip_data: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new trip"""
    try:
        # Create new trip
        db_trip = Trip(
            **trip_data.dict(),
            user_id=current_user.id,
            host_id=current_user.id
        )
        
        db.add(db_trip)
        db.commit()
        db.refresh(db_trip)
        
        # Add host as participant
        host_participant = TripParticipant(
            trip_id=db_trip.id,
            user_id=current_user.id,
            role="host"
        )
        db.add(host_participant)
        db.commit()
        
        # Refresh to get relationships
        db.refresh(db_trip)
        return db_trip
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating trip: {str(e)}")

@router.get("/feed", response_model=TripFeedResponse)
async def get_trip_feed(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    destination: Optional[str] = Query(None),
    start_date_from: Optional[date] = Query(None),
    start_date_to: Optional[date] = Query(None),
    budget_min: Optional[float] = Query(None),
    budget_max: Optional[float] = Query(None),
    available_slots_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get paginated trip feed with filters"""
    try:
        # Build query
        query = db.query(Trip).options(
            joinedload(Trip.host),
            joinedload(Trip.creator)
        ).filter(Trip.status == "active")
        
        # Apply filters
        if destination:
            query = query.filter(Trip.destination.ilike(f"%{destination}%"))
        
        if start_date_from:
            query = query.filter(Trip.start_date >= start_date_from)
            
        if start_date_to:
            query = query.filter(Trip.start_date <= start_date_to)
        
        if budget_min is not None:
            query = query.filter(
                or_(Trip.budget_min.is_(None), Trip.budget_min >= budget_min)
            )
            
        if budget_max is not None:
            query = query.filter(
                or_(Trip.budget_max.is_(None), Trip.budget_max <= budget_max)
            )
        
        if available_slots_only:
            query = query.filter(Trip.current_participants < Trip.open_slots)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        trips = query.order_by(Trip.start_date.asc()).offset(
            (page - 1) * per_page
        ).limit(per_page).all()
        
        return TripFeedResponse(
            trips=trips,
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching trips: {str(e)}")

@router.get("/{trip_id}", response_model=TripDetail)
async def get_trip_details(
    trip_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed trip information"""
    trip = db.query(Trip).options(
        joinedload(Trip.host),
        joinedload(Trip.creator),
        joinedload(Trip.participants).joinedload(TripParticipant.user)
    ).filter(Trip.id == trip_id).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return trip

@router.get("/user/my-trips", response_model=List[TripSchema])
async def get_user_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's trips (both hosted and participating)"""
    try:
        # Get trips where user is host or participant
        hosted_trips = db.query(Trip).options(
            joinedload(Trip.host),
            joinedload(Trip.creator)
        ).filter(Trip.host_id == current_user.id).all()
        
        participant_trip_ids = db.query(TripParticipant.trip_id).filter(
            and_(
                TripParticipant.user_id == current_user.id,
                TripParticipant.role == "participant"
            )
        ).all()
        
        participating_trips = []
        if participant_trip_ids:
            trip_ids = [t[0] for t in participant_trip_ids]
            participating_trips = db.query(Trip).options(
                joinedload(Trip.host),
                joinedload(Trip.creator)
            ).filter(Trip.id.in_(trip_ids)).all()
        
        # Combine and remove duplicates
        all_trips = {trip.id: trip for trip in hosted_trips + participating_trips}
        return list(all_trips.values())
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching user trips: {str(e)}")

@router.put("/{trip_id}", response_model=TripSchema)
async def update_trip(
    trip_id: int,
    trip_update: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update trip details (only by host)"""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if trip.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only trip host can update trip details")
    
    try:
        # Update fields if provided
        update_data = trip_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(trip, field, value)
        
        db.commit()
        db.refresh(trip)
        return trip
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating trip: {str(e)}")

@router.delete("/{trip_id}")
async def cancel_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a trip (only by host)"""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if trip.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only trip host can cancel the trip")
    
    try:
        trip.status = "cancelled"
        db.commit()
        return {"message": "Trip cancelled successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error cancelling trip: {str(e)}")

@router.get("/search/destinations")
async def search_destinations(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db)
):
    """Search for destinations with autocomplete"""
    try:
        destinations = db.query(Trip.destination).filter(
            and_(
                Trip.destination.ilike(f"%{q}%"),
                Trip.status == "active"
            )
        ).distinct().limit(10).all()
        
        return {"destinations": [dest[0] for dest in destinations]}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error searching destinations: {str(e)}")