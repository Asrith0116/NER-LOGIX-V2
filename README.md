# NER-LOGIX | Smart Logistics & Accessibility Intelligence Platform

> **AI-Based Smart Logistics & Accessibility Intelligence Platform for the North Eastern Region of India**  
> *Developed for Ministry of Development of North Eastern Region (MDoNER) & State Disaster Management Authorities (SDMA)*

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-48%20Passing-brightgreen)](https://nodejs.org/api/test.html)

**NER-LOGIX** is an enterprise-grade, resilient logistics and disaster responsiveness platform engineered specifically for the complex mountain terrain and extreme weather conditions of Northeast India. It monitors critical freight routes (e.g., **NH-2**, **NH-29**, **NH-102**, **NH-37**), provides real-time multi-modal hazard intelligence, performs predictive risk assessment, executes reactive freight rerouting, safeguards cold-chain pharmaceuticals, and enables unified multi-agency coordination.

---

## 🌟 Key Features & Role-Based Architecture

NER-LOGIX features a role-tailored user experience serving four operational groups:

### 🚚 1. Driver Module (`/driver`)
* **Field Hazard Reporting**: Submit incident alerts with photo attachments, audio voice memos, GPS telemetry, and typed notes. Supports automatic regional language detection (**Assamese**, **Manipuri/Meitei**, **Bengali**, **Hindi**, **English**).
* **Trip Planner & Active Navigation**: Turn-by-turn navigation featuring real-time corridor risk overlays, elevation profiles, weather hazard alerts, and dynamic detour recommendations.
* **Cargo Continuity Tracking**: Cold-chain telemetry monitoring (2–8°C vaccines / deep freeze pathology) to prevent spoilage during transit delays.

### 🏢 2. Dispatcher Command Center (`/dispatcher`)
* **Fleet Control & Real-Time Tracking**: GPS tracking for regional vehicles, ETA recalculations, corridor assignments, and risk propagation.
* **Incident Triage & Approval**: Review AI analysis summaries, inspect visual evidence, approve reroute advisories, and trigger emergency diversions.
* **Logistics & Emergency Pickups**: Monitor buffer godowns, track high-priority medical cargo, and issue emergency inventory pickup dispatches.

### 🏛️ 3. State Disaster Management Authority (SDMA) (`/sdma`)
* **Regional Resilience Dashboard**: High-level overview of active corridor blockages, vulnerability indices, and multi-district accessibility matrices.
* **Human-in-the-Loop Network Control**: Official binding incident verification that updates road segment statuses (**Open**, **Caution**, **Partially Blocked**, **Fully Impassable**).
* **Isolated Community Monitoring**: Automatic flags for districts facing imminent isolation based on network cut-point analysis.

### 🛠️ 4. Maintenance Contractor Module (`/contractor`)
* **Road Clearance Operations**: Work ticket queue management, heavy machinery deployment logging (earthmovers, rock splitters), and clearance progress tracking.

---

## 🧠 Multi-Tier Resilient AI Incident Gateway

To ensure uninterrupted service during disasters or regional connectivity degradation, NER-LOGIX uses a **three-tier failover architecture**:

```
                  ┌───────────────────────────────────────────┐
                  │    Field Incident Report / Voice / Photo  │
                  └─────────────────────┬─────────────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │  Tier 1: Gemini 3.6 Flash (@google/genai) │
                  │  Multi-modal schema extraction & AI logic │
                  └─────────────────────┬─────────────────────┘
                                        │ (If API key missing or rate-limited)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │    Tier 2: Groq AI (Qwen 3.6 / GPT-OSS)   │
                  │       Secondary cloud provider failover   │
                  └─────────────────────┬─────────────────────┘
                                        │ (If offline or zero network)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ Tier 3: Local Deterministic Heuristic NLP │
                  │ Regex regional language & negation parser │
                  └───────────────────────────────────────────┘
```

1. **Tier 1 (Primary Cloud AI - Gemini 3.6 Flash)**: Uses `@google/genai` with strict JSON schema enforcement to analyze text, images, and voice transcripts. Extracts hazard categories, road capacity impact, severity levels, corridor entities (e.g. *NH-2, Mao Gate, km 312*), and recommended actions.
2. **Tier 2 (Secondary Cloud AI - Groq AI)**: Automatic fallback to Groq SDK (`qwen/qwen3.6-27b`) if primary rate limits occur.
3. **Tier 3 (Offline Local NLP Engine)**: Deterministic heuristic parser that operates completely offline without external network dependency, using regional keyword matching, negation detection (*"no landslide"*, *"road clear"*), and severity heuristics.

---

## 🔮 Predictive Machine Learning Engine

NER-LOGIX includes an integrated **Gradient Boosting Classifier** (`src/services/predictive/GradientBoostingClassifier.ts`) that calculates real-time landslide and road blockage probabilities based on:
* **NASA GLC & GSI Historical Hazard Exposures**: Historic landslide density along specific corridor segments.
* **Copernicus DEM 90m Elevation Data**: Slope angles, elevation profiles, and terrain gradients.
* **Open-Meteo Live Weather Telemetry**: 24-hour accumulated rainfall, precipitation intensity, and saturation indices.

---

## 🔐 Demo Credentials

The platform includes built-in authentication with pre-configured demo user accounts:

| Role | Email / Login | Password | Organization | Primary Route |
|---|---|---|---|---|
| **Driver** | `driver@nerlogix.in` | `driver123` | Assam State Freight Operations | `/driver` |
| **Dispatcher** | `dispatcher@nerlogix.in` | `dispatch123` | NER Regional Logistics Command | `/dispatcher` |
| **SDMA Officer** | `sdma@nerlogix.in` | `sdma123` | State Disaster Management Authority | `/sdma` |
| **Contractor** | `contractor@nerlogix.in` | `contractor123` | NE Emergency Logistics Contractor | `/contractor` |

*Note: Quick-login role buttons are also available on the login screen (`/login`).*

---

## 🛠️ Technology Stack

### Frontend
* **Framework**: React 19.2 + TypeScript 6.0 + Vite 8.2
* **Styling**: Tailwind CSS v4.3 + Framer Motion 13.2
* **Mapping**: Leaflet 1.9 + React-Leaflet 5.0 (Custom tiles & marker adapters)
* **State Management**: Zustand 5.0
* **Routing**: React Router DOM 7.18
* **UI Controls**: Lucide Icons 1.40 + Radix UI Primitives

### Backend & AI Middleware
* **Runtime**: Node.js 22 (ESM with `--experimental-strip-types`)
* **Dev Server**: Vite Server Middleware (`server/geminiPlugin.ts`)
* **API Router**: Express Operations Router (`server/routes/operationsRouter.ts`)
* **Database**: `node:sqlite` (SQLite 3 embedded file storage at `.data/operations.db` with in-memory fallback)
* **AI Libraries**: `@google/genai` (Gemini 3.6 Flash), `groq-sdk`
* **External APIs**: Open-Meteo Weather API, Copernicus DEM 90m Elevation API, Overpass OSM Network API

---

## 📁 Project Structure

```
├── .data/                           # Persistent SQLite database directory
│   └── operations.db                # SQLite database file
├── server/                          # Node.js backend & middleware
│   ├── db/
│   │   └── sqliteStorage.ts         # node:sqlite storage engine & schema baseline
│   ├── routes/
│   │   └── operationsRouter.ts      # REST API router endpoints
│   ├── services/                    # Server-side operational services
│   │   ├── authService.ts           # JWT authentication & password validation
│   │   ├── elevationService.ts      # Copernicus DEM elevation processing
│   │   ├── geospatialSnappingService.ts # Haversine & orthogonal route snapping
│   │   ├── historicalHazardService.ts  # NASA GLC & GSI historical hazard data
│   │   ├── osmNetworkService.ts     # OSM Overpass network topology engine
│   │   ├── vehiclePositionService.ts# Telemetry signal updates
│   │   └── weatherService.ts        # Open-Meteo weather integration
│   └── geminiPlugin.ts              # Multi-tier AI Gateway Vite server plugin
├── src/                             # React frontend source code
│   ├── components/                  # UI components (map, cards, layout, forms)
│   ├── data/                        # Corridor definitions & baseline datasets
│   ├── hooks/                       # Custom React hooks
│   ├── pages/                       # Role-based application pages
│   ├── services/                    # Client-side API & ML predictive services
│   │   └── predictive/              # Gradient Boosting ML Classifier
│   ├── store/                       # Zustand state stores (auth, app, network)
│   └── types/                       # TypeScript interfaces & domain types
├── test/                            # Integration & unit test suites (48 tests)
├── .env.example                     # Environment variable declarations
├── index.html                       # HTML entry point with metadata tags
├── metadata.json                    # Application metadata
├── package.json                     # Scripts & dependencies
└── vite.config.ts                   # Vite configuration
```

---

## ⚙️ Installation & Running Locally

### Prerequisites
* **Node.js**: v22.0.0 or higher
* **npm**: v10.0.0 or higher

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Asrith0116/NER-LOGIX-V2.git
cd NER-LOGIX-V2
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Define environment variables in `.env`:
```env
# Server Configuration
API_HOST=0.0.0.0
API_PORT=3000

# AI Provider API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_optional

# Client Base URL
VITE_API_BASE_URL=
```

### 3. Start Development Server
```bash
npm run dev
```
Access the app at `http://localhost:3000`.

### 4. Run Automated Test Suite
The project contains 48 automated test suites verifying AI fallbacks, weather feeds, ML predictions, and database isolation:
```bash
npm test
```

### 5. Run Linter
```bash
npm run lint
```

### 6. Build for Production
```bash
npm run build
```

---

## 🔌 REST API Documentation

The server exposes REST endpoints under `/api/v1`:

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/ai/analyze-incident` | `POST` | Multi-tier AI incident report analysis (Gemini / Groq / Local NLP) |
| `/api/v1/ai/health` | `GET` | Health and configuration status of AI providers |
| `/api/v1/incidents` | `GET`, `POST` | Query and submit field hazard reports |
| `/api/v1/incidents/:id/verify` | `PATCH` | SDMA officer binding incident verification |
| `/api/v1/roads` | `GET`, `PATCH` | Query road network segments & update road statuses |
| `/api/v1/vehicles` | `GET`, `PATCH` | Fetch vehicle telemetry & update vehicle locations/reroutes |
| `/api/v1/disruptions` | `GET`, `POST` | Fetch or declare corridor disruption events |
| `/api/v1/emergency-pickups` | `GET`, `POST`, `PATCH` | Manage emergency godown inventory pickup requests |
| `/api/v1/shipments` | `GET`, `PATCH` | Track cargo shipments & cold-chain status |
| `/api/v1/godowns` | `GET`, `PATCH` | Query buffer godowns & adjust stock levels |
| `/api/v1/health` | `GET` | System health & SQLite database status |

---

## 🗄️ Database Schema & Storage

The application uses Node 22's native `node:sqlite` module for fast, zero-dependency persistence stored at `.data/operations.db`. Tables managed automatically:
* `incidents`: Field hazard reports with photos, audio transcripts, AI JSON outputs, and SDMA verification tags.
* `road_segments`: Corridor segments with status (`open`, `partially_blocked`, `fully_blocked`), risk levels, and associated incidents.
* `vehicles`: Fleet vehicles, driver details, GPS coordinates, assigned corridors, cargo types, and active reroute plans.
* `disruptions`: Active corridor blockages linked to road segments and affected vehicles.
* `emergency_pickups`: Emergency inventory buffer pickup requests and contractor assignments.
* `shipments`: Freight details, cold-chain temperature logs, priority scores, and continuity statuses.
* `godowns`: Strategic regional storage hubs, capacities, stock levels, and suitable cargo types.
* `idempotency_records`: Request deduplication records for network resilience.

---

## 🛡️ Security & Privacy

* **JWT HMAC-SHA256 Authentication**: Session tokens signed server-side with constant-time verification (`crypto.timingSafeEqual`).
* **API Key Security**: Sensitive keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) remain strictly on the backend and are never exposed to the client bundle.
* **No Hardcoded Secrets**: Secrets are loaded dynamically via environment variables with `.env.example` documentation.

---

## 📄 License

This project is open-source and built for smart logistics resilience, regional disaster management, and accessibility intelligence in the North Eastern Region of India.
