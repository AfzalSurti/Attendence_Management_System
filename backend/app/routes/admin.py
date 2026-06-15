from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee, RoleEnum
from app.models.project import Project
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayCreate, HolidayResponse
from app.routes.employee import get_current_user
from typing import List, Optional
from datetime import date, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

def require_admin(current_user: Employee = Depends(get_current_user)):
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return current_user

# ── ATTENDANCE FILTERS ────────────────────────────────────────────────────────

@router.get("/attendance")
def get_all_attendance(
    employee_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    query = db.query(Attendance)

    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if project_id:
        query = query.filter(Attendance.project_id == project_id)
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
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    date_from = date.today() - timedelta(days=30)
    records = db.query(Attendance).filter(
        Attendance.date >= date_from
    ).order_by(Attendance.date.desc()).all()

    result = []
    for record in records:
        employee = db.query(Employee).filter(Employee.id == record.employee_id).first()
        project = db.query(Project).filter(Project.id == record.project_id).first()
        result.append({
            "employee_name": employee.name if employee else None,
            "mobile_number": employee.mobile_number if employee else None,
            "project_code": project.project_number if project else None,
            "project_name": project.project_name if project else None,
            "date": record.date,
            "checkin_time": record.checkin_time,
            "checkout_time": record.checkout_time,
            "working_hours": record.working_hours
        })
    return result

# ── HOLIDAY MANAGEMENT ────────────────────────────────────────────────────────

@router.post("/holidays", response_model=HolidayResponse)
def add_holiday(
    data: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
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
    current_user: Employee = Depends(require_admin)
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
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_admin)
):
    total_employees = db.query(Employee).filter(Employee.role == RoleEnum.employee).count()
    total_projects = db.query(Project).count()
    today_attendance = db.query(Attendance).filter(
        Attendance.date == date.today()
    ).count()

    return {
        "total_employees": total_employees,
        "total_projects": total_projects,
        "today_attendance": today_attendance
    }