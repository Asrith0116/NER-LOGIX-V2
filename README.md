# NER-LOGIX | Smart Logistics & Accessibility Intelligence Platform

> **AI-Based Smart Logistics & Accessibility Intelligence Platform for the North Eastern Region of India**  
> **Problem Statement ID:** SIH26002 | **Ministry:** Ministry of Development of North Eastern Region (MDoNER)  
> **Team:** RESILIO  

---

## 1. Opening Description

**NER-LOGIX** is a hackathon prototype focused on logistics resilience and accessibility intelligence for disruption-prone freight corridors across Northeast India (e.g., NH-2, NH-29, NH-102, NH-37). 

In extreme terrain subject to landslides, monsoonal flash floods, and seasonal cut-offs, the platform establishes a shared operational response mechanism that bridges field observations, multi-tier AI analysis, human disaster management verification, dynamic fleet rerouting, and emergency buffer stock fulfillment.

The platform connects:
```
Field Hazard Reporting
       ↓
AI-Assisted Incident Triage
       ↓
Human SDMA Verification
       ↓
Road-Status Propagation
       ↓
Fleet & Shipment Impact Analysis
       ↓
Current-Position Rerouting
       ↓
Emergency Supply Continuity
       ↓
Contractor Fulfillment
       ↓
Operational & Accessibility Intelligence
```

> **Core Product Philosophy:**  
> *"ONE REPORT → SHARED ROAD INTELLIGENCE → MULTIPLE SHIPMENTS PROTECTED"*

*Note: NER-LOGIX is an operational response hackathon prototype designed to demonstrate multi-agency network resilience. It is not presented as a production-deployed government enterprise platform.*

---

## 2. The Core Problem

In disruption-prone mountain terrain, a road closure is not merely an isolated navigation delay. A single verified landslide or wash-out can trigger network-wide logistics failures:

- **Multiple Freight Vehicles** stuck without safe turnaround points.
- **Perishable & Cold-Chain Cargo** (e.g., vaccines, insulin, blood plasma) risking spoilage due to thermal degradation.
- **Relief Supply Bottlenecks** cutting off vulnerable hill districts.
- **Uncoordinated Emergency Stocks** leading to stockouts at regional depots.

NER-LOGIX acts as the operational response layer after a road disruption is reported and verified.

> **Key Distinction:**  
> *"Navigation answers where to go. NER-LOGIX focuses on what the disruption means for the logistics network."*

*NER-LOGIX does not attempt to replace consumer GPS applications such as Google Maps; rather, it provides multi-agency logistics continuity, network impact assessment, and emergency supply routing.*

---

## 3. System Flow

The end-to-end data and operational decision flow is structured as follows:

```
Driver / Field Operator
        ↓ (Submits photo, audio, or text hazard report)
Hazard Report
        ↓ (Triaged via Gemini 3.6 Flash / Groq / Local NLP)
AI-Assisted Incident Triage
        ↓ (Official authority reviews evidence)
SDMA Human Verification
        ↓ (Updates segment to 'blocked' or 'caution')
Road Segment Status Update
        ↓ (Persisted to SQLite DB & broadcast across network)
Shared Disruption State
        ↓ (Identifies affected vehicles & cold-chain shipments)
Fleet + Shipment Impact
        ↓ (Calculates alternate corridor from vehicle CURRENT position)
Current-Position Reroute
        ↓ (If no safe corridor exists, identifies nearest depot)
Emergency Godown Fallback
        ↓ (Driver requests emergency inventory deposit)
Emergency Pickup Request
        ↓ (Supply operator reserves buffer inventory)
Contractor Approval / Fulfillment
        ↓ (Aggregates network status, vulnerability indices)
Operational Intelligence
```

**Key Operational Rule:** AI models provide advisory triage and initial risk scoring; **SDMA human verification is strictly authoritative** for changing official road blockage statuses.

---

## 4. Role-Based Architecture

NER-LOGIX implements four specialized operational roles:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NER-LOGIX ROLES                                │
├───────────────────┬───────────────────┬─────────────────┬───────────────┤
│   DRIVER / FIELD  │    DISPATCHER     │   SDMA OFFICER  │  CONTRACTOR   │
│     OPERATOR      │  COMMAND CENTER   │   (GOVERNMENT)  │ SUPPLY DEPT   │
└───────────────────┴───────────────────┴─────────────────┴───────────────┘
```

### 🚚 Driver / Field Operator (`/driver`)
- **Responsibilities:** Plan trips, compare safer vs. faster route options, review corridor risk profiles, and navigate assigned journeys.
- **Field Hazard Reporting:** Submit real-time hazard reports with photos, voice memos (with regional language detection support), GPS telemetry, and text descriptions.
- **Reactive Rerouting:** Review recommended alternate routes calculated from current vehicle position and accept/start reroutes.
- **Emergency Fallback:** Request emergency stock buffer pickup at nearest strategic godown if no alternate corridor exists.
- *Telemetry Notice:* Vehicle position is represented through prototype/simulated telemetry in the current demonstration.

### 🏢 Dispatcher Command Center (`/dispatcher`)
- **Responsibilities:** Monitor active fleet vehicles, track corridor assignments, inspect reported hazards, and track shipment continuity status.
- **Fleet Impact Coordination:** View vehicles affected by active road blockages, inspect ETA impacts, and monitor reroute progress.
- **Emergency Logistics Tracking:** Oversee emergency stock pickup requests and coordinate supply redistribution.
- *Notice:* Dispatcher monitors and coordinates logistics operations; Dispatcher does **not** execute binding SDMA road verifications.

### 🏛️ SDMA / Government Officer (`/sdma`)
- **Responsibilities:** Review incoming field incident reports, inspect multi-modal evidence and AI triage outputs, and execute authoritative human verification.
- **Road Status Control:** Binding verification changes corridor segment statuses (`open`, `caution`, `blocked`), creating or clearing network disruptions.
- **Accessibility Intelligence:** Inspect regional district isolation indicators, vulnerability matrices, and corridor status metrics.
- *Notice:* Synthetic connectivity indices and accessibility metrics are provided as demonstration intelligence for prototype evaluation.

### 🛠️ Contractor / Supply Operator (`/contractor`)
- **Responsibilities:** Receive emergency godown inventory pickup requests triggered by reroute failures.
- **Inventory Reservation:** Approve or decline emergency buffer stock allocation requests, reserving stock for emergency logistics continuity.

---

## 5. Key Implemented Features

- **Role-Based Authentication & RBAC:** Hackathon-grade JWT authentication with secure role authorization guards across UI routes and REST endpoints.
- **Field Hazard Reporting Engine:** Multi-modal incident capture (text descriptions, photo upload, voice recording) with automated regional language tag parsing.
- **Multi-Tier AI Failover Gateway:** Server-side AI triage utilizing Gemini 3.6 Flash with dynamic fallback to Groq AI and an offline local heuristic NLP parser.
- **Authoritative SDMA Verification:** Human-in-the-loop verification workflow that updates road network segments and propagates active disruption states.
- **Shared Disruption State Synchronization:** Atomic, non-destructive network state synchronization between SQLite backend and client Zustand stores.
- **Fleet Impact Evaluation Engine:** Deterministic network engine evaluating which active vehicles are affected by corridor blockages.
- **Shipment & Cold-Chain Continuity Tracking:** Automatic risk evaluation for sensitive freight (e.g., vaccines, blood plasma) exposed to corridor delays.
- **Current-Position Reactive Rerouting:** Reroute recommendation engine calculating valid alternate highway corridors starting from the vehicle's *current location*.
- **Emergency Godown Fallback & Pickup:** Strategic buffer stock discovery and emergency pickup request workflow when no viable alternate route exists.
- **Contractor Inventory Fulfillment:** Atomic reservation and approval workflow for emergency relief supplies.
- **Native SQLite Persistence:** Embedded `node:sqlite` file database (`.data/operations.db`) storing authoritative operational records.
- **External Data Integrations:** Open-Meteo live weather API, Copernicus DEM 90m elevation API, and OpenStreetMap Overpass road topology parsing.
- **Geospatial Snapping Service:** Haversine distance and orthogonal segment projection snapping field coordinates to corridor geometries.
- **Predictive Gradient Boosting Classifier:** Machine learning risk scoring prototype estimating landslide probabilities from weather, slope, and historical features.
- **Offline Report Queue:** Client-side IndexedDB persistence for offline hazard reporting during network disconnections.

---

## 6. Reactive Disruption Workflow

The complete end-to-end operational lifecycle proceeds through 14 distinct steps:

1. **Hazard Reporting:** A field driver submits a hazard report (e.g., landslide on NH-2 near Mao Gate).
2. **AI Incident Triage:** The multi-tier AI gateway analyzes the report, extracting structured hazard attributes, severity, and corridor location.
3. **Queue Ingestion:** The incident enters the SDMA verification queue marked as `pending_verification`.
4. **SDMA Review:** An SDMA Officer inspects the photo evidence, voice transcript, and AI summary.
5. **Human Verification:** The SDMA Officer officially verifies the incident as `approved`.
6. **Road Blockage:** The corresponding road segment (`rd-001`) status changes to `blocked`.
7. **Disruption Creation:** An active disruption record (`DIS-INC-...`) is created and persisted to SQLite.
8. **Fleet Impact Evaluation:** The engine scans active vehicles and marks those planned through `rd-001` as `disrupted`.
9. **Shipment Impact Update:** Cargo shipments assigned to affected vehicles are flagged for delay and cold-chain risk.
10. **Current-Position Reroute:** The system computes alternate routes avoiding `rd-001` starting from the driver's current position.
11. **Driver Reroute Execution:** Driver reviews the recommended detour (e.g., via NH-37) and clicks **Start Reroute**.
12. **Godown Fallback (If No Route Exists):** If no alternate route exists, the system recommends the nearest strategic godown (e.g., Dimapur Relief Godown).
13. **Emergency Pickup Request:** Driver submits an emergency buffer stock pickup request.
14. **Contractor Approval:** Contractor approves the request, reserving stock atomically and updating vehicle status to `emergency_pickup`.

---

## 7. Predictive Intelligence

NER-LOGIX features an integrated Gradient Boosting Classifier prototype (`src/services/predictive/GradientBoostingClassifier.ts`) that calculates route disruption probabilities.

### Input Features (7 Features)
1. `rainfallMmPerHour`: Current precipitation intensity (mm/h).
2. `terrainSlopeDegrees`: Corridor slope gradient derived from Copernicus DEM 90m.
3. `historicalLandslideCount`: Historical hazard density score along the corridor.
4. `roadTypeScore`: Infrastructure vulnerability rating (National Highway vs. Secondary Road).
5. `activeDisruptionCount`: Number of active disruptions along the route.
6. `cargoSensitivityScore`: Priority rating of cargo (e.g., cold-chain vs. general freight).
7. `vehicleSuitabilityScore`: Vehicle class suitability for terrain.

### Prototype Dataset Evaluation Metrics
Model performance evaluated on the prototype/derived dataset (fitted with fixed random seed `42`):

| Metric | Score |
| :--- | :--- |
| **Accuracy** | 0.925 |
| **Precision** | 0.900 |
| **Recall** | 0.880 |
| **F1 Score** | 0.890 |
| **ROC-AUC** | 0.941 |

> *Notice: These metrics describe the prototype/derived dataset used during development and should not be interpreted as validated real-world regional performance.*

---

## 8. Real Data & External Services

| Category | Integration / Source | Usage in Prototype |
| :--- | :--- | :--- |
| **Live External Services** | **Open-Meteo Weather API** | Real-time precipitation, temperature, and atmospheric data for Northeast coordinates. |
| | **Copernicus DEM 90m Service** | Terrain elevation sampling and corridor slope profile generation. |
| | **OpenStreetMap Overpass API** | Highway corridor segment fetching and road network node parsing. |
| **Baseline / Seeded Data** | **Corridor Geometries** | Seeded polyline coordinates for key corridors (NH-2, NH-29, NH-102, NH-37). |
| | **Historical Hazard Points** | Seeded landslide density indices along mountain passes. |
| | **Operational Entities** | Baseline demo vehicles, strategic relief godowns, and freight shipments. |
| **Derived / Prototype Data** | **Connectivity Index** | Synthetic regional accessibility matrices generated for demonstration. |
| | **Visibility Metric** | Deterministic visibility estimate derived from precipitation intensity. |

---

## 9. Weather, Terrain & Visibility Architecture

- **Weather Engine:** Backend service (`server/services/weatherService.ts`) queries Open-Meteo live endpoints for active corridor coordinates, falling back to seasonal baseline estimates if offline.
- **Elevation Engine:** Backend service (`server/services/elevationService.ts`) samples Copernicus 90m DEM elevation arrays, extracting maximum pass elevations and slope gradients.
- **Visibility Estimation:** Visibility is computed via a deterministic formula based on precipitation rate ($V = \max(0.5, 10 - 0.45 \cdot \text{Rainfall})$) and labeled as a **derived precipitation estimate**, not a direct hardware sensor measurement.

---

## 10. AI Failover Architecture

NER-LOGIX utilizes a resilient 3-tier failover gateway (`server/geminiPlugin.ts`) to ensure incident triage remains functional under network instability:

```
                  ┌───────────────────────────────────────────┐
                  │    Field Incident Report / Voice / Photo  │
                  └─────────────────────┬─────────────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ Tier 1: Gemini 3.6 Flash (@google/genai)  │
                  │ Multi-modal JSON schema extraction        │
                  └─────────────────────┬─────────────────────┘
                                        │ (If API key missing/rate-limited)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │  Tier 2: Groq AI (qwen/qwen3.6-27b)       │
                  │  Secondary cloud LLM provider             │
                  └─────────────────────┬─────────────────────┘
                                        │ (If offline / zero network)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ Tier 3: Local Deterministic Heuristic NLP │
                  │ Regex regional keyword & negation parser  │
                  └───────────────────────────────────────────┘
```

- **Tier 1 (Primary Cloud AI):** `gemini-3.6-flash` via `@google/genai` SDK with strict JSON schema response structure.
- **Tier 2 (Secondary Cloud AI):** `qwen/qwen3.6-27b` (with `openai/gpt-oss-20b` fallback) via `groq-sdk`.
- **Tier 3 (Offline Local NLP):** Deterministic local heuristic regex parser extracting hazard category, severity, and road blockage flags without external API keys.

---

## 11. Offline & Weak-Connectivity Support

- **Report Queue:** Incident reports created while offline are stored in browser IndexedDB with `pending_sync` status.
- **Local Fallback Triage:** When external AI services are unreachable, Tier 3 local NLP processes hazard text offline.
- **Limitations:** The prototype does **not** include complete offline map tile caching or full offline turn-by-turn routing tiles.

---

## 12. Database & Storage Architecture

NER-LOGIX uses Node.js 22 native `node:sqlite` for fast, zero-dependency persistence stored at `.data/operations.db` (with in-memory fallback for test runs).

### Database Schema Tables
1. `incidents`: Field reports, photo metadata, audio transcripts, AI triage JSON, SDMA verification flags.
2. `road_segments`: Highway corridor segments, operational statuses (`open`, `caution`, `blocked`), risk levels.
3. `vehicles`: Fleet vehicles, driver details, telemetry coordinates, assigned routes, active reroute plans.
4. `disruptions`: Active corridor blockages linked to road segments and affected vehicle lists.
5. `emergency_pickups`: Emergency godown buffer allocation requests and contractor fulfillment records.
6. `shipments`: Freight manifests, cold-chain temperature logs, continuity statuses.
7. `godowns`: Strategic regional storage hubs, capacities, available stock levels.
8. `idempotency_records`: Request deduplication cache for API network resilience.

> **Storage Limitation:**  
> *"The current hackathon runtime uses SQLite for authoritative operational state. This is suitable for the prototype runtime but is not a production distributed database architecture."*

---

## 13. Authentication & Security

- **Authentication:** Hackathon-grade JWT session authentication with HMAC-SHA256 signing.
- **Timing Safety:** Token signatures verified using constant-time comparison (`crypto.timingSafeEqual`).
- **Role Guards:** Middleware enforcing role restrictions on sensitive endpoints (e.g., SDMA verification requires `sdma` role; Contractor approval requires `contractor` role).
- **API Key Protection:** Cloud AI keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) remain strictly server-side and are never exposed to the client browser bundle.

---

## 14. Demo Credentials

Pre-configured demo user accounts available for instant role testing:

| Role | Email | Password | Organization | Default View |
| :--- | :--- | :--- | :--- | :--- |
| **Driver** | `driver@nerlogix.in` | `driver123` | Assam Freight Operations | `/driver` |
| **Dispatcher** | `dispatcher@nerlogix.in` | `dispatch123` | NER Regional Logistics Command | `/dispatcher` |
| **SDMA Officer** | `sdma@nerlogix.in` | `sdma123` | State Disaster Management Authority | `/sdma` |
| **Contractor** | `contractor@nerlogix.in` | `contractor123` | NE Emergency Logistics Contractor | `/contractor` |

*Quick-login role selection buttons are also provided on the sign-in screen (`/login`).*

---

## 15. Quick Start & Reproducibility

### Prerequisites
- **Node.js**: Version 22.0.0 or higher
- **npm**: Version 10.0.0 or higher

### 1. Installation
```bash
git clone <repository-url>
cd ner-logix
npm install
```

### 2. Environment Configuration
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```
*(Optional) Add external cloud AI API keys to `.env`:*
```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```
*If no API keys are provided, the system seamlessly uses Tier 3 Local Deterministic NLP.*

### 3. Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Production Build
```bash
npm run build
npm run start
```

### 5. Running Integration & Unit Test Suite
```bash
npm test
```
**Test Results:** **48 passing tests** across 48 subtests (0 failures).

---

## 16. Recommended Jury Evaluation Flow

For evaluating the complete end-to-end reactive disruption workflow:

1. **Sign In as Driver:** Log in using `driver@nerlogix.in` / `driver123`.
2. **Open Trip Planner:** Navigate to **Trip Planner** and inspect route options (NH-2 vs. NH-37).
3. **Review Predictive Risk:** Observe route risk scores, elevation profiles, and weather indicators.
4. **Submit Hazard Report:** Go to **Report Hazard**, select **NH-2 Corridor near Mao Gate**, attach text/photo/voice details, and click **Submit Incident**.
5. **Switch to SDMA Officer:** Sign out and log in as `sdma@nerlogix.in` / `sdma123`.
6. **Verify Incident:** Open **SDMA Dashboard**, locate the pending Mao Gate landslide report, review AI triage, and click **Verify & Block Corridor**.
7. **Observe Status Propagation:** Verify that NH-2 status updates to **Blocked** on the SDMA regional map.
8. **Switch to Dispatcher:** Log in as `dispatcher@nerlogix.in` / `dispatch123`.
9. **Inspect Fleet & Cargo Impact:** Observe vehicle `AS-01-J-4422` marked in red (**Disrupted**) and cold-chain cargo flagged for delay.
10. **Review Current-Position Reroute:** Inspect the recommended detour via NH-37 calculated from the vehicle's current location.
11. **Switch Back to Driver:** Log in as Driver, open **Active Navigation**, and click **Start Reroute** to accept the detour.
12. **Trigger Godown Fallback:** For a vehicle cut off with no detour, click **Request Emergency Storage**.
13. **Switch to Contractor:** Log in as `contractor@nerlogix.in` / `contractor123`.
14. **Approve Emergency Pickup:** Locate the pending pickup request for Dimapur Relief Godown and click **Approve Stock Reservation**.
15. **Verify Persistence:** Refresh the browser; observe that all operational states, stock deductions, and route updates remain intact.

*Demonstration Note: Vehicle movement and GPS telemetry are represented through simulated prototype telemetry.*

---

## 17. Implemented Now vs. Roadmap

| Feature / Capability | Implemented Now (Hackathon Prototype) | Roadmap (Future Production) |
| :--- | :---: | :---: |
| **Role-Based Authentication & RBAC** | ✅ Yes (JWT + HMAC-SHA256) | Production OAuth2 / SAML / Enterprise IAM |
| **Multi-Tier AI Incident Triage** | ✅ Yes (Gemini 3.6 + Groq + Local NLP) | Custom fine-tuned regional hazard LLM |
| **SDMA Human Verification Workflow** | ✅ Yes (Authoritative road blockage binding) | Multi-agency multi-signature clearance |
| **Current-Position Reroute Engine** | ✅ Yes (Graph alternate corridor search) | Live turn-by-turn voice navigation engine |
| **Emergency Godown Stock Allocation** | ✅ Yes (Atomic buffer stock reservation) | ERP / WMS real-time warehouse integration |
| **Operational Persistence** | ✅ Yes (Embedded Node.js `node:sqlite`) | Managed Distributed PostgreSQL / PostGIS |
| **Predictive Risk Assessment** | ✅ Yes (7-Feature Gradient Boosting Model) | Large-scale regional ML trained on GSI records |
| **Vehicle Telemetry** | ⚠️ Simulated Prototype Telemetry | Hardware AIS-140 GPS telematics integration |
| **Network Communication** | ⚠️ HTTP Polling (`/snapshot` sync) | Production WebSockets / MQTT Event Streams |
| **Map Tile Architecture** | ⚠️ Online Leaflet Tile Layers | Offline vector tile package (MBTiles) |

---

## 18. Known Prototype Limitations

- **Hackathon Scope:** Designed as an operational response prototype; not deployed in production government infrastructure.
- **Embedded Database:** Uses local SQLite persistence (`.data/operations.db`), which is suitable for prototype evaluation but not a distributed production database.
- **Simulated Telemetry:** Vehicle locations and signal updates are generated via prototype simulation scripts rather than physical hardware GPS units.
- **Predictive Dataset:** Machine learning evaluation metrics derived from synthetic training samples rather than multi-year validated field datasets.
- **Cloud AI Dependency:** Tier 1 and Tier 2 AI triage require external API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`); Tier 3 deterministic NLP provides offline fallback.
- **Seeded Corridor Data:** Baseline corridor polylines and historical hazard density indices are pre-seeded for deterministic demonstration.

---

## 19. API Documentation

The Node.js server exposes REST API endpoints under `/api/v1`:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/ai/analyze-incident` | `POST` | Multi-tier AI incident triage (Gemini / Groq / Local NLP). |
| `/api/v1/ai/health` | `GET` | Health and API key configuration status of AI providers. |
| `/api/v1/incidents` | `GET`, `POST` | Query active incidents or submit new field hazard reports. |
| `/api/v1/incidents/:id/verify` | `POST` | Authoritative SDMA officer incident verification/rejection. |
| `/api/v1/roads` | `GET`, `PATCH` | Fetch road network segments or update segment status. |
| `/api/v1/vehicles` | `GET`, `PATCH` | Fetch fleet vehicle telemetry or update reroute status. |
| `/api/v1/disruptions` | `GET` | Fetch active corridor disruption records. |
| `/api/v1/fleet-impact` | `GET` | Compute network fleet impacts across active vehicles. |
| `/api/v1/shipments` | `GET` | Query freight shipments and cold-chain risk statuses. |
| `/api/v1/emergency-logistics/godowns` | `GET` | Query strategic relief godowns and buffer stock levels. |
| `/api/v1/emergency-logistics/requests` | `GET`, `POST` | Submit or query emergency buffer pickup requests. |
| `/api/v1/emergency-logistics/requests/:id/approve` | `POST` | Contractor approval and atomic stock reservation. |
| `/api/v1/emergency-logistics/requests/:id/decline` | `POST` | Contractor decline of emergency stock allocation. |
| `/api/v1/operations/snapshot` | `GET` | Full operational snapshot query for network state sync. |
| `/api/v1/operations/reset` | `POST` | Reset database and state store to clean baseline. |

---

## 20. Project Structure

```
ner-logix/
├── .data/                                 # Persistent SQLite database storage
│   └── operations.db                      # Local SQLite database file
├── server/                                # Node.js backend & API layer
│   ├── db/
│   │   └── sqliteStorage.ts               # node:sqlite storage engine & schema
│   ├── routes/
│   │   └── operationsRouter.ts            # REST API router endpoints
│   ├── services/                          # Operational backend services
│   │   ├── authService.ts                 # JWT authentication & password verification
│   │   ├── elevationService.ts            # Copernicus DEM 90m elevation processing
│   │   ├── geospatialSnappingService.ts   # Haversine distance & orthogonal route snapping
│   │   ├── historicalHazardService.ts     # Historic hazard exposure calculation
│   │   ├── osmNetworkService.ts           # OpenStreetMap Overpass network parser
│   │   ├── vehiclePositionService.ts      # Prototype vehicle position service
│   │   └── weatherService.ts              # Open-Meteo live weather integration service
│   └── geminiPlugin.ts                    # Multi-tier AI Gateway Vite server middleware
├── src/                                   # Frontend source code (React + Vite)
│   ├── components/                        # UI components (map, cards, layout, forms)
│   ├── data/                              # Corridor definitions & baseline datasets
│   ├── hooks/                             # Custom React hooks
│   ├── pages/                             # Role-based pages (Driver, Dispatcher, SDMA, Contractor)
│   ├── services/                          # Client API & predictive ML services
│   │   └── predictive/                    # Gradient Boosting Classifier prototype
│   ├── store/                             # Zustand state stores (auth, app, network)
│   └── types/                             # Shared TypeScript domain interfaces
├── test/                                  # Integration & unit test suites (48 tests)
├── .env.example                           # Environment variable declaration template
├── index.html                             # Main HTML entry point
├── metadata.json                          # Application metadata configuration
├── package.json                           # NPM dependencies & operational scripts
└── vite.config.ts                         # Vite build & plugin configuration
```

---

## 21. Technology Stack

### Frontend
- **Framework:** React 19.2 + TypeScript 6.0 + Vite 8.2
- **Styling:** Tailwind CSS v4.3 + Framer Motion 13.2
- **Mapping:** Leaflet 1.9 + React-Leaflet 5.0
- **State Management:** Zustand 5.0
- **Routing:** React Router DOM 7.18
- **Icons:** Lucide React 1.40

### Backend & Middleware
- **Runtime:** Node.js 22 (ESM with native TypeScript strip-types)
- **Dev Server:** Vite Server Middleware (`server/geminiPlugin.ts`)
- **API Router:** Express Operations Router (`server/routes/operationsRouter.ts`)
- **Database:** Node native `node:sqlite` (SQLite 3 file database at `.data/operations.db`)

### AI Gateway
- **Tier 1:** `@google/genai` (Gemini 3.6 Flash)
- **Tier 2:** `groq-sdk` (`qwen/qwen3.6-27b`)
- **Tier 3:** Deterministic Local Heuristic Regex Parser

### External Services
- **Weather:** Open-Meteo Weather API
- **Elevation:** Copernicus DEM 90m API
- **Road Network:** OpenStreetMap Overpass API

---

## 22. Local / Reproducible Evaluation

This repository is provided with complete setup scripts and self-contained baseline data so evaluators can run the prototype locally. Evaluators may test Tier 3 offline AI triage out-of-the-box or provide their own Gemini / Groq API keys in `.env` to test Tier 1 and Tier 2 cloud AI models.

---

## 23. Video & Demo Context

The recorded demonstration accompanies this repository and illustrates the end-to-end operational workflow from field hazard reporting through verification, network impact, rerouting, and emergency logistics.

[https://www.youtube.com/watch?v=P57AVXmGEkE]

---

## 24. Repository Information

- **Repository:** `NER-LOGIX`
- **Problem Statement:** SIH26002
- **Ministry:** Ministry of Development of North Eastern Region (MDoNER)
- **Team:** RESILIO

---

## 25. License

This project is created as an open prototype for smart logistics resilience, regional disaster management, and accessibility intelligence in the North Eastern Region of India.
