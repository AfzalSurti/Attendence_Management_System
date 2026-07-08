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
    admin_id: Optional[int] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    mobile_number: Optional[str] = None
    password: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: int
    name: str
    mobile_number: str
    role: RoleEnum
    owner_admin_id: Optional[int] = None
    admin_permission: Optional[str] = None

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
    admin_permission: Optional[str] = None

class AdminCreate(BaseModel):
    name: str
    mobile_number: str
    password: str
    admin_permission: str = "full"

class AdminResponse(BaseModel):
    id: int
    name: str
    mobile_number: str
    role: RoleEnum
    admin_permission: Optional[str] = None

    class Config:
        from_attributes = True

class BulkImportResponse(BaseModel):
    projects_created: int
    employees_created: int
    assignments_created: int
    rows_processed: int
    rows_skipped: int
    errors: list[str]