from sqlalchemy import Column, Integer, String, Date, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    date = Column(Date, nullable=False)
    checkin_time = Column(DateTime(timezone=True), nullable=True)
    checkin_selfie_url = Column(String, nullable=True)
    checkin_latitude = Column(Float, nullable=True)
    checkin_longitude = Column(Float, nullable=True)
    checkout_time = Column(DateTime(timezone=True), nullable=True)
    checkout_selfie_url = Column(String, nullable=True)
    checkout_latitude = Column(Float, nullable=True)
    checkout_longitude = Column(Float, nullable=True)
    working_hours = Column(Float, nullable=True)