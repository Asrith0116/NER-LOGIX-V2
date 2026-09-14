// Core domain types for NER-LOGIX

export type RiskLevel = 'low' | 'moderate' | 'high' | 'blocked';
export type NetworkStatus = 'online' | 'offline' | 'syncing';
export type UserRole = 'driver' | 'dispatcher' | 'sdma' | 'contractor';

// ─── Trip ────────────────────────────────────────────────────────────────────

export type CargoPriority = 'low' | 'normal' | 'high' | 'critical';
export type TripStatus = 'idle' | 'active' | 'completed' | 'disrupted';

export type CargoSensitivity = 'low' | 'medium' | 'high' | 'critical';
export type TripPriority = 'standard' | 'high' | 'urgent' | 'emergency';

export interface OperationalConstraints {
  requireColdChain: boolean;
  avoidHighRiskCorridors: boolean;
  maxDelayTolerance: 'strict' | 'moderate' | 'flexible';
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  avoidUnpavedSections: boolean;
}

export interface TripRequest {
  origin: Location;
  destination: Location;
  vehicleId: string;
  vehicleType: string;
  driverName: string;
  cargoCategory: string;
  cargoSensitivity: CargoSensitivity;
  priority: TripPriority;
  departureWindow: 'immediate' | 'within_2h' | 'morning_clear';
  constraints: OperationalConstraints;
}

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

export interface RouteFeatureBreakdown {
  terrainSlopeDegrees: number;
  historicalDisruptionsCount: number;
  rainfallMmPerHour: number;
  activeIncidentsCount: number;
  activeBlockedSegmentsCount: number;
  vehicleSuitability: 'optimal' | 'acceptable' | 'penalized' | 'restricted';
  cargoVulnerabilityScore: number;
  prioritySpeedWeight: number;
  riskComponents: {
    terrain: number;
    weather: number;
    historical: number;
    incidents: number;
    vehicle: number;
    cargo: number;
  };
}

export interface RouteCandidate extends Route {
  corridorKey?: string;
  corridorName: string;
  operationalScore: number; // 0-100 overall composite suitability
  suitability: 'High' | 'Moderate' | 'Constrained' | 'Unsuitable';
  recommendationRank: number;
  recommendationReason: string;
  advantages: string[];
  disadvantages: string[];
  riskFactors: string[];
  isBlocked: boolean;
  blockageReason?: string;
  featureBreakdown: RouteFeatureBreakdown;
  providerId: string;
  providerType: 'SEED' | 'SIMULATED' | 'LIVE_PROVIDER';
}

export interface OperationalContext {
  roadSegments: RoadSegment[];
  disruptions: Disruption[];
  activeIncidents: Incident[];
  weatherData?: Record<string, WeatherDataPoint>;
  historicalHazards?: Record<string, CorridorHazardExposure>;
  elevationProfiles?: Record<string, ElevationProfile>;
  osmNetwork?: OsmNetworkSnapshot;
}

export interface RouteProvider {
  id: string;
  name: string;
  isLive: boolean;
  findCandidates: (
    request: TripRequest,
    context: OperationalContext
  ) => Promise<RouteCandidate[]> | RouteCandidate[];
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
  speedKmh?: number;
  heading?: number;
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
  | 'flood'
  | 'rockfall'
  | 'road_washout'
  | 'bridge_damage'
  | 'tree_fall'
  | 'vehicle_accident'
  | 'severe_weather'
  | 'road_closure'
  | 'pothole_surface'
  | 'fire_smoke'
  | 'other';

export type IncidentSeverity = 'low' | 'moderate' | 'high' | 'critical';

export type IncidentSyncStatus =
  | 'local_pending'
  | 'synced'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export type LocationSource = 'DEVICE_GPS' | 'SIMULATED' | 'FALLBACK';

export interface LocationSnapshot {
  lat: number;
  lng: number;
  locationName: string;
  accuracyMeters?: number;
  source: LocationSource;
  timestamp: string;
}

export interface IncidentCorrelationInfo {
  isDuplicateOrCorroborating: boolean;
  corroboratingIncidentIds?: string[];
  isConflicting: boolean;
  conflictReason?: string;
  correlationNotes?: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: [number, number];
  locationName: string;
  locationSource?: LocationSource;
  description: string;
  reportedBy: string;
  reportedVehicleId?: string;
  reportedAt: string;
  syncStatus: IncidentSyncStatus;
  photoUrl?: string;
  photoCapturedAt?: string;
  voiceNote?: boolean;
  voiceNoteUrl?: string;
  voiceTranscript?: string;
  voiceLanguage?: string;
  voiceDurationSec?: number;
  aiAnalysis?: IncidentAiAnalysis;
  affectedRouteId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  correlation?: IncidentCorrelationInfo;
}

export interface IncidentAiAnalysis {
  detectedLanguage: string;
  originalText?: string;
  englishSummary: string;
  hazardCategory: IncidentType;
  estimatedSeverity: IncidentSeverity;
  roadImpact: 'partially_blocked' | 'fully_blocked' | 'single_lane' | 'caution' | 'bridge_impassable' | 'none';
  confidenceScore?: number | null;
  qualitativeConfidence?: string;
  extractedEntities: string[];
  recommendedAction: string;
  verificationPriority: 'critical' | 'high' | 'medium' | 'low';
  provider: string;
  model?: string;
  statusLabel?: 'Gemini AI · Live' | 'Groq · Live' | 'NER-LOGIX Heuristic · Offline' | string;
  isLiveGemini?: boolean;
  isLiveGroq?: boolean;
  isAiDriven?: boolean;
  generatedAt?: string;
  diagnostics?: {
    endpoint?: string;
    httpStatus?: number;
    error?: string;
  };
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
  precipitationIntensity?: 'none' | 'light' | 'moderate' | 'heavy' | 'torrential';
  rainfallCategory: 'none' | 'light' | 'moderate' | 'heavy' | 'torrential';
  windSpeedKmh: number;
  weatherCode: number;
  weatherDescription: string;
  forecast24hMm: number;
  updatedAt: string;
  observedAt?: string;
  source?: 'Open-Meteo' | 'Fallback / Demo';
  freshness?: string;
  availabilityState?: 'live' | 'cached' | 'fallback';
  isSimulated?: boolean;
}

export interface EnvironmentalSnapshot extends WeatherDataPoint {
  observedAt: string;
  source: 'Open-Meteo' | 'Fallback / Demo';
  freshness: string;
  availabilityState: 'live' | 'cached' | 'fallback';
  precipitationIntensity: 'none' | 'light' | 'moderate' | 'heavy' | 'torrential';
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
  totalCapacity?: number;
  status?: 'operational' | 'congested' | 'offline';
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
  alternativeGodownId?: string;
  declineReason?: string;
}

// ─── Shipment & Logistics Continuity (Step 9) ─────────────────────────────────

export type ShipmentPriority = 'low' | 'normal' | 'high' | 'critical';

export type ShipmentStatus =
  | 'scheduled'
  | 'in_transit'
  | 'delayed'
  | 'rerouted'
  | 'disrupted'
  | 'relief_buffered'
  | 'delivered';

export type ContinuityStatus =
  | 'on_track'
  | 'monitored'
  | 'at_risk'
  | 'rerouting'
  | 'relief_requested'
  | 'relief_secured'
  | 'escalated';

export interface Shipment {
  id: string;
  vehicleId: string;
  driverName: string;
  origin: string;
  destination: string;
  cargoCategory: string;
  cargoSensitivity: CargoSensitivity;
  priority: ShipmentPriority;
  priorityScore: number;
  priorityExplanation: string;
  quantity: number;
  unit: string;
  coldChainRequired: boolean;
  currentTemperatureC?: number;
  currentStatus: ShipmentStatus;
  affected: boolean;
  disruptionId?: string;
  delayMinutes?: number;
  continuityStatus: ContinuityStatus;
  impactReason?: string;
  recommendedAction?: string;
  assignedGodownId?: string;
  pickupRequestId?: string;
  lastUpdated: string;
}

export interface ShipmentImpactResult {
  totalShipments: number;
  affectedShipments: Shipment[];
  affectedCount: number;
  criticalCount: number;
  coldChainAtRiskCount: number;
  activeContinuityRequests: number;
  timestamp: string;
}

// ─── Phase 2 Real Data Integrations ──────────────────────────────────────────

export interface OsmRoadSegment {
  id: string;
  osmId: number | string;
  ref: string; // e.g. "NH 2", "NH 29"
  name: string;
  highway: 'trunk' | 'primary' | 'secondary' | 'unclassified' | 'residential';
  surface: 'asphalt' | 'paved' | 'unpaved' | 'concrete' | 'gravel';
  lanes: number;
  maxspeedKmh: number;
  lengthKm: number;
  coordinates: [number, number][];
  source: 'OpenStreetMap' | 'Fallback / Baseline';
  isSimulated: boolean;
  availabilityState: 'live' | 'cached' | 'fallback';
  provenance: {
    license: string;
    copyright: string;
    queryTimestamp: string;
  };
}

export interface OsmCorridorDetail {
  corridorKey: string;
  corridorName: string;
  primaryHighwayRef: string;
  totalLengthKm: number;
  osmWayCount: number;
  pavedPercentage: number;
  averageLanes: number;
  speedLimitKmh: number;
  segments: OsmRoadSegment[];
}

export interface OsmNetworkSnapshot {
  roadSegments: OsmRoadSegment[];
  corridors: Record<string, OsmCorridorDetail>;
  source: 'OpenStreetMap' | 'Fallback / Baseline';
  isSimulated: boolean;
  availabilityState: 'live' | 'cached' | 'fallback';
  fetchedAt: string;
  provenance: {
    license: string;
    copyright: string;
    notes: string;
  };
}

export interface HistoricalHazardRecord {
  id: string;
  catalog: 'NASA_GLC' | 'GSI_LANDSLIDE_INVENTORY';
  eventName: string;
  latitude: number;
  longitude: number;
  locationDescription: string;
  state: 'Assam' | 'Manipur' | 'Nagaland' | 'Meghalaya' | 'Mizoram';
  corridorProximity: 'valley_low_risk' | 'nh2_mountain_direct' | 'southern_bypass' | 'wokha_ridge';
  eventYear: number;
  eventDate: string;
  trigger: 'monsoon_rain' | 'cloudburst' | 'continuous_rainfall' | 'road_cut_instability' | 'cyclone';
  hazardCategory: 'debris_flow' | 'mudslide' | 'rockfall' | 'rotational_slide' | 'washout';
  severity: 'major' | 'severe' | 'moderate';
  fatalities: number;
  estimatedVolumeM3: number;
  source: 'NASA Global Landslide Catalog & GSI Inventory' | 'Fallback / Demo';
  isSimulated: boolean;
  availabilityState: 'live' | 'fallback';
  provenance: {
    license: string;
    documentation: string;
  };
}

export interface CorridorHazardExposure {
  corridorKey: string;
  corridorName: string;
  totalRecordedEvents: number;
  majorFailuresCount: number;
  recentEventsCount: number; // Past 5 years
  primaryTrigger: string;
  triggerBreakdown: Record<string, number>;
  historicalSeasonalRiskScore: number; // 0 to 20
  summaryExplanation: string;
  records: HistoricalHazardRecord[];
  source: 'NASA Global Landslide Catalog & GSI Inventory' | 'Fallback / Demo';
  isSimulated: boolean;
  availabilityState: 'live' | 'fallback';
  calculatedAt: string;
}

export interface HistoricalHazardSummary {
  corridors: Record<string, CorridorHazardExposure>;
  totalCatalogRecords: number;
  source: string;
  isSimulated: boolean;
  availabilityState: 'live' | 'fallback';
  timestamp: string;
}

export interface BackendVehiclePosition {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  accuracyMeters: number;
  timestamp: string;
  source: 'simulated_driver_client' | 'manual_dispatcher' | 'external_telematics_gateway';
  isSimulated: boolean;
  telemetryState: 'simulated_client_signal' | 'manual_entry' | 'active_gateway';
  nearestLocation?: string;
  provenance: {
    description: string;
    isHardwareTelematics: boolean;
  };
}

export interface VehiclePositionUpdatePayload {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  accuracyMeters?: number;
  source?: 'simulated_driver_client' | 'manual_dispatcher' | 'external_telematics_gateway';
  timestamp?: string;
}

export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevationM: number;
  locationName?: string;
}

export interface ElevationProfile {
  corridorKey: string;
  corridorName: string;
  minElevationM: number;
  maxElevationM: number;
  minElevationMeters?: number;
  maxElevationMeters?: number;
  elevationGainMeters?: number;
  totalClimbM: number;
  totalDescentM: number;
  maxSlopePercent: number;
  averageSlopeDegrees: number;
  peakLocationName: string;
  terrainRiskScore: number; // 0 to 25
  profilePoints: ElevationPoint[];
  source: 'Open-Meteo Elevation API — Copernicus DEM GLO-90 (90 m)' | 'Fallback / Regional DEM';
  isSimulated: boolean;
  availabilityState: 'live' | 'fallback';
  calculatedAt: string;
}

export interface GeospatialSnapResult {
  incidentLat: number;
  incidentLng: number;
  snappedSegmentId?: string;
  snappedRoadName?: string;
  highwayRef?: string;
  distanceMeters: number;
  confidence: number;
  snappedCoordinates?: [number, number];
  isWithinThreshold: boolean;
}


