# NER-LOGIX | Smart Logistics & Accessibility Intelligence Platform

**AI-Based Smart Logistics & Accessibility Intelligence Platform for the North Eastern Region of India (MDoNER / SDMA)**

NER-LOGIX is a resilient, multi-tiered logistics and disaster responsiveness platform designed specifically for the difficult terrain and critical transit corridors of Northeast India (e.g., NH-2, NH-29, NH-102, NH-37). It provides real-time hazard intelligence, adaptive freight rerouting, cold-chain shipment continuity, emergency buffer inventory management, and multi-agency coordination between Drivers, Dispatchers, State Disaster Management Authorities (SDMA), and Maintenance Contractors.

---

## 🚀 Key Features & Role-Based Modules

### 🚚 1. Driver Module
- **Field Hazard Reporting**: Submit incident reports with voice audio memos, photo attachments, GPS telemetry, and typed notes. Supports regional languages (Assamese, Manipuri/Meitei, Bengali, Hindi, English).
- **Trip Planner & Active Navigation**: Turn-by-turn routing with real-time hazard alerts, dynamic corridor risk scoring, and alternative route suggestions.
- **Cargo Continuity Tracking**: Cold-chain temperature monitoring (2–8°C / deep freeze) for pharmaceutical and medical freight.

### 🏢 2. Dispatcher Module
- **Fleet Ops & Telemetry**: Monitor vehicle locations, ETA updates, corridor assignments, and risk levels across the regional fleet.
- **Incident Management**: Triage field hazard reports, review AI analysis summaries, and approve vehicle rerouting orders.
- **Logistics & Emergency Pickups**: Track high-priority freight, monitor buffer godown stock levels, and dispatch emergency pickup requests.

### 🏛️ 3. State Disaster Management Authority (SDMA) Module
- **Regional Resilience Dashboard**: Strategic oversight of active corridor disruptions, vulnerability indices, and emergency response readiness.
- **Verification & Road Network Control**: Binding human-in-the-loop incident verification and road segment status updates (Open, Caution, Partially Blocked, Fully Impassable).
- **Connectivity Intelligence**: Multi-district access matrices, isolated community flags, and emergency resource allocation.

### 🛠️ 4. Contractor Module
- **Road Clearance Ops**: Track assigned maintenance tickets, deploy heavy equipment (earthmovers, rock splitters), and log clearance progress.

---

## 🧠 Multi-Tiered AI Incident Intelligence Gateway

NER-LOGIX features a three-tier resilient AI processing engine for analyzing field reports:

1. **Primary Provider (Gemini 3.6 Flash)**: Structured multi-lingual text and image extraction using the `@google/genai` TypeScript SDK. Performs hazard classification, road capacity impact assessment, entity extraction (NH corridors, landmarks), recommended actions, and confidence scoring.
2. **Secondary Provider (Groq AI)**: Automatic secondary failover via Groq SDK (`qwen/qwen3.6-27b` / fallback models) if primary rate limits or network issues occur.
3. **Deterministic Local NLP Fallback**: Offline-capable heuristic NLP engine that operates without external API connectivity to ensure zero service downtime during catastrophic connectivity disruptions.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Framer Motion, Leaflet / React-Leaflet, Lucide Icons, Zustand
- **Backend / Middleware**: Vite Integrated Middleware Plugin (`server/geminiPlugin.ts`), Express Operations Router (`server/routes/operationsRouter.ts`)
- **Database**: Built-in SQLite database engine (`server/db/sqliteStorage.ts`) utilizing `node:sqlite` with auto-seeded operational baselines
- **AI Integrations**: `@google/genai` (Gemini 3.6 Flash), `groq-sdk` (Groq AI)

---

## 📁 Directory Structure

```
├── .data/                      # SQLite database storage (operations.db)
├── server/
│   ├── db/                     # SQLite persistence layer & baseline seeding
│   ├── routes/                 # Express operations API router
│   ├── services/               # Operational, weather, elevation, & routing engines
│   └── geminiPlugin.ts         # Vite server plugin & multi-tier AI Gateway
├── src/
│   ├── components/             # Reusable UI, Map, Layout, & Auth components
│   ├── data/                   # Corridor route definitions & demo datasets
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Role-based views (Driver, Dispatcher, SDMA, Contractor, Auth)
│   ├── services/               # Client API clients & predictive engines
│   ├── store/                  # Zustand application state management
│   └── types/                  # Global TypeScript type definitions
├── test/                       # Operational & AI fallback integration tests
├── .env.example                # Environment variable declarations
├── index.html                  # HTML entry point with title & meta tags
├── metadata.json               # Platform configuration metadata
├── package.json                # Project dependencies and scripts
└── vite.config.ts              # Vite configuration with AI server plugin
```

---

## ⚙️ Getting Started & Installation

### Prerequisites
- Node.js 22 or higher
- npm 10 or higher

### Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

Configure your environment variables in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_optional
VITE_API_BASE_URL=
```

### Installation
Install project dependencies:
```bash
npm install
```

### Running Development Server
Start the development server on `0.0.0.0:3000`:
```bash
npm run dev
```

### Building for Production
Compile TypeScript and build static production assets:
```bash
npm run build
```

---

## 🔌 API Endpoints Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/ai/analyze-incident` | `POST` | Multi-tier AI incident analysis (Gemini / Groq / Local NLP) |
| `/api/v1/ai/health` | `GET` | Health & configuration status of AI providers |
| `/api/v1/incidents` | `GET`, `POST`, `PATCH` | Incident report querying, creation, & SDMA verification |
| `/api/v1/roads` | `GET`, `PATCH` | Road segment status & risk levels |
| `/api/v1/vehicles` | `GET`, `PATCH` | Fleet telemetry, route planning, & rerouting status |
| `/api/v1/disruptions` | `GET`, `POST` | Corridor disruption tracking |
| `/api/v1/emergency-pickups` | `GET`, `POST`, `PATCH` | Emergency inventory pickup requests |
| `/api/v1/shipments` | `GET`, `PATCH` | Cargo & cold-chain shipment monitoring |
| `/api/v1/godowns` | `GET`, `PATCH` | Regional relief inventory & godown capacity |
| `/api/v1/health` | `GET` | System & database health stats |

---

## 📄 License

This platform is developed for smart logistics and accessibility intelligence in the North Eastern Region of India.
