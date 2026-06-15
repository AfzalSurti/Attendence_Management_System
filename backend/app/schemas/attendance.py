from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class CheckInRequest(BaseModel):
    project_id: int
    latitude: float
    longitude: float
    selfie_url: str

class CheckOutRequest(BaseModel):
    latitude: float
    longitude: float
    selfie_url: str

class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    project_id: int
    date: date
    checkin_time: Optional[datetime] = None
    checkin_selfie_url: Optional[str] = None
    checkin_latitude: Optional[float] = None
    checkin_longitude: Optional[float] = None
    checkout_time: Optional[datetime] = None
    checkout_selfie_url: Optional[str] = None
    checkout_latitude: Optional[float] = None
    checkout_longitude: Optional[float] = None
    working_hours: Optional[float] = None

    class Config:
        from_attributes = True