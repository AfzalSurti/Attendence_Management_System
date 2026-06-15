from pydantic import BaseModel
from typing import Optional

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