from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class RoleEnum(str, enum.Enum):
    employee = "employee"
    developer = "developer"
    admin = "admin"

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    mobile_number = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.employee)
    owner_admin_id = Column(Integer, nullable=True)
    admin_permission = Column(String, nullable=True, default="full")
    created_at = Column(DateTime(timezone=True), server_default=func.now())