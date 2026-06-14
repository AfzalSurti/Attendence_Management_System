from pydantic import BaseModel
from typing import Optional
from enum import Enum

class RoleEnum(str, Enum):
    employee = "employee"
    developer = "developer"
    admin = "admin"

class EmployeeCreate(BaseModel):
    name: str
    mobile_number: str
    password: str
    role: RoleEnum = RoleEnum.employee

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    mobile_number: Optional[str] = None
    password: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: int
    name: str
    mobile_number: str
    role: RoleEnum

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    mobile_number: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    employee_id: int
    name: str