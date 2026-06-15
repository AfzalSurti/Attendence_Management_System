from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.attendance import Attendance
from app.models.holiday import Holiday
from app.models.employee import Employee
from app.schemas.attendance import CheckInRequest, CheckOutRequest, AttendanceResponse
from app.models.project import EmployeeProject
from app.routes.employee import get_current_user
from typing import List
from datetime import datetime, date, timezone

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# Check In
@router.post("/checkin", response_model=AttendanceResponse)
def check_in(
    data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    today = date.today()

    # Check if today is a holiday
    holiday = db.query(Holiday).filter(Holiday.holiday_date == today).first()
    if holiday:
        raise HTTPException(status_code=400, detail=f"Today is a holiday: {holiday.holiday_name}")

    # Check if already checked in today
    existing = db.query(Attendance).filter(
        Attendance.employee_id == current_user.id,
        Attendance.date == today
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")

    assignment = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == current_user.id,
        EmployeeProject.project_id == data.project_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=400, detail="Project is not assigned to you")

    attendance = Attendance(
        employee_id=current_user.id,
        project_id=data.project_id,
        date=today,
        checkin_time=datetime.now(timezone.utc),
        checkin_selfie_url=data.selfie_url,
        checkin_latitude=data.latitude,
        checkin_longitude=data.longitude
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

# Check Out
@router.post("/checkout", response_model=AttendanceResponse)
def check_out(
    data: CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    today = date.today()

    # Find today's attendance
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == current_user.id,
        Attendance.date == today
    ).first()

    if not attendance:
        raise HTTPException(status_code=400, detail="You have not checked in today")

    if attendance.checkout_time:
        raise HTTPException(status_code=400, detail="Already checked out today")

    checkout_time = datetime.now(timezone.utc)

    checkin_time = attendance.checkin_time
    if checkin_time.tzinfo is None:
        checkin_time = checkin_time.replace(tzinfo=timezone.utc)

    # Calculate working hours
    working_hours = round(
        (checkout_time - checkin_time).total_seconds() / 3600, 2
    )

    attendance.checkout_time = checkout_time
    attendance.checkout_selfie_url = data.selfie_url
    attendance.checkout_latitude = data.latitude
    attendance.checkout_longitude = data.longitude
    attendance.working_hours = working_hours

    db.commit()
    db.refresh(attendance)
    return attendance

# Get my attendance history
@router.get("/my-history", response_model=List[AttendanceResponse])
def my_attendance_history(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    return db.query(Attendance).filter(
        Attendance.employee_id == current_user.id
    ).order_by(Attendance.date.desc()).all()

# Get today's attendance status
@router.get("/today", response_model=AttendanceResponse)
def today_attendance(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    today = date.today()
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == current_user.id,
        Attendance.date == today
    ).first()

    if not attendance:
        raise HTTPException(status_code=404, detail="No attendance found for today")

    return attendance