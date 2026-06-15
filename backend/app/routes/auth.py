from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import LoginRequest, TokenResponse
from app.utils.auth import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Find employee by mobile number
    employee = db.query(Employee).filter(
        Employee.mobile_number == request.mobile_number
    ).first()

    # Check if employee exists
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mobile number not found"
        )

    # Check password
    if not verify_password(request.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Create JWT token
    token = create_access_token(data={
        "sub": str(employee.id),
        "role": employee.role.value,
        "name": employee.name
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": employee.role.value,
        "employee_id": employee.id,
        "name": employee.name
    }