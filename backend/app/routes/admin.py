from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee, RoleEnum
from app.models.project import Project
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayCreate, HolidayResponse
from app.routes.employee import get_current_user, require_manage_access
from typing import List, Optional
from datetime import date, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

def require_admin(current_user: Employee = Depends(get_current_user)):
    if current_user.role.value not in ["admin", "developer"]:
        raise HTTPException(status_code=403, detail="Admin access only")
    return current_user


def get_scoped_employee_ids(
    db: Session,
    current_user: Employee,
    admin_id: Optional[int] = None,
):
    query = db.query(Employee.id).filter(Employee.role == RoleEnum.employee)
    if current_user.role == RoleEnum.admin:
        query = query.filter(Employee.owner_admin_id == current_user.id)
    elif admin_id:
        query = query.filter(Employee.owner_admin_id == admin_id)
    return [row[0] for row in query.all()]


def get_scoped_project_ids(
    db: Session,
    current_user: Employee,
    admin_id: Optional[int] = None,
):
    query = db.query(Project.id)
    if current_user.role == RoleEnum.admin:
        query = query.filter(Project.owner_admin_id == current_user.id)
    elif admin_id:
        query = query.filter(Project.owner_admin_id == admin_id)
    return [row[0] for row in query.all()]

# ── ATTENDANCE FILTERS ────────────────────────────────────────────────────────

@router.get("/attendance")
def get_all_attendance(
    admin_id: Optional[int] = Query(None),
    employee_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    scoped_employee_ids = get_scoped_employee_ids(db, current_user, admin_id)
    scoped_project_ids = get_scoped_project_ids(db, current_user, admin_id)
    query = db.query(Attendance).filter(Attendance.employee_id.in_(scoped_employee_ids or [-1]))

    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if project_id:
        query = query.filter(Attendance.project_id == project_id)
    elif scoped_project_ids:
        query = query.filter(Attendance.project_id.in_(scoped_project_ids))
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)
    if month and year:
        query = query.filter(
            func.extract("month", Attendance.date) == month,
            func.extract("year", Attendance.date) == year
        )

    records = query.order_by(Attendance.date.desc()).all()

    result = []
    for record in records:
        employee = db.query(Employee).filter(Employee.id == record.employee_id).first()
        project = db.query(Project).filter(Project.id == record.project_id).first()
        result.append({
            "id": record.id,
            "employee_name": employee.name if employee else None,
            "mobile_number": employee.mobile_number if employee else None,
            "project_code": project.project_number if project else None,
            "project_name": project.project_name if project else None,
            "date": record.date,
            "checkin_time": record.checkin_time,
            "checkin_selfie_url": record.checkin_selfie_url,
            "checkin_latitude": record.checkin_latitude,
            "checkin_longitude": record.checkin_longitude,
            "checkout_time": record.checkout_time,
            "checkout_selfie_url": record.checkout_selfie_url,
            "checkout_latitude": record.checkout_latitude,
            "checkout_longitude": record.checkout_longitude,
            "working_hours": record.working_hours
        })
    return result

# 30 day report
@router.get("/attendance/30days")
def get_30_day_report(
    admin_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    date_from = date.today() - timedelta(days=30)
    records = db.query(Attendance).filter(
        Attendance.employee_id.in_(get_scoped_employee_ids(db, current_user, admin_id) or [-1]),
        Attendance.date >= date_from
    ).order_by(Attendance.date.desc()).all()

    result = []
    for record in records:
        employee = db.query(Employee).filter(Employee.id == record.employee_id).first()
        project = db.query(Project).filter(Project.id == record.project_id).first()
        result.append({
            "id": record.id,
            "employee_name": employee.name if employee else None,
            "mobile_number": employee.mobile_number if employee else None,
            "project_code": project.project_number if project else None,
            "project_name": project.project_name if project else None,
            "date": record.date,
            "checkin_time": record.checkin_time,
            "checkin_latitude": record.checkin_latitude,
            "checkin_longitude": record.checkin_longitude,
            "checkout_time": record.checkout_time,
            "checkout_latitude": record.checkout_latitude,
            "checkout_longitude": record.checkout_longitude,
            "working_hours": record.working_hours
        })
    return result

# ── HOLIDAY MANAGEMENT ────────────────────────────────────────────────────────

@router.post("/holidays", response_model=HolidayResponse)
def add_holiday(
    data: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
    existing = db.query(Holiday).filter(
        Holiday.holiday_date == data.holiday_date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Holiday already exists for this date")

    holiday = Holiday(
        holiday_date=data.holiday_date,
        holiday_name=data.holiday_name
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday

@router.get("/holidays", response_model=List[HolidayResponse])
def get_holidays(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    return db.query(Holiday).order_by(Holiday.holiday_date).all()

@router.delete("/holidays/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    db.delete(holiday)
    db.commit()
    return {"message": "Holiday deleted successfully"}

# ── OVERVIEW ──────────────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    admin_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    employee_ids = get_scoped_employee_ids(db, current_user, admin_id)
    project_ids = get_scoped_project_ids(db, current_user, admin_id)
    total_employees = len(employee_ids)
    total_projects = len(project_ids)
    today = date.today()
    today_attendance = db.query(Attendance).filter(
        Attendance.date == today,
        Attendance.employee_id.in_(employee_ids or [-1]),
    ).count()
    present_count = today_attendance
    absent_count = max(total_employees - present_count, 0)

    return {
        "total_employees": total_employees,
        "total_projects": total_projects,
        "today_attendance": today_attendance,
        "present_count": present_count,
        "absent_count": absent_count,
    }

@router.get("/today-attendance")
def get_today_attendance(
    admin_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    today = date.today()
    employees = (
        db.query(Employee)
        .filter(Employee.role == RoleEnum.employee)
        .filter(Employee.id.in_(get_scoped_employee_ids(db, current_user, admin_id) or [-1]))
        .order_by(Employee.name)
        .all()
    )
    records = db.query(Attendance).filter(
        Attendance.date == today,
        Attendance.employee_id.in_([employee.id for employee in employees] or [-1]),
    ).all()
    record_by_employee = {record.employee_id: record for record in records}

    present = []
    absent = []

    for employee in employees:
        record = record_by_employee.get(employee.id)
        if record:
            project = db.query(Project).filter(Project.id == record.project_id).first()
            present.append({
                "employee_id": employee.id,
                "name": employee.name,
                "mobile_number": employee.mobile_number,
                "project_code": project.project_number if project else None,
                "project_name": project.project_name if project else None,
                "checkin_time": record.checkin_time,
                "checkout_time": record.checkout_time,
                "working_hours": record.working_hours,
            })
        else:
            absent.append({
                "employee_id": employee.id,
                "name": employee.name,
                "mobile_number": employee.mobile_number,
            })

    total = len(employees)
    present_count = len(present)
    return {
        "date": today,
        "total_employees": total,
        "present_count": present_count,
        "absent_count": total - present_count,
        "present": present,
        "absent": absent,
    }

@router.put("/attendance/{attendance_id}")
def update_attendance(
    attendance_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_manage_access)
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")
    if current_user.role == RoleEnum.admin:
        employee = db.query(Employee).filter(Employee.id == attendance.employee_id).first()
        if not employee or employee.owner_admin_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied for this attendance record")
    if "checkin_time" in data:
        attendance.checkin_time = data["checkin_time"]
    if "checkout_time" in data:
        attendance.checkout_time = data["checkout_time"]
    if "working_hours" in data:
        attendance.working_hours = data["working_hours"]
    if "checkin_latitude" in data:
        attendance.checkin_latitude = data["checkin_latitude"]
    if "checkin_longitude" in data:
        attendance.checkin_longitude = data["checkin_longitude"]
    if "checkout_latitude" in data:
        attendance.checkout_latitude = data["checkout_latitude"]
    if "checkout_longitude" in data:
        attendance.checkout_longitude = data["checkout_longitude"]
    db.commit()
    db.refresh(attendance)
    return {"message": "Attendance updated successfully"}