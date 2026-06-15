# Attendance Management System

A full-stack attendance management solution with a **FastAPI** backend and **React Native (Expo)** mobile app. Employees mark attendance with selfie + GPS location; developers manage employees and projects; admins view reports, holidays, and projects (read-only).

---

## Features

### Employee
- Login with 10-digit mobile number and password
- Mark **check-in** and **check-out** with:
  - Front-camera selfie (uploaded to Cloudinary)
  - GPS coordinates (latitude/longitude)
  - Project selection (only assigned projects)
- View today's attendance status on dashboard
- View attendance history with times, hours, and locations

### Developer
- Manage employees (create, edit, delete)
- View and edit employee attendance records (times, hours, coordinates)
- Manage projects (create, edit, delete, assign to employees)
- View project details with list of assigned employees

### Admin
- Dashboard overview (employees, projects, today's attendance)
- **Attendance Reports**
  - Browse all employees
  - Search by name or mobile
  - Filter by project (sorted project-wise)
  - Per-employee report with date filters (7 / 15 / 30 days, custom range)
  - Export filtered reports as **PDF** or **Excel** (CSV)
- **View Projects** (read-only) with assigned employees
- **Holiday Management** (add, view, delete holidays)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.13, FastAPI, SQLAlchemy, PostgreSQL (Neon) |
| Auth | JWT (python-jose), bcrypt password hashing |
| Mobile | React Native, Expo SDK 54, React Navigation |
| Storage | AsyncStorage (token/session) |
| Media | Cloudinary (unsigned upload preset for selfies) |
| Export | expo-print (PDF), CSV via expo-file-system + expo-sharing |

---

## Project Structure

```
Attendence_Management_System/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # DB connection & session
│   │   ├── models/              # SQLAlchemy models
│   │   ├── routes/              # API endpoints
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── utils/               # Auth helpers (JWT, bcrypt)
│   ├── .env.example             # Environment variable template
│   └── venv/                    # Python virtual environment
│
└── mobile/
    ├── App.js
    ├── app.json                 # Expo config & permissions
    ├── .env                     # Cloudinary public keys
    └── src/
        ├── navigation/          # AppNavigator (role-based routing)
        ├── screens/
        │   ├── auth/            # Login
        │   ├── employee/        # Dashboard, Attendance, History
        │   ├── developer/       # Employees, Projects, Attendance edit
        │   └── admin/           # Reports, Holidays, Projects (view)
        ├── services/            # API & Cloudinary clients
        └── utils/               # Storage, coordinates, export helpers
```

---

## Prerequisites

- **Python 3.11+** (tested on 3.13)
- **Node.js 18+** and npm
- **PostgreSQL** database (e.g. [Neon](https://neon.tech) serverless)
- **Expo Go** app on your phone (Android/iOS)
- **Cloudinary** account (free tier works for selfies)
- Phone and laptop on the **same Wi-Fi** network for local testing

---

## Backend Setup

### 1. Create virtual environment

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

> **Note:** Do not use `channel_binding=require` in the Neon connection string — it can cause SSL disconnects. The app uses `pool_pre_ping` and `pool_recycle` for stable Neon connections.

### 4. Run the API server

```powershell
cd backend
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000
```

- API root: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Use `--host 0.0.0.0` so your phone can reach the API over Wi-Fi

---

## Deploy Backend to Render

The repo includes `render.yaml` and `backend/requirements.txt` for one-click Render deployment.

### 1. Push code to GitHub

```powershell
git add .
git commit -m "Add Render deployment config and requirements.txt"
git push origin main
```

### 2. Create Render service

**Option A — Blueprint (recommended)**

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect repo: `AfzalSurti/Attendence_Management_System`
3. Render reads `render.yaml` and creates the web service
4. When prompted, paste your **Neon `DATABASE_URL`** for `DATABASE_URL`
5. Click **Apply**

**Option B — Manual Web Service**

1. **New** → **Web Service** → connect GitHub repo
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Environment variables:**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon PostgreSQL URL (`?sslmode=require`) |
| `SECRET_KEY` | Long random string (generate new — do not reuse leaked keys) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |

4. **Create Web Service**

### 3. Verify deployment

Your API URL will be like:

```
https://attendance-management-api.onrender.com
```

Test in browser:

- `https://YOUR-SERVICE.onrender.com/` → `{"message":"Attendance Management System API is running"}`
- `https://YOUR-SERVICE.onrender.com/docs` → Swagger UI

### 4. Update mobile app

In `mobile/src/services/api.js`, set:

```javascript
export const BASE_URL = 'https://YOUR-SERVICE.onrender.com';
```

Rebuild/restart Expo. Use **HTTPS** (not `http://`) for production.

> **Note:** Render free tier sleeps after ~15 min idle. First request after sleep may take 30–60 seconds (cold start).

---

## Mobile App Setup

### 1. Install dependencies

```powershell
cd mobile
npm install
```

### 2. Configure API URL

Edit `mobile/src/services/api.js` and set `BASE_URL` to your laptop's local IPv4 address:

```javascript
export const BASE_URL = 'http://YOUR_LAPTOP_IP:8000';
```

Find your IP on Windows:

```powershell
ipconfig
```

Look for **IPv4 Address** under your Wi-Fi adapter (e.g. `192.168.1.105`).

### 3. Configure Cloudinary

Create `mobile/.env`:

```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=attendance_selfies
```

In the [Cloudinary Dashboard](https://cloudinary.com/console):

1. Note your **Cloud name**
2. Go to **Settings → Upload → Upload presets**
3. Create an **unsigned** preset named `attendance_selfies`
4. Set folder (optional) and save

### 4. Start Expo

```powershell
cd mobile
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

> After changing `api.js` or `.env`, restart Expo. For Android, `usesCleartextTraffic: true` is already set in `app.json` for HTTP API calls.

---

## Test Accounts

| Role | Mobile | Password | Notes |
|------|--------|----------|-------|
| Admin | `0000000000` | `Admin@123` | Reports, holidays, view projects |
| Developer | `1111111111` | `Dev@123` | Manage employees & projects |
| Employee (Rajesh) | `2222222222` | `Emp@123` | Checked in today — can check out |
| Employee (Priya) | `3333333333` | `Emp@123` | Full day done today |
| Employee (Amit) | `4444444444` | `Emp@123` | No attendance today — can check in |

### Seed Projects

| Code | Name |
|------|------|
| PRJ-001 | Site Office Building |
| PRJ-002 | Highway Bridge Phase 2 |
| PRJ-003 | Residential Complex A |

---

## API Endpoints (Summary)

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with mobile + password |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/employees/` | List / create employees (developer) |
| GET/PUT/DELETE | `/employees/{id}` | Get / update / delete employee |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/projects/` | List / create projects |
| GET | `/projects/my-projects` | Employee's assigned projects |
| GET | `/projects/{id}` | Project details + assigned employees |
| POST | `/projects/assign` | Assign project to employee |
| DELETE | `/projects/assign/{employee_id}/{project_id}` | Remove assignment |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attendance/checkin` | Check in (project, selfie URL, lat/lng) |
| POST | `/attendance/checkout` | Check out (selfie URL, lat/lng) |
| GET | `/attendance/today` | Today's attendance for logged-in employee |
| GET | `/attendance/my-history` | Employee attendance history |

### Admin (admin + developer access)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/attendance` | Filter attendance (employee, project, date range) |
| GET | `/admin/attendance/30days` | Last 30 days report |
| PUT | `/admin/attendance/{id}` | Update attendance record |
| GET | `/admin/overview` | Dashboard stats |
| GET/POST/DELETE | `/admin/holidays` | Holiday management |

All protected routes require `Authorization: Bearer <token>` header.

---

## Role Permissions

| Action | Employee | Developer | Admin |
|--------|----------|-----------|-------|
| Mark attendance | ✅ | ❌ | ❌ |
| View own history | ✅ | ❌ | ❌ |
| Manage employees | ❌ | ✅ | ❌ |
| Manage projects | ❌ | ✅ | ❌ |
| Edit attendance | ❌ | ✅ | ✅ |
| View all reports | ❌ | ✅ | ✅ |
| Export PDF/Excel | ❌ | ❌ | ✅ |
| Manage holidays | ❌ | ✅ | ✅ |
| View projects | ❌ | ✅ (full) | ✅ (read-only) |

---

## Troubleshooting

### "Cannot reach server" on phone
- Backend must run with `--host 0.0.0.0 --port 8000`
- `BASE_URL` in `api.js` must be your laptop IP, not `localhost`
- Phone and laptop must be on the same Wi-Fi
- Windows Firewall may block port 8000 — allow Python/uvicorn if needed

### "Admin access only" for developer
- Usually caused by a **stale uvicorn process** serving old code
- Stop all servers on port 8000 and restart once:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
cd backend
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000
```

### SSL / database connection errors
- Ensure `DATABASE_URL` uses `sslmode=require` without `channel_binding=require`
- `pool_pre_ping=True` is already configured in `database.py`

### Selfie upload fails
- Verify Cloudinary unsigned preset `attendance_selfies` exists
- Check `EXPO_PUBLIC_*` vars in `mobile/.env` and restart Expo

### Location not stored
- Grant location permission when prompted
- Enable GPS on the phone
- Coordinates are saved on check-in/check-out; checkout coords appear only after check-out

### Only one uvicorn instance
- Run **one** backend server on port 8000. Multiple processes can serve outdated code.

---

## Development Notes

- Tables are auto-created on startup via `Base.metadata.create_all()` in `main.py`
- Passwords are hashed with bcrypt (not passlib)
- Attendance datetimes are stored in UTC
- Check-in is blocked on holidays defined in the admin panel
- Employees can only check in to projects assigned to them
- Excel export generates `.csv` files compatible with Microsoft Excel

---

## License

Private / educational project. All rights reserved.
