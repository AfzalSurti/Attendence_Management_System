"""
Seed the database with test data for end-to-end testing.

Usage (from backend folder):
    venv\\Scripts\\python seed.py
"""
from datetime import date, datetime, timedelta, timezone

from app.database import SessionLocal, engine, Base
from app.models.employee import Employee, RoleEnum
from app.models.project import Project, EmployeeProject
from app.models.attendance import Attendance
from app.models.holiday import Holiday
from app.utils.auth import hash_password

# Import models so create_all registers all tables
import app.models.employee  # noqa: F401
import app.models.project  # noqa: F401
import app.models.attendance  # noqa: F401
import app.models.holiday  # noqa: F401


USERS = [
    {"name": "Admin", "mobile": "0000000000", "password": "Admin@123", "role": RoleEnum.admin},
    {"name": "Developer", "mobile": "1111111111", "password": "Dev@123", "role": RoleEnum.developer},
    {"name": "Rajesh Kumar", "mobile": "2222222222", "password": "Emp@123", "role": RoleEnum.employee},
    {"name": "Priya Sharma", "mobile": "3333333333", "password": "Emp@123", "role": RoleEnum.employee},
    {"name": "Amit Patel", "mobile": "4444444444", "password": "Emp@123", "role": RoleEnum.employee},
]

PROJECTS = [
    {"number": "PRJ-001", "name": "Site Office Building"},
    {"number": "PRJ-002", "name": "Highway Bridge Phase 2"},
    {"number": "PRJ-003", "name": "Residential Complex A"},
]

HOLIDAYS = [
    {"date": date(2026, 1, 26), "name": "Republic Day"},
    {"date": date(2026, 8, 15), "name": "Independence Day"},
    {"date": date(2026, 10, 2), "name": "Gandhi Jayanti"},
]


def get_or_create_employee(db, name, mobile, password, role):
    employee = db.query(Employee).filter(Employee.mobile_number == mobile).first()
    if employee:
        employee.name = name
        employee.password_hash = hash_password(password)
        employee.role = role
        return employee

    employee = Employee(
        name=name,
        mobile_number=mobile,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(employee)
    db.flush()
    return employee


def get_or_create_project(db, number, name):
    project = db.query(Project).filter(Project.project_number == number).first()
    if project:
        project.project_name = name
        return project

    project = Project(project_number=number, project_name=name)
    db.add(project)
    db.flush()
    return project


def assign_if_missing(db, employee_id, project_id):
    exists = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == employee_id,
        EmployeeProject.project_id == project_id,
    ).first()
    if not exists:
        db.add(EmployeeProject(employee_id=employee_id, project_id=project_id))


def seed_attendance(db, employees, projects):
    today = date.today()
    rajesh = employees["2222222222"]
    priya = employees["3333333333"]
    amit = employees["4444444444"]
    prj1 = projects["PRJ-001"]
    prj2 = projects["PRJ-002"]
    prj3 = projects["PRJ-003"]

    # Past 5 working days — completed attendance
    for days_ago in range(5, 0, -1):
        att_date = today - timedelta(days=days_ago)
        if att_date.weekday() >= 5:
            continue

        for emp, prj in [(rajesh, prj1), (priya, prj2), (amit, prj3)]:
            existing = db.query(Attendance).filter(
                Attendance.employee_id == emp.id,
                Attendance.date == att_date,
            ).first()
            if existing:
                continue

            checkin = datetime.combine(att_date, datetime.min.time()).replace(
                hour=9, minute=0, tzinfo=timezone.utc
            )
            checkout = datetime.combine(att_date, datetime.min.time()).replace(
                hour=18, minute=0, tzinfo=timezone.utc
            )
            db.add(Attendance(
                employee_id=emp.id,
                project_id=prj.id,
                date=att_date,
                checkin_time=checkin,
                checkout_time=checkout,
                checkin_selfie_url="https://placehold.co/200x200?text=CheckIn",
                checkout_selfie_url="https://placehold.co/200x200?text=CheckOut",
                checkin_latitude=19.0760,
                checkin_longitude=72.8777,
                checkout_latitude=19.0760,
                checkout_longitude=72.8777,
                working_hours=9.0,
            ))

    # Today — Rajesh checked in only (test checkout flow)
    if not db.query(Attendance).filter(
        Attendance.employee_id == rajesh.id,
        Attendance.date == today,
    ).first():
        db.add(Attendance(
            employee_id=rajesh.id,
            project_id=prj1.id,
            date=today,
            checkin_time=datetime.combine(today, datetime.min.time()).replace(
                hour=9, minute=15, tzinfo=timezone.utc
            ),
            checkin_selfie_url="https://placehold.co/200x200?text=Today+In",
            checkin_latitude=19.0760,
            checkin_longitude=72.8777,
        ))

    # Today — Priya full day completed
    if not db.query(Attendance).filter(
        Attendance.employee_id == priya.id,
        Attendance.date == today,
    ).first():
        db.add(Attendance(
            employee_id=priya.id,
            project_id=prj2.id,
            date=today,
            checkin_time=datetime.combine(today, datetime.min.time()).replace(
                hour=9, minute=0, tzinfo=timezone.utc
            ),
            checkout_time=datetime.combine(today, datetime.min.time()).replace(
                hour=17, minute=30, tzinfo=timezone.utc
            ),
            checkin_selfie_url="https://placehold.co/200x200?text=Priya+In",
            checkout_selfie_url="https://placehold.co/200x200?text=Priya+Out",
            checkin_latitude=19.0800,
            checkin_longitude=72.8800,
            checkout_latitude=19.0800,
            checkout_longitude=72.8800,
            working_hours=8.5,
        ))


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding database...")

        employees = {}
        for u in USERS:
            emp = get_or_create_employee(db, u["name"], u["mobile"], u["password"], u["role"])
            employees[u["mobile"]] = emp
            print(f"  User: {u['role'].value:10} | {u['mobile']} | {u['password']}")

        projects = {}
        for p in PROJECTS:
            proj = get_or_create_project(db, p["number"], p["name"])
            projects[p["number"]] = proj
            print(f"  Project: {p['number']} — {p['name']}")

        # Assignments
        assign_if_missing(db, employees["2222222222"].id, projects["PRJ-001"].id)
        assign_if_missing(db, employees["2222222222"].id, projects["PRJ-002"].id)
        assign_if_missing(db, employees["3333333333"].id, projects["PRJ-002"].id)
        assign_if_missing(db, employees["4444444444"].id, projects["PRJ-003"].id)
        print("  Project assignments created")

        for h in HOLIDAYS:
            holiday = db.query(Holiday).filter(Holiday.holiday_date == h["date"]).first()
            if not holiday:
                db.add(Holiday(holiday_date=h["date"], holiday_name=h["name"]))
        print(f"  Holidays: {len(HOLIDAYS)} entries")

        seed_attendance(db, employees, projects)
        print("  Attendance history seeded")

        db.commit()
        print("\nSeed complete! Use these accounts to test:\n")
        print("  ADMIN     | 0000000000 | Admin@123")
        print("  DEVELOPER | 1111111111 | Dev@123")
        print("  EMPLOYEE  | 2222222222 | Emp@123  (Rajesh — checked in today, can checkout)")
        print("  EMPLOYEE  | 3333333333 | Emp@123  (Priya — full day done today)")
        print("  EMPLOYEE  | 4444444444 | Emp@123  (Amit — no attendance today, can check in)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
