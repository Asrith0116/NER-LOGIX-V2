// Core domain types for NER-LOGIX

export type RiskLevel = 'low' | 'moderate' | 'high' | 'blocked';
export type NetworkStatus = 'online' | 'offline' | 'syncing';
export type UserRole = 'driver' | 'dispatcher' | 'sdma' | 'contractor';

// ─── Trip ────────────────────────────────────────────────────────────────────

export type CargoPriority = 'low' | 'normal' | 'high' | 'critical';
export type TripStatus = 'idle' | 'active' | 'completed' | 'disrupted';

export interface Location {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  district?: string;
  state?: string;
}

export interface Route {
  id: string;
  label: string;
  description: string;
  riskScore: number;
  riskLevel: RiskLevel;
  etaMinutes: number;
  distanceKm: number;
  recommended: boolean;
  waypoints: [number, number][];
  riskSegments?: RouteRiskSegment[];
  /** Demo corridor segments this route traverses — used for disruption avoidance */
  segmentIds?: string[];
}

export interface RouteRiskSegment {
  from: [number, number];
  to: [number, number];
  riskLevel: RiskLevel;
  reason?: string;
}

export interface Trip {
  id: string;
  driver: Driver;
  origin: Location;
  destination: Location;
  cargo: CargoInfo;
  status: TripStatus;
  selectedRouteId?: string;
  routes: Route[];
  startedAt?: string;
  estimatedArrival?: string;
}

export interface CargoInfo {
  type: string;
  description: string;
  priority: CargoPriority;
  temperatureControlled: boolean;
  weight?: string;
}

// ─── Driver ──────────────────────────────────────────────────────────────────

export interface Driver {
  id: string;
  name: string;
  vehicleId: string;
  vehicleType: string;
  phone: string;
  networkStatus: NetworkStatus;
}

// ─── Vehicle / Fleet ─────────────────────────────────────────────────────────

export type VehicleStatus = 'on_route' | 'idle' | 'disrupted' | 'offline' | 'emergency_pickup';
export type RerouteStatus = 'none' | 'recommended' | 'active' | 'no_alternative';

export interface Vehicle {
  id: string;
  driverName: string;
  type: string;
  status: VehicleStatus;
  riskLevel: RiskLevel;
  location: [number, number];
  currentRoute?: string;
  origin?: string;
  destination?: string;
  lastSeen?: string;
  etaMinutes?: number;
  cargoType?: string;
  plannedRouteId?: string;
  assignedCorridorId?: string;
  plannedSegmentIds?: string[];
  affectedByDisruptionId?: string;
  impactReason?: string;
  rerouteStatus?: RerouteStatus;
  rerouteReason?: string;
  reroutedAt?: string;
  rerouteFrom?: [number, number];
  rerouteFromLabel?: string;
  rerouteTo?: string;
  previousRouteId?: string;
  rerouteWaypoints?: [number, number][];
  recommendedGodownId?: string;
  recommendedGodownDistanceKm?: number;
}

// ─── Incident ─────────────────────────────────────────────────────────────────

export type IncidentType =
  | 'landslide'
  | 'rockfall'
  | 'flood'
  | 'road_washout'
  | 'bridge_damage'
  | 'tree_fall'
  | 'fog'
  | 'other';

export type IncidentSeverity = 'low' | 'moderate' | 'high' | 'critical';

export type IncidentSyncStatus =
  | 'local_pending'
  | 'synced'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: [number, number];
  locationName: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  syncStatus: IncidentSyncStatus;
  photoUrl?: string;
  voiceNote?: boolean;
  voiceNoteUrl?: string;
  voiceTranscript?: string;
  voiceLanguage?: string;
  aiAnalysis?: IncidentAiAnalysis;
  affectedRouteId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface IncidentAiAnalysis {
  detectedLanguage: string;
  originalText?: string;
  englishSummary: string;
  hazardCategory: IncidentType;
  estimatedSeverity: IncidentSeverity;
  roadImpact: 'partially_blocked' | 'fully_blocked' | 'single_lane' | 'caution' | 'bridge_impassable';
  confidenceScore: number;
  extractedEntities: string[];
  recommendedAction: string;
}

export interface RiskFactorBreakdown {
  totalScore: number;
  riskCategory: RiskLevel;
  factors: {
    rainfall: { score: number; max: number; label: string; value: string };
    slopeTerrain: { score: number; max: number; label: string; value: string };
    historicalDisruptions: { score: number; max: number; label: string; value: string };
    activeHazards: { score: number; max: number; label: string; value: string };
    vehicleWeightModifier: { score: number; max: number; label: string; value: string };
  };
  plainLanguageExplanation: string;
  recommendation: string;
}

export interface WeatherDataPoint {
  locationName: string;
  lat: number;
  lng: number;
  temperatureC: number;
  precipitationMm: number;
  rainfallCategory: 'none' | 'light' | 'moderate' | 'heavy' | 'torrential';
  windSpeedKmh: number;
  weatherCode: number;
  weatherDescription: string;
  forecast24hMm: number;
  updatedAt: string;
  isSimulated?: boolean;
}

// ─── Road Status ─────────────────────────────────────────────────────────────

export type RoadStatus = 'open' | 'caution' | 'high_risk' | 'blocked';

export interface RoadSegment {
  id: string;
  name: string;
  fromLocation: string;
  toLocation: string;
  status: RoadStatus;
  riskLevel: RiskLevel;
  lastUpdated: string;
  affectedByIncidentId?: string;
}

// ─── Corridor ─────────────────────────────────────────────────────────────────

export interface Corridor {
  id: string;
  name: string;
  fromState: string;
  toState: string;
  riskLevel: RiskLevel;
  activeVehicles: number;
  incidents: number;
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface SystemMetrics {
  activeTrips: number;
  regionalRisk: RiskLevel;
  activeIncidents: number;
  connectivityStatus: 'operational' | 'partial' | 'degraded';
  vehiclesSafe: number;
  vehiclesModerate: number;
  vehiclesHighRisk: number;
  pendingVerifications: number;
}

// ─── Disruption ──────────────────────────────────────────────────────────────
// A verified/provisional event tying an Incident to an affected RoadSegment.
// Used by the shared networkStore to propagate disruption state across roles.

export type DisruptionStatus = 'provisional' | 'active' | 'cleared';

export interface Disruption {
  id: string;
  incidentId: string;
  affectedSegmentId: string;
  status: DisruptionStatus;
  createdAt: string;
  updatedAt: string;
  /** Vehicle IDs on or approaching the affected segment — populated in Step 5 */
  affectedVehicleIds?: string[];
}

// ─── Emergency pickup / godown fallback (Step 7) ─────────────────────────────
// Prototype continuity layer when no viable alternate corridor exists.

export interface Godown {
  id: string;
  name: string;
  location: [number, number];
  locationLabel: string;
  suitableCargoTypes: string[];
  availableStock: number;
}

export type EmergencyPickupStatus = 'requested' | 'approved' | 'declined' | 'dispatched';

export interface EmergencyPickupRequest {
  id: string;
  vehicleId: string;
  driverName: string;
  cargoType: string;
  destination: string;
  godownId: string;
  godownName: string;
  status: EmergencyPickupStatus;
  requestedAt: string;
  approvedAt?: string;
  dispatchedAt?: string;
  contractorName?: string;
  quantity: number;
  reason: string;
  destinationNotified?: boolean;
}
