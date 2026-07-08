from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee, RoleEnum
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, BulkImportResponse,
    AdminCreate, AdminResponse,
)
from app.utils.auth import hash_password, decode_access_token
from app.services.bulk_import import parse_upload_file, import_employee_rows
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
import re

router = APIRouter(prefix="/employees", tags=["Employees"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    employee = db.query(Employee).filter(Employee.id == int(payload["sub"])).first()
    if not employee:
        raise HTTPException(status_code=404, detail="User not found")
    return employee


def require_admin_or_developer(current_user: Employee = Depends(get_current_user)):
    if current_user.role.value not in ["developer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


def require_manage_access(current_user: Employee = Depends(get_current_user)):
    user = require_admin_or_developer(current_user)
    if current_user.role == RoleEnum.admin and current_user.admin_permission == "read_only":
        raise HTTPException(status_code=403, detail="Read-only admin cannot modify data")
    return user


def require_developer_only(current_user: Employee = Depends(get_current_user)):
    if current_user.role != RoleEnum.developer:
        raise HTTPException(status_code=403, detail="Developer access required")
    return current_user


def normalize_mobile(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def get_owner_admin_id(
    db: Session,
    current_user: Employee,
    requested_admin_id: Optional[int] = None,
) -> Optional[int]:
    if current_user.role == RoleEnum.admin:
        return current_user.id
    if requested_admin_id is None:
        return None
    admin = db.query(Employee).filter(
        Employee.id == requested_admin_id,
        Employee.role == RoleEnum.admin,
    ).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin account not found")
    return admin.id


def apply_employee_scope(query, current_user: Employee, admin_id: Optional[int] = None):
    if current_user.role == RoleEnum.admin:
        return query.filter(Employee.owner_admin_id == current_user.id)
    if admin_id:
        return query.filter(Employee.owner_admin_id == admin_id)
    return query


def ensure_employee_access(employee: Employee, current_user: Employee):
    if current_user.role == RoleEnum.admin and employee.owner_admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied for this employee")


@router.post("/admins", response_model=AdminResponse)
def create_admin(
    data: AdminCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer_only),
):
    clean_name = data.name.strip()
    clean_mobile = normalize_mobile(data.mobile_number)
    clean_permission = (data.admin_permission or "full").strip().lower()

    if not clean_name:
        raise HTTPException(status_code=400, detail="Admin name is required")
    if not re.fullmatch(r"\d{10}", clean_mobile):
        raise HTTPException(status_code=400, detail="Mobile number must be exactly 10 digits")
    if len(data.password or "") < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if clean_permission not in {"full", "read_only"}:
        raise HTTPException(status_code=400, detail="Admin permission must be full or read_only")

    existing = db.query(Employee).filter(Employee.mobile_number == clean_mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    admin = Employee(
        name=clean_name,
        mobile_number=clean_mobile,
        password_hash=hash_password(data.password),
        role=RoleEnum.admin,
        admin_permission=clean_permission,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.get("/admins", response_model=List[AdminResponse])
def get_admins(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer_only),
):
    return (
        db.query(Employee)
        .filter(Employee.role == RoleEnum.admin)
        .order_by(Employee.name)
        .all()
    )


@router.post("/", response_model=EmployeeResponse)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access),
):
    clean_name = data.name.strip()
    clean_mobile = normalize_mobile(data.mobile_number)
    if not clean_name:
        raise HTTPException(status_code=400, detail="Employee name is required")
    if not re.fullmatch(r"\d{10}", clean_mobile):
        raise HTTPException(status_code=400, detail="Mobile number must be exactly 10 digits")
    if len(data.password or "") < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.query(Employee).filter(Employee.mobile_number == clean_mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    owner_admin_id = get_owner_admin_id(db, current_user, data.admin_id)
    if current_user.role == RoleEnum.developer and owner_admin_id is None:
        raise HTTPException(status_code=400, detail="Select an admin account before creating employees")

    employee = Employee(
        name=clean_name,
        mobile_number=clean_mobile,
        password_hash=hash_password(data.password),
        role=RoleEnum.employee,
        owner_admin_id=owner_admin_id,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.get("/", response_model=List[EmployeeResponse])
def get_all_employees(
    admin_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin_or_developer),
):
    query = db.query(Employee).filter(Employee.role == RoleEnum.employee)
    query = apply_employee_scope(query, current_user, admin_id)
    return query.order_by(Employee.name).all()


@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import_employees(
    file: UploadFile = File(...),
    admin_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        rows = parse_upload_file(file.filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not rows:
        raise HTTPException(status_code=400, detail="No data rows found in file")

    owner_admin_id = get_owner_admin_id(db, current_user, admin_id)
    if current_user.role == RoleEnum.developer and owner_admin_id is None:
        raise HTTPException(status_code=400, detail="Select an admin account before bulk import")

    result = import_employee_rows(db, rows, owner_admin_id=owner_admin_id)
    return result


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin_or_developer),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee or employee.role != RoleEnum.employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    ensure_employee_access(employee, current_user)
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee or employee.role != RoleEnum.employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    ensure_employee_access(employee, current_user)

    if data.name:
        employee.name = data.name.strip()
    if data.mobile_number:
        clean_mobile = normalize_mobile(data.mobile_number)
        if not re.fullmatch(r"\d{10}", clean_mobile):
            raise HTTPException(status_code=400, detail="Mobile number must be exactly 10 digits")
        existing = db.query(Employee).filter(
            Employee.mobile_number == clean_mobile,
            Employee.id != employee_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Mobile number already registered")
        employee.mobile_number = clean_mobile
    if data.password:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        employee.password_hash = hash_password(data.password)

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee or employee.role != RoleEnum.employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    ensure_employee_access(employee, current_user)

    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted successfully"}