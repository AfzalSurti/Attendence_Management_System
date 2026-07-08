from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project, EmployeeProject
from app.models.employee import Employee, RoleEnum
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, AssignProject,
    ProjectDetailResponse, ProjectEmployeeInfo,
)
from app.routes.employee import (
    get_current_user, require_admin_or_developer, require_manage_access,
    get_owner_admin_id,
)
from typing import List, Optional

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=ProjectResponse)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
    existing = db.query(Project).filter(
        Project.project_number == data.project_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project number already exists")

    owner_admin_id = get_owner_admin_id(db, current_user, data.admin_id)
    if current_user.role == RoleEnum.developer and owner_admin_id is None:
        raise HTTPException(status_code=400, detail="Select an admin account before creating projects")

    project = Project(
        project_number=data.project_number,
        project_name=data.project_name,
        owner_admin_id=owner_admin_id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/", response_model=List[ProjectResponse])
def get_all_projects(
    admin_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin_or_developer)
):
    query = db.query(Project)
    if current_user.role == RoleEnum.admin:
        query = query.filter(Project.owner_admin_id == current_user.id)
    elif admin_id:
        query = query.filter(Project.owner_admin_id == admin_id)
    return query.order_by(Project.project_name).all()

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

@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project_details(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin_or_developer)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role == RoleEnum.admin and project.owner_admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied for this project")

    assignments = db.query(EmployeeProject).filter(
        EmployeeProject.project_id == project_id
    ).all()

    employees = []
    for assignment in assignments:
        employee = db.query(Employee).filter(Employee.id == assignment.employee_id).first()
        if employee:
            employees.append(ProjectEmployeeInfo(
                id=employee.id,
                name=employee.name,
                mobile_number=employee.mobile_number,
            ))

    return ProjectDetailResponse(
        id=project.id,
        project_number=project.project_number,
        project_name=project.project_name,
        employee_count=len(employees),
        employees=employees,
    )

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role == RoleEnum.admin and project.owner_admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied for this project")

    if data.project_number:
        project.project_number = data.project_number
    if data.project_name:
        project.project_name = data.project_name

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role == RoleEnum.admin and project.owner_admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied for this project")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.post("/assign")
def assign_project(
    data: AssignProject,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
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
    if current_user.role == RoleEnum.admin:
        if employee.owner_admin_id != current_user.id or project.owner_admin_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied for this assignment")
    if employee.owner_admin_id and project.owner_admin_id and employee.owner_admin_id != project.owner_admin_id:
        raise HTTPException(status_code=400, detail="Employee and project belong to different admin accounts")

    assignment = EmployeeProject(
        employee_id=data.employee_id,
        project_id=data.project_id
    )
    db.add(assignment)
    db.commit()
    return {"message": "Project assigned successfully"}

@router.delete("/assign/{employee_id}/{project_id}")
def remove_assignment(
    employee_id: int,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
    assignment = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == employee_id,
        EmployeeProject.project_id == project_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if current_user.role == RoleEnum.admin:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        project = db.query(Project).filter(Project.id == project_id).first()
        if not employee or not project or employee.owner_admin_id != current_user.id or project.owner_admin_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied for this assignment")

    db.delete(assignment)
    db.commit()
    return {"message": "Project removed from employee successfully"}