from pydantic import BaseModel
from typing import Optional, List

class ProjectCreate(BaseModel):
    project_number: str
    project_name: str

class ProjectUpdate(BaseModel):
    project_number: Optional[str] = None
    project_name: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    project_number: str
    project_name: str

    class Config:
        from_attributes = True

class AssignProject(BaseModel):
    employee_id: int
    project_id: int

class ProjectEmployeeInfo(BaseModel):
    id: int
    name: str
    mobile_number: str

class ProjectDetailResponse(BaseModel):
    id: int
    project_number: str
    project_name: str
    employee_count: int
    employees: List[ProjectEmployeeInfo]
