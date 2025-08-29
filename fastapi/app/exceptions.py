from fastapi import HTTPException, status

class TripNectException(Exception):
    """Base exception for TripNect application"""
    pass

class TripNotFoundError(TripNectException):
    """Trip not found error"""
    def __init__(self, trip_id: int):
        self.trip_id = trip_id
        super().__init__(f"Trip with id {trip_id} not found")

class RequestNotFoundError(TripNectException):
    """Request not found error"""
    def __init__(self, request_id: int):
        self.request_id = request_id
        super().__init__(f"Request with id {request_id} not found")

class AccessDeniedError(TripNectException):
    """Access denied error"""
    def __init__(self, message: str = "Access denied"):
        self.message = message
        super().__init__(message)

class TripFullError(TripNectException):
    """Trip is full error"""
    def __init__(self):
        super().__init__("Trip has no available slots")

class InvalidTripDatesError(TripNectException):
    """Invalid trip dates error"""
    def __init__(self):
        super().__init__("Trip dates are invalid")

# HTTP Exception helpers
def trip_not_found_exception(trip_id: int):
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Trip with id {trip_id} not found"
    )

def access_denied_exception(message: str = "Access denied"):
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message
    )

def bad_request_exception(message: str):
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=message
    )

def unauthorized_exception(message: str = "Authentication required"):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"}
    )