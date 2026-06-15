from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, employee, project, attendance, admin

# Create all tables in database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Attendance Management System", version="1.0.0")

# CORS - allows mobile app to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(auth.router)
app.include_router(employee.router)
app.include_router(project.router)
app.include_router(attendance.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Attendance Management System API is running"}