from pydantic import BaseModel
from datetime import date

class HolidayCreate(BaseModel):
    holiday_date: date
    holiday_name: str

class HolidayResponse(BaseModel):
    id: int
    holiday_date: date
    holiday_name: str

    class Config:
        from_attributes = True