from typing import Optional, Dict, Any
from datetime import datetime, date
import json

class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder for datetime objects"""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def calculate_trip_duration(start_date: date, end_date: date) -> int:
    """Calculate trip duration in days"""
    return (end_date - start_date).days + 1

def format_budget_range(budget_min: Optional[float], budget_max: Optional[float]) -> str:
    """Format budget range as string"""
    if budget_min and budget_max:
        return f"₹{budget_min:,.0f} - ₹{budget_max:,.0f}"
    elif budget_min:
        return f"₹{budget_min:,.0f}+"
    elif budget_max:
        return f"Up to ₹{budget_max:,.0f}"
    else:
        return "Budget not specified"

def validate_trip_dates(start_date: date, end_date: date) -> bool:
    """Validate trip dates"""
    if end_date <= start_date:
        return False
    if start_date < date.today():
        return False
    return True

def build_trip_filters(
    destination: Optional[str] = None,
    start_date_from: Optional[date] = None,
    start_date_to: Optional[date] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    preferences: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Build filter dictionary for trip queries"""
    filters = {}
    
    if destination:
        filters['destination'] = destination
    if start_date_from:
        filters['start_date_from'] = start_date_from
    if start_date_to:
        filters['start_date_to'] = start_date_to
    if budget_min:
        filters['budget_min'] = budget_min
    if budget_max:
        filters['budget_max'] = budget_max
    if preferences:
        filters['preferences'] = preferences
    
    return filters