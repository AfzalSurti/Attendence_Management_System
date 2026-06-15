from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project, EmployeeProject
from app.models.employee import Employee
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, AssignProject
from app.routes.employee import get_current_user, require_developer
from typing import List

router = APIRouter(prefix="/projects", tags=["Projects"])

# Create project
@router.post("/", response_model=ProjectResponse)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    existing = db.query(Project).filter(
        Project.project_number == data.project_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project number already exists")

    project = Project(
        project_number=data.project_number,
        project_name=data.project_name
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

# Get all projects
@router.get("/", response_model=List[ProjectResponse])
def get_all_projects(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    return db.query(Project).all()

# Get projects assigned to a specific employee
@router.get("/my-projects", response_model=List[ProjectResponse])
def get_my_projects(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    assignments = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == current_user.id
    ).all()
    project_ids = [a.project_id for a in assignments]
    return db.query(Project).filter(Project.id.in_(project_ids)).all()

# Update project
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.project_number:
        project.project_number = data.project_number
    if data.project_name:
        project.project_name = data.project_name

    db.commit()
    db.refresh(project)
    return project

# Delete project
@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

# Assign project to employee
@router.post("/assign")
def assign_project(
    data: AssignProject,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    # Check if already assigned
    existing = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == data.employee_id,
        EmployeeProject.project_id == data.project_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project already assigned to this employee")

    employee = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assignment = EmployeeProject(
        employee_id=data.employee_id,
        project_id=data.project_id
    )
    db.add(assignment)
    db.commit()
    return {"message": "Project assigned successfully"}

# Remove project assignment from employee
@router.delete("/assign/{employee_id}/{project_id}")
def remove_assignment(
    employee_id: int,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    assignment = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == employee_id,
        EmployeeProject.project_id == project_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    db.delete(assignment)
    db.commit()
    return {"message": "Project removed from employee successfully"}