import type {
  Driver,
  Trip,
  Vehicle,
  Incident,
  RoadSegment,
  Corridor,
  SystemMetrics,
  Godown,
} from '@/types';

// ─── Locations ────────────────────────────────────────────────────────────────

export const LOCATIONS = {
  guwahati: {
    name: 'Guwahati Logistics Hub',
    shortName: 'Guwahati',
    lat: 26.1445,
    lng: 91.7362,
    district: 'Kamrup',
    state: 'Assam',
  },
  imphal: {
    name: 'Imphal District Hospital',
    shortName: 'Imphal',
    lat: 24.8170,
    lng: 93.9368,
    district: 'Imphal West',
    state: 'Manipur',
  },
  dimapur: {
    name: 'Dimapur Supply Node',
    shortName: 'Dimapur',
    lat: 25.9093,
    lng: 93.7265,
    district: 'Dimapur',
    state: 'Nagaland',
  },
  kohima: {
    name: 'Kohima Relief Camp',
    shortName: 'Kohima',
    lat: 25.6751,
    lng: 94.1086,
    district: 'Kohima',
    state: 'Nagaland',
  },
  silchar: {
    name: 'Silchar Medical Depot',
    shortName: 'Silchar',
    lat: 24.8268,
    lng: 92.7981,
    district: 'Cachar',
    state: 'Assam',
  },
};

// ─── Demo Driver ──────────────────────────────────────────────────────────────

export const DEMO_DRIVER: Driver = {
  id: 'DRV-001',
  name: 'Arjun Baruah',
  vehicleId: 'AS-01-J-4422',
  vehicleType: 'Refrigerated Medium Truck',
  phone: '+91 98640 12345',
  networkStatus: 'online',
};

// ─── Demo Routes ─────────────────────────────────────────────────────────────

export const DEMO_ROUTES = {
  saferRoute: {
    id: 'route-a',
    label: 'Route A — Safer',
    description: 'Via Dimapur Hill Road',
    riskScore: 18,
    riskLevel: 'low' as const,
    etaMinutes: 615, // 10h 15m
    distanceKm: 498,
    recommended: true,
    segmentIds: ['rd-002', 'rd-003'],
    waypoints: [
      [26.1445, 91.7362] as [number, number],
      [25.9093, 93.7265] as [number, number],
      [25.6751, 94.1086] as [number, number],
      [24.8170, 93.9368] as [number, number],
    ],
  },
  fasterRoute: {
    id: 'route-b',
    label: 'Route B — Faster',
    description: 'Via NH-2 Direct',
    riskScore: 82,
    riskLevel: 'high' as const,
    etaMinutes: 525, // 8h 45m
    distanceKm: 421,
    recommended: false,
    segmentIds: ['rd-001'],
    waypoints: [
      [26.1445, 91.7362] as [number, number],
      [25.5000, 93.2000] as [number, number],
      [24.8170, 93.9368] as [number, number],
    ],
    riskSegments: [
      {
        from: [25.5000, 93.2000] as [number, number],
        to: [24.8170, 93.9368] as [number, number],
        riskLevel: 'high' as const,
        reason: 'Active landslide zone — NH-2 km 312-349',
      },
    ],
  },
};

// ─── Demo Trip ────────────────────────────────────────────────────────────────

export const DEMO_TRIP: Trip = {
  id: 'TRP-2026-0891',
  driver: DEMO_DRIVER,
  origin: LOCATIONS.guwahati,
  destination: LOCATIONS.imphal,
  cargo: {
    type: 'Cold-Chain Medical Supplies',
    description: 'Vaccines, insulin, temperature-sensitive pharmaceuticals',
    priority: 'critical',
    temperatureControlled: true,
    weight: '1,240 kg',
  },
  status: 'idle',
  routes: [DEMO_ROUTES.saferRoute, DEMO_ROUTES.fasterRoute],
};

// ─── Incidents ────────────────────────────────────────────────────────────────
// Scenario incidents preserved for presentation simulation triggers.
export const SCENARIO_INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-8891',
    type: 'landslide',
    severity: 'high',
    location: [25.3200, 93.5500],
    locationName: 'NH-2 near Mao Gate, km 312',
    locationSource: 'DEVICE_GPS',
    description:
      'Major landslide blocking NH-2. Debris covers approximately 80m of road. Multiple boulders present. Road completely impassable.',
    reportedBy: 'Arjun Baruah (DRV-001)',
    reportedVehicleId: 'AS-01-J-4422',
    reportedAt: '2026-09-03T08:42:00+05:30',
    syncStatus: 'pending_verification',
    photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
    voiceNote: true,
    voiceTranscript: 'Bhal boroxun hoi ase, rasta bondo hoi gose Mao Gateor osorot.',
    voiceLanguage: 'Assamese (অসমীয়া)',
    voiceDurationSec: 14,
    affectedRouteId: 'route-b',
    aiAnalysis: {
      hazardCategory: 'landslide',
      estimatedSeverity: 'high',
      roadImpact: 'fully_blocked',
      englishSummary: 'Major slope collapse with heavy shale mud and boulders on NH-2 near Mao Gate. Transit impassable.',
      extractedEntities: ['NH-2', 'KM 312', 'Mao Gate', 'Landslide'],
      recommendedAction: 'Execute immediate detour via Route A Dimapur hill corridor.',
      confidenceScore: 0.96,
      detectedLanguage: 'Assamese (অসমীয়া)',
      provider: 'Local Autonomous NLP (Deterministic Fallback)',
      verificationPriority: 'critical',
    },
  },
  {
    id: 'INC-2026-8843',
    type: 'flood',
    severity: 'moderate',
    location: [25.8000, 93.4200],
    locationName: 'Doyyang River Bridge, Wokha District',
    locationSource: 'SIMULATED',
    description:
      'River overflowing bridge deck. Water level at 0.4m above road surface. Heavy vehicles not advised.',
    reportedBy: 'State Highway Patrol',
    reportedAt: '2026-09-03T06:15:00+05:30',
    syncStatus: 'verified',
    affectedRouteId: 'route-a',
    aiAnalysis: {
      hazardCategory: 'flood',
      estimatedSeverity: 'moderate',
      roadImpact: 'caution',
      englishSummary: 'Doyyang River overflowing bridge deck by 0.4m. Single-lane slow transit for high-clearance vehicles only.',
      extractedEntities: ['Doyyang River', 'Wokha', 'Bridge Deck'],
      recommendedAction: 'Proceed with low gear caution or hold at Dimapur staging node.',
      confidenceScore: 0.91,
      detectedLanguage: 'English',
      provider: 'Local Autonomous NLP (Deterministic Fallback)',
      verificationPriority: 'medium',
    },
  },
  {
    id: 'INC-2026-8802',
    type: 'rockfall',
    severity: 'moderate',
    location: [25.6200, 94.0800],
    locationName: 'Senapati District, NH-39 km 158',
    locationSource: 'DEVICE_GPS',
    description:
      'Multiple rockfall events. Road partially blocked. Single-lane traffic possible with caution.',
    reportedBy: 'Kumar Singh (DRV-007)',
    reportedAt: '2026-09-02T16:30:00+05:30',
    syncStatus: 'verified',
    aiAnalysis: {
      hazardCategory: 'rockfall',
      estimatedSeverity: 'moderate',
      roadImpact: 'caution',
      englishSummary: 'Moderate scree and rockfall on NH-39 km 158. Partial single-lane lane available.',
      extractedEntities: ['NH-39', 'KM 158', 'Senapati'],
      recommendedAction: 'Maintain reduced speed and caution around mountain bends.',
      confidenceScore: 0.89,
      detectedLanguage: 'Hindi (हिन्दी)',
      provider: 'Local Autonomous NLP (Deterministic Fallback)',
      verificationPriority: 'medium',
    },
  },
  {
    id: 'INC-2026-8791',
    type: 'road_washout',
    severity: 'critical',
    location: [24.9500, 93.7800],
    locationName: 'Kangpokpi District, Inner Manipur Road',
    locationSource: 'SIMULATED',
    description:
      'Road washout 30m section. Bridge approach damaged. All traffic diverted.',
    reportedBy: 'Field Officer — SDMA Manipur',
    reportedAt: '2026-09-02T11:00:00+05:30',
    syncStatus: 'verified',
    verifiedBy: 'Ranjit Sharma (SDMA-NE)',
    verifiedAt: '2026-09-02T13:45:00+05:30',
    aiAnalysis: {
      hazardCategory: 'road_washout',
      estimatedSeverity: 'critical',
      roadImpact: 'fully_blocked',
      englishSummary: 'Complete carriageway collapse along 30m section. Culvert washed away.',
      extractedEntities: ['Kangpokpi', 'Inner Manipur Road', 'Culvert Washout'],
      recommendedAction: 'Total closure. Divert all logistics via NH-29.',
      confidenceScore: 0.98,
      detectedLanguage: 'English',
      provider: 'Local Autonomous NLP (Deterministic Fallback)',
      verificationPriority: 'critical',
    },
  },
];

// Clean initial state starts with 0 active incidents until created or simulated
export const DEMO_INCIDENTS: Incident[] = [];

// ─── Road Segments ────────────────────────────────────────────────────────────
// Initial clean operational baseline: all corridors open with low risk

export const DEMO_ROAD_SEGMENTS: RoadSegment[] = [
  {
    id: 'rd-001',
    name: 'NH-2 Mao Gate Segment',
    fromLocation: 'Senapati',
    toLocation: 'Mao Gate',
    status: 'open',
    riskLevel: 'low',
    lastUpdated: '2026-09-03T07:00:00+05:30',
  },
  {
    id: 'rd-002',
    name: 'Doyyang River Bridge',
    fromLocation: 'Wokha',
    toLocation: 'Merapani',
    status: 'open',
    riskLevel: 'low',
    lastUpdated: '2026-09-03T07:00:00+05:30',
  },
  {
    id: 'rd-003',
    name: 'NH-39 Senapati Section',
    fromLocation: 'Maram',
    toLocation: 'Senapati',
    status: 'open',
    riskLevel: 'low',
    lastUpdated: '2026-09-03T07:00:00+05:30',
  },
  {
    id: 'rd-004',
    name: 'Guwahati–Shillong Highway',
    fromLocation: 'Guwahati',
    toLocation: 'Shillong',
    status: 'open',
    riskLevel: 'low',
    lastUpdated: '2026-09-03T07:00:00+05:30',
  },
  {
    id: 'rd-005',
    name: 'Inner Manipur Ring Road',
    fromLocation: 'Kangpokpi',
    toLocation: 'Imphal',
    status: 'open',
    riskLevel: 'low',
    lastUpdated: '2026-09-03T07:00:00+05:30',
  },
];

// ─── Fleet ────────────────────────────────────────────────────────────────────
// Initial clean operational fleet: all vehicles safe and on route or idle

export const DEMO_FLEET: Vehicle[] = [
  {
    id: 'AS-01-J-4422',
    driverName: 'Arjun Baruah',
    type: 'Refrigerated Truck',
    status: 'idle',
    riskLevel: 'low',
    location: [26.1445, 91.7362],
    origin: 'Guwahati',
    destination: 'Imphal',
    cargoType: 'Cold-Chain Medical Supplies',
    plannedRouteId: 'route-a',
    assignedCorridorId: 'cor-001',
    plannedSegmentIds: ['rd-002', 'rd-003'],
  },
  {
    id: 'MN-04-B-1121',
    driverName: 'Prem Thoudam',
    type: 'Light Goods Vehicle',
    status: 'on_route',
    riskLevel: 'low',
    location: [25.3500, 93.5800],
    origin: 'Dimapur',
    destination: 'Imphal',
    etaMinutes: 145,
    cargoType: 'Emergency Pharmaceuticals',
    plannedRouteId: 'route-b',
    assignedCorridorId: 'cor-001',
    plannedSegmentIds: ['rd-001'],
  },
  {
    id: 'NL-02-C-3391',
    driverName: 'Kezhakevi Sema',
    type: 'Heavy Truck',
    status: 'on_route',
    riskLevel: 'low',
    location: [25.3200, 93.5500],
    origin: 'Guwahati',
    destination: 'Kohima',
    etaMinutes: 195,
    cargoType: 'Relief Rations & Grain',
    plannedRouteId: 'route-b',
    assignedCorridorId: 'cor-001',
    plannedSegmentIds: ['rd-001'],
  },
  {
    id: 'AS-03-K-7712',
    driverName: 'Rina Gogoi',
    type: 'Medical Supply Van',
    status: 'on_route',
    riskLevel: 'low',
    location: [25.8200, 93.4000],
    origin: 'Guwahati',
    destination: 'Dimapur',
    etaMinutes: 62,
    cargoType: 'Diagnostic Lab Samples',
    plannedRouteId: 'route-a',
    assignedCorridorId: 'cor-002',
    plannedSegmentIds: ['rd-004'],
  },
  {
    id: 'MN-01-A-9934',
    driverName: 'Tomcha Singh',
    type: 'Light Goods Vehicle',
    status: 'on_route',
    riskLevel: 'low',
    location: [25.5500, 94.0500],
    origin: 'Kohima',
    destination: 'Imphal',
    etaMinutes: 88,
    cargoType: 'Surgical Consumables',
    plannedRouteId: 'route-a',
    assignedCorridorId: 'cor-003',
    plannedSegmentIds: ['rd-003'],
  },
  {
    id: 'AS-07-D-2245',
    driverName: 'Bhuban Sharma',
    type: 'Heavy Truck',
    status: 'on_route',
    riskLevel: 'low',
    location: [25.7000, 93.8000],
    origin: 'Dimapur',
    destination: 'Kohima',
    etaMinutes: 37,
    cargoType: 'Disaster Shelter Materials',
    plannedRouteId: 'route-a',
    assignedCorridorId: 'cor-002',
    plannedSegmentIds: ['rd-004'],
  },
  {
    id: 'NL-05-H-4481',
    driverName: 'Vikato Angami',
    type: 'Medium Truck',
    status: 'on_route',
    riskLevel: 'low',
    location: [25.9800, 93.6500],
    origin: 'Guwahati',
    destination: 'Dimapur',
    etaMinutes: 20,
    cargoType: 'Water Purification Units',
    plannedRouteId: 'route-a',
    assignedCorridorId: 'cor-002',
    plannedSegmentIds: ['rd-004'],
  },
];

// ─── Corridors ────────────────────────────────────────────────────────────────

export const DEMO_CORRIDORS: Corridor[] = [
  {
    id: 'cor-001',
    name: 'Assam → Manipur',
    fromState: 'Assam',
    toState: 'Manipur',
    riskLevel: 'low',
    activeVehicles: 2,
    incidents: 0,
  },
  {
    id: 'cor-002',
    name: 'Assam → Nagaland',
    fromState: 'Assam',
    toState: 'Nagaland',
    riskLevel: 'low',
    activeVehicles: 3,
    incidents: 0,
  },
  {
    id: 'cor-003',
    name: 'Nagaland → Manipur',
    fromState: 'Nagaland',
    toState: 'Manipur',
    riskLevel: 'low',
    activeVehicles: 1,
    incidents: 0,
  },
  {
    id: 'cor-004',
    name: 'Assam → Meghalaya',
    fromState: 'Assam',
    toState: 'Meghalaya',
    riskLevel: 'low',
    activeVehicles: 0,
    incidents: 0,
  },
];

// ─── System Metrics ───────────────────────────────────────────────────────────

export const DEMO_METRICS: SystemMetrics = {
  activeTrips: 6,
  regionalRisk: 'low',
  activeIncidents: 0,
  connectivityStatus: 'operational',
  vehiclesSafe: 6,
  vehiclesModerate: 0,
  vehiclesHighRisk: 0,
  pendingVerifications: 0,
};

// ─── Demo / synthetic godowns (Step 7) ──────────────────────────────────────
// NOT real government inventory. Seeded only for the supply-continuity prototype.

export const DEMO_GODOWNS: Godown[] = [
  {
    id: 'gd-dimapur',
    name: 'Dimapur Regional Relief Godown',
    location: [25.9093, 93.7265],
    locationLabel: 'Dimapur',
    suitableCargoTypes: ['relief', 'rations', 'grain', 'general'],
    availableStock: 120,
  },
  {
    id: 'gd-kohima',
    name: 'Kohima Emergency Logistics Godown',
    location: [25.6751, 94.1086],
    locationLabel: 'Kohima',
    suitableCargoTypes: ['pharmaceuticals', 'relief', 'medical'],
    availableStock: 80,
  },
  {
    id: 'gd-imphal',
    name: 'Imphal Medical Buffer Godown',
    location: [24.8170, 93.9368],
    locationLabel: 'Imphal',
    suitableCargoTypes: ['medical', 'pharmaceuticals', 'cold-chain'],
    availableStock: 60,
  },
];
