# NER-LOGIX FastAPI Backend Foundation

**Smart India Hackathon 2026 — Problem Statement SIH26002 (MDoNER)**  
*AI-Based Smart Logistics & Accessibility Intelligence Platform for the North Eastern Region*

---

## 1. Backend Purpose

The NER-LOGIX backend provides an additive REST API foundation designed to complement the client-side operational engine. It establishes:
- Standardized API schemas (Pydantic v2) for multi-corridor trips, fleet telemetry, field hazard reporting, and emergency logistics.
- An extensible database abstraction layer ready for future PostgreSQL / PostGIS spatial deployment.
- Health monitoring and capability probing endpoints enabling the React frontend to detect live backend connectivity dynamically without creating a single point of failure.

---

## 2. Target Architecture

```
                    ┌────────────────────────────┐
                    │      FastAPI Backend       │
                    │   (Port 8000 / Uvicorn)    │
                    └─────────────┬──────────────┘
                                  │
React Frontend                    │
      │                           ▼
      ▼                   Future PostgreSQL
Central API Boundary ──►  + PostGIS Engine
      │
      ▼ (Graceful Fallback)
Deterministic Local Engine
      │
      ▼
Zustand + IndexedDB Cache
```

### Safety & Presentation Resilience
- **Backend Available:** Frontend detects live backend via `/health` probe and uses live API services.
- **Backend Unavailable / Stopped:** Frontend seamlessly falls back to the deterministic local engine (Zustand + IndexedDB).
- **Network Offline:** Service Worker and IndexedDB continue functioning without throwing uncaught errors.

---

## 3. Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application entry point & CORS configuration
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py               # Pydantic Settings & environment variables
│   ├── db/
│   │   ├── __init__.py
│   │   └── session.py              # Database engine & session generator (graceful fallback)
│   ├── models/
│   │   ├── __init__.py
│   │   └── spatial.py              # SQLAlchemy ORM models for PostgreSQL/PostGIS
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── health.py               # Health & system status schemas
│   │   ├── vehicle.py              # Fleet telemetry & vehicle schemas
│   │   ├── trip.py                 # Multi-corridor trip & candidate route schemas
│   │   ├── incident.py             # Hazard reporting & SDMA verification schemas
│   │   ├── road.py                 # Corridor segment status schemas
│   │   ├── weather.py              # Weather telemetry schemas
│   │   └── emergency.py            # Godown buffer & pickup request schemas
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py         # Router aggregation
│   │       ├── health.py           # GET /health & GET /api/v1/health
│   │       ├── vehicles.py         # GET /api/v1/vehicles
│   │       ├── trips.py            # POST /api/v1/trips/plan
│   │       ├── incidents.py        # GET/POST /api/v1/incidents
│   │       ├── roads.py            # GET/PATCH /api/v1/roads
│   │       ├── weather.py          # GET /api/v1/weather
│   │       └── emergency_logistics.py # GET/POST /api/v1/emergency-logistics
│   └── services/
│       └── __init__.py
├── requirements.txt                # Python dependencies
├── .env.example                    # Template environment variables (no secrets)
└── README.md                       # Backend technical documentation
```

---

## 4. How to Install & Run

### Prerequisites
- Python 3.10+
- `pip` / `venv`

### Setup Virtual Environment
```bash
cd backend
python -m venv .venv

# Activate on Linux/macOS:
source .venv/bin/activate

# Activate on Windows:
# .venv\Scripts\activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run FastAPI Development Server
```bash
# From the backend/ directory:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running:
- **Interactive OpenAPI Documentation:** `http://localhost:8000/api/v1/docs`
- **ReDoc Documentation:** `http://localhost:8000/api/v1/redoc`
- **Health Check Endpoint:** `http://localhost:8000/health`

---

## 5. API Endpoints

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/health` | Primary health probe returning status & DB mode | **REAL** |
| `GET` | `/api/v1/health` | API v1 health probe | **REAL** |
| `GET` | `/api/v1/vehicles` | List fleet vehicles & telemetry | **FOUNDATION** |
| `GET` | `/api/v1/vehicles/{id}` | Get vehicle details by ID | **FOUNDATION** |
| `POST` | `/api/v1/trips/plan` | Multi-corridor route evaluation | **FOUNDATION** |
| `GET` | `/api/v1/incidents` | List field hazard reports | **FOUNDATION** |
| `POST` | `/api/v1/incidents` | Submit field incident report | **FOUNDATION** |
| `POST` | `/api/v1/incidents/{id}/verify` | SDMA Human-in-the-Loop approval | **FOUNDATION** |
| `GET` | `/api/v1/roads` | List corridor road segments | **FOUNDATION** |
| `PATCH` | `/api/v1/roads/{id}` | Update segment blockage status | **FOUNDATION** |
| `GET` | `/api/v1/weather` | Normalized regional weather telemetry | **FOUNDATION** |
| `GET` | `/api/v1/emergency-logistics/godowns` | List strategic buffer warehouses | **FOUNDATION** |
| `POST` | `/api/v1/emergency-logistics/requests` | Submit emergency cargo diversion | **FOUNDATION** |

---

## 6. Implementation Status Matrix

| Layer / Feature | Classification | Description |
|---|---|---|
| **FastAPI Core & Routes** | **REAL** | Fully functional FastAPI server with OpenAPI docs, CORS, and health probe. |
| **Health Probe Endpoint** | **REAL** | Live end-to-end connectivity test probe consumed by the React API client. |
| **Pydantic Data Schemas** | **REAL** | Strict data validation for all domain entities. |
| **PostgreSQL / PostGIS Schema** | **FOUNDATION** | SQLAlchemy spatial models created for future migration without runtime dependency. |
| **Database Connection** | **FOUNDATION** | Graceful fallback when `DATABASE_URL` is unset; no live PostgreSQL server required. |
| **Zustand + IndexedDB Engine** | **FALLBACK** | Client-side deterministic store ensuring uninterrupted offline presentation safety. |
| **Jury Demo Injections** | **SIMULATED** | Landslide injection, weather spike, and corridor disruption simulation. |
| **Seeded Domain Data** | **SEEDED** | Realistic North Eastern highways, weather nodes, and fleet entries. |

---

## 7. Environment Variables (`.env.example`)

```env
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Optional future PostgreSQL / PostGIS connection
DATABASE_URL=
```
