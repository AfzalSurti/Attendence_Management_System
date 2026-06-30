from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee, RoleEnum
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse, BulkImportResponse
from app.utils.auth import hash_password, decode_access_token
from app.services.bulk_import import parse_upload_file, import_employee_rows
from fastapi.security import OAuth2PasswordBearer
from typing import List

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

def require_developer(current_user: Employee = Depends(get_current_user)):
    if current_user.role.value not in ["developer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

# Create employee
@router.post("/", response_model=EmployeeResponse)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    # Check if mobile number already exists
    existing = db.query(Employee).filter(
        Employee.mobile_number == data.mobile_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    employee = Employee(
        name=data.name,
        mobile_number=data.mobile_number,
        password_hash=hash_password(data.password),
        role=RoleEnum.employee
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

# Get all employees
@router.get("/", response_model=List[EmployeeResponse])
def get_all_employees(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    return db.query(Employee).filter(Employee.role == RoleEnum.employee).all()

# Bulk import employees + projects from CSV/Excel (web admin portal)
@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import_employees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer),
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

    result = import_employee_rows(db, rows)
    return result

# Get single employee
@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

# Update employee
@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if data.name:
        employee.name = data.name
    if data.mobile_number:
        employee.mobile_number = data.mobile_number
    if data.password:
        employee.password_hash = hash_password(data.password)

    db.commit()
    db.refresh(employee)
    return employee

# Delete employee
@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_developer)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted successfully"}