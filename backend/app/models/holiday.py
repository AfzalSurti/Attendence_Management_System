from sqlalchemy import Column, Integer, String, Date
from app.database import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    holiday_date = Column(Date, unique=True, nullable=False)
    holiday_name = Column(String, nullable=False)