import { create } from 'zustand';
import type {
  Incident,
  RoadSegment,
  Vehicle,
  VehicleStatus,
  Disruption,
  IncidentSyncStatus,
  RoadStatus,
  RiskLevel,
  Route,
  RerouteStatus,
  Godown,
  EmergencyPickupRequest,
  EnvironmentalSnapshot,
  Shipment,
  CorridorHazardExposure,
  ElevationProfile,
  OsmNetworkSnapshot,
  BackendVehiclePosition,
} from '@/types';
import {
  DEMO_INCIDENTS,
  DEMO_ROAD_SEGMENTS,
  DEMO_FLEET,
  DEMO_ROUTES,
  LOCATIONS,
  DEMO_GODOWNS,
  DEMO_SHIPMENTS,
} from '@/data/demo';
import {
  saveIncident,
  getAllIncidents,
  saveDisruption,
  getAllDisruptions,
  clearAllStoredData,
} from '@/utils/idb';
import { correlateIncidents } from '@/services/incidentCorrelation';
import { getBaselineRegionalWeather, applySpikeToRegionalWeather, fetchAllRegionalWeather } from '@/services/weatherService';
import { computeShipmentImpacts } from '@/services/logisticsEngine';
import {
  fetchOperationalSnapshot,
  submitOperationalIncident,
  verifyOperationalIncident,
  updateOperationalRoadSegment,
  updateOperationalVehicle,
  submitOperationalEmergencyRequest,
  approveOperationalEmergencyRequest,
  declineOperationalEmergencyRequest,
  resetBackendOperationalState,
  checkBackendHealth,
  type BackendHealthInfo,
  getOsmRoadNetwork,
  getHistoricalHazards,
  getBackendVehiclePositions,
  getTerrainCorridors,
} from '@/services/api';
import { useAppStore } from './appStore';

function incidentBlocksRoad(incident: Incident): boolean {
  return (
    incident.severity === 'critical' ||
    incident.severity === 'high' ||
    incident.type === 'landslide' ||
    incident.type === 'road_washout'
  );
}

function findAssociatedRoadSegment(incident: Incident, segments: RoadSegment[]): RoadSegment | undefined {
  // 1. Direct match by affectedByIncidentId
  const directMatch = segments.find((s) => s.affectedByIncidentId === incident.id);
  if (directMatch) return directMatch;

  // 2. Keyword matching on locationName and description
  const locText = `${incident.locationName} ${incident.description || ''}`.toLowerCase();

  const keywordMatch = segments.find((s) => {
    const nameLower = s.name.toLowerCase();
    const fromLower = s.fromLocation.toLowerCase();
    const toLower = s.toLocation.toLowerCase();

    return (
      locText.includes(nameLower) ||
      locText.includes(fromLower) ||
      locText.includes(toLower) ||
      ((locText.includes('nh-2') || locText.includes('mao gate')) && nameLower.includes('nh-2')) ||
      (locText.includes('doyyang') && nameLower.includes('doyyang')) ||
      ((locText.includes('route 39') || locText.includes('nh-39') || locText.includes('senapati')) &&
        nameLower.includes('nh-39')) ||
      ((locText.includes('guwahati') || locText.includes('shillong')) && nameLower.includes('guwahati')) ||
      ((locText.includes('kangpokpi') || locText.includes('imphal')) && nameLower.includes('ring road'))
    );
  });
  if (keywordMatch) return keywordMatch;

  // 3. Fallback by route id
  if (incident.affectedRouteId === 'route-b') {
    const segB = segments.find((s) => s.id === 'rd-001');
    if (segB) return segB;
  }
  if (incident.affectedRouteId === 'route-a') {
    const segA = segments.find((s) => s.id === 'rd-002' || s.id === 'rd-003');
    if (segA) return segA;
  }

  // 4. Default to first non-blocked segment or first segment
  return segments.find((s) => s.status !== 'blocked') || segments[0];
}

function determineVehicleImpact(
  vehicle: Vehicle,
  segmentId: string,
  incident?: Incident
): boolean {
  // 1. Direct match: vehicle planned segments include this segment
  if (vehicle.plannedSegmentIds?.includes(segmentId)) {
    return true;
  }
  // 2. Route match: vehicle planned route matches incident's affected route
  if (incident?.affectedRouteId && vehicle.plannedRouteId === incident.affectedRouteId) {
    return true;
  }
  // 3. Corridor heuristic: if vehicle is destined for Imphal along NH-2 corridor and segment is rd-001
  if (segmentId === 'rd-001' && vehicle.destination === 'Imphal' && vehicle.plannedRouteId === 'route-b') {
    return true;
  }
  return false;
}

export function computeFleetImpact(
  vehicles: Vehicle[],
  roadSegments: RoadSegment[],
  disruptions: Disruption[],
  incidents: Incident[]
): Vehicle[] {
  const activeDisruptions = disruptions.filter((d) => d.status === 'active');
  const blockedSegmentIds = new Set(
    roadSegments.filter((s) => s.status === 'blocked').map((s) => s.id)
  );

  return vehicles.map((v) => {
    // 1. Check active disruptions
    for (const disruption of activeDisruptions) {
      const segment = roadSegments.find((s) => s.id === disruption.affectedSegmentId);
      const incident = incidents.find((i) => i.id === disruption.incidentId);
      const isImpacted = determineVehicleImpact(v, disruption.affectedSegmentId, incident);

      if (isImpacted) {
        if (v.rerouteStatus === 'active' || v.status === 'emergency_pickup') {
          return { ...v };
        }
        return {
          ...v,
          affectedByDisruptionId: disruption.id,
          impactReason: `Route traverses blocked ${segment?.name || 'NH-2 Mao Gate Segment'} (${disruption.incidentId})`,
          status: 'disrupted' as VehicleStatus,
          riskLevel: 'high' as RiskLevel,
        };
      }
    }

    // 2. Check if any blocked segment in roadSegments impacts vehicle
    for (const segId of blockedSegmentIds) {
      const segment = roadSegments.find((s) => s.id === segId);
      const incident = incidents.find((i) => i.id === segment?.affectedByIncidentId);
      const isImpacted = determineVehicleImpact(v, segId, incident);

      if (isImpacted) {
        if (v.rerouteStatus === 'active' || v.status === 'emergency_pickup') {
          return { ...v };
        }
        const disruptionId = `DIS-${segment?.affectedByIncidentId || segId}`;
        return {
          ...v,
          affectedByDisruptionId: disruptionId,
          impactReason: `Route traverses blocked ${segment?.name || 'corridor segment'}`,
          status: 'disrupted' as VehicleStatus,
          riskLevel: 'high' as RiskLevel,
        };
      }
    }

    // 3. Otherwise vehicle is unaffected
    if (v.status === 'emergency_pickup') {
      return { ...v };
    }
    return {
      ...v,
      affectedByDisruptionId: undefined,
      impactReason: undefined,
      status: v.status === 'disrupted' ? ('on_route' as VehicleStatus) : v.status,
      riskLevel: v.status === 'disrupted' ? ('moderate' as RiskLevel) : v.riskLevel,
    };
  });
}

const DEMO_ROUTE_LIST: Route[] = Object.values(DEMO_ROUTES);

function sqDist(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

export function nearestLocationLabel(coord: [number, number]): string {
  let bestName = 'current position';
  let best = Infinity;
  for (const loc of Object.values(LOCATIONS)) {
    const d = sqDist(coord, [loc.lat, loc.lng]);
    if (d < best) {
      best = d;
      bestName = loc.shortName;
    }
  }
  return `Current position — ${bestName}`;
}

export function buildReactiveWaypoints(
  from: [number, number],
  template: Route,
  destination?: string
): [number, number][] {
  const destLoc = destination
    ? Object.values(LOCATIONS).find(
        (l) =>
          l.shortName.toLowerCase() === destination.toLowerCase() ||
          l.name.toLowerCase().includes(destination.toLowerCase())
      )
    : undefined;

  // Skip the template origin — reactive routing starts from where the vehicle is now.
  const corridor = template.waypoints.slice(1);
  if (corridor.length === 0) {
    const dest: [number, number] = destLoc
      ? [destLoc.lat, destLoc.lng]
      : template.waypoints[template.waypoints.length - 1];
    return [from, dest];
  }

  let nearestIdx = 0;
  let nearest = Infinity;
  corridor.forEach((wp, i) => {
    const d = sqDist(from, wp);
    if (d < nearest) {
      nearest = d;
      nearestIdx = i;
    }
  });

  let rest = corridor.slice(nearestIdx);

  if (destLoc) {
    const dest: [number, number] = [destLoc.lat, destLoc.lng];
    const destIdx = rest.findIndex((wp) => sqDist(wp, dest) < 0.0025);
    if (destIdx >= 0) {
      rest = rest.slice(0, destIdx + 1);
    } else if (sqDist(rest[rest.length - 1], dest) > 0.0025) {
      rest = [...rest, dest];
    }
  }

  const first = rest[0];
  const alreadyAtJoin = first && sqDist(first, from) < 0.0025;
  return alreadyAtJoin ? rest : [from, ...rest];
}

function routeAvoidsSegment(route: Route, blockedSegmentId: string): boolean {
  if (route.segmentIds && route.segmentIds.length > 0) {
    return !route.segmentIds.includes(blockedSegmentId);
  }
  if (blockedSegmentId === 'rd-001') return route.id !== 'route-b';
  return true;
}

export function findAlternateRoute(vehicle: Vehicle, blockedSegmentId: string): Route | undefined {
  // Demo fork: NL-02 is already at the Mao Gate cut. Route A is not a viable
  // continuation from this position; MN-04 (further back) can still divert.
  if (vehicle.id === 'NL-02-C-3391') {
    return undefined;
  }
  const currentId = vehicle.plannedRouteId || vehicle.currentRoute;
  return (
    DEMO_ROUTE_LIST.find((r) => r.id !== currentId && routeAvoidsSegment(r, blockedSegmentId)) ||
    DEMO_ROUTE_LIST.find((r) => routeAvoidsSegment(r, blockedSegmentId))
  );
}

export function getReactiveDisplayRoute(vehicle: Vehicle): Route | undefined {
  if (vehicle.rerouteStatus !== 'active' || !vehicle.rerouteFrom) return undefined;
  const template = DEMO_ROUTE_LIST.find(
    (r) => r.id === (vehicle.currentRoute || vehicle.plannedRouteId)
  );
  if (!template) return undefined;
  const waypoints = vehicle.rerouteWaypoints ?? buildReactiveWaypoints(
    vehicle.rerouteFrom,
    template,
    vehicle.rerouteTo || vehicle.destination
  );
  return {
    ...template,
    id: `reactive-${vehicle.id}`,
    label: `Reactive — ${template.label}`,
    description: `From ${vehicle.rerouteFromLabel || 'current position'} to ${vehicle.rerouteTo || vehicle.destination || 'destination'}`,
    etaMinutes: vehicle.etaMinutes ?? template.etaMinutes,
    recommended: true,
    waypoints,
  };
}

export const DEMO_PICKUP_QUANTITY = 20;
export const DEMO_CONTRACTOR_NAME = 'North East Logistics Contractor';

export function approxDistanceKm(a: [number, number], b: [number, number]): number {
  const dLat = (a[0] - b[0]) * 111.32;
  const dLng = (a[1] - b[1]) * 111.32 * Math.cos((a[0] * Math.PI) / 180);
  return Math.max(1, Math.round(Math.sqrt(dLat * dLat + dLng * dLng)));
}

function cargoCompatible(godown: Godown, cargoType?: string): boolean {
  if (!cargoType) return false;
  const cargo = cargoType.toLowerCase();
  return godown.suitableCargoTypes.some((token) => {
    const t = token.toLowerCase();
    return cargo.includes(t) || t.split(/\s+/).some((w) => w.length > 3 && cargo.includes(w));
  });
}

export function findNearestSuitableGodown(
  vehicle: Vehicle,
  godowns: Godown[]
): { godown: Godown; distanceKm: number } | undefined {
  const ranked = godowns
    .filter((g) => g.availableStock >= DEMO_PICKUP_QUANTITY && cargoCompatible(g, vehicle.cargoType))
    .map((g) => ({ godown: g, distanceKm: approxDistanceKm(vehicle.location, g.location) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return ranked[0];
}

function mergeRerouteState(computed: Vehicle[], previous: Vehicle[]): Vehicle[] {
  return computed.map((v) => {
    const prev = previous.find((p) => p.id === v.id);
    if (!prev?.rerouteStatus || prev.rerouteStatus === 'none') return v;
    if (prev.rerouteStatus === 'active') {
      return {
        ...v,
        plannedRouteId: prev.plannedRouteId,
        plannedSegmentIds: prev.plannedSegmentIds,
        currentRoute: prev.currentRoute,
        etaMinutes: prev.etaMinutes,
        status: prev.status,
        riskLevel: prev.riskLevel,
        affectedByDisruptionId: prev.affectedByDisruptionId,
        impactReason: prev.impactReason,
        rerouteStatus: prev.rerouteStatus,
        rerouteReason: prev.rerouteReason,
        reroutedAt: prev.reroutedAt,
        rerouteFrom: prev.rerouteFrom,
        rerouteFromLabel: prev.rerouteFromLabel,
        rerouteTo: prev.rerouteTo,
        previousRouteId: prev.previousRouteId,
        rerouteWaypoints: prev.rerouteWaypoints,
      };
    }
    return {
      ...v,
      rerouteStatus: prev.rerouteStatus,
      rerouteReason: prev.rerouteReason,
      reroutedAt: prev.reroutedAt,
      recommendedGodownId: prev.recommendedGodownId,
      recommendedGodownDistanceKm: prev.recommendedGodownDistanceKm,
      status: prev.status === 'emergency_pickup' ? prev.status : v.status,
      destination: prev.status === 'emergency_pickup' ? prev.destination : v.destination,
      affectedByDisruptionId: prev.status === 'emergency_pickup' ? undefined : v.affectedByDisruptionId,
      impactReason: prev.status === 'emergency_pickup' ? undefined : v.impactReason,
      riskLevel: prev.status === 'emergency_pickup' ? prev.riskLevel : v.riskLevel,
    };
  });
}

function computeUpdatedShipments(
  baseShipments: Shipment[],
  vehicles: Vehicle[],
  roads: RoadSegment[],
  disruptions: Disruption[],
  incidents: Incident[],
  pickups: EmergencyPickupRequest[]
): Shipment[] {
  const result = computeShipmentImpacts(baseShipments, vehicles, roads, disruptions, incidents, pickups);
  return baseShipments.map((s) => {
    const match = result.affectedShipments.find((a) => a.id === s.id);
    if (match) return match;
    const v = vehicles.find((veh) => veh.id === s.vehicleId);
    if (v?.status === 'emergency_pickup') {
      return {
        ...s,
        currentStatus: 'relief_buffered',
        continuityStatus: 'relief_secured',
        affected: false,
        recommendedAction: `Consignment diverted to buffer godown node (${v.destination || 'Strategic Buffer Node'}).`,
      };
    }
    if (v?.rerouteStatus === 'active') {
      return {
        ...s,
        currentStatus: 'rerouted',
        continuityStatus: 'rerouting',
        affected: false,
        delayMinutes: (v.etaMinutes ?? 45) + 30,
        recommendedAction: `Active corridor detour engaged via ${v.currentRoute || 'alternative corridor'}.`,
      };
    }
    return {
      ...s,
      affected: false,
      continuityStatus: 'on_track',
      disruptionId: undefined,
      impactReason: undefined,
    };
  });
}

const INITIAL_DISRUPTIONS: Disruption[] = [];

const INITIAL_ROAD_SEGMENTS: RoadSegment[] = DEMO_ROAD_SEGMENTS.map((seg) => ({ ...seg }));

const INITIAL_VEHICLES: Vehicle[] = computeFleetImpact(
  DEMO_FLEET,
  INITIAL_ROAD_SEGMENTS,
  INITIAL_DISRUPTIONS,
  DEMO_INCIDENTS
);

const INITIAL_SHIPMENTS: Shipment[] = computeUpdatedShipments(
  DEMO_SHIPMENTS.map((s) => ({ ...s })),
  INITIAL_VEHICLES,
  INITIAL_ROAD_SEGMENTS,
  INITIAL_DISRUPTIONS,
  DEMO_INCIDENTS,
  []
);

export interface NetworkState {
  activeIncidents: Incident[];
  roadSegments: RoadSegment[];
  activeVehicles: Vehicle[];
  disruptions: Disruption[];
  godowns: Godown[];
  pickupRequests: EmergencyPickupRequest[];
  shipments: Shipment[];
  weatherSpikeActive: boolean;
  weatherData: Record<string, EnvironmentalSnapshot>;
  backendSyncStatus: 'connected' | 'local_fallback' | 'offline';
  backendHealth: BackendHealthInfo | null;
  lastBackendSyncAt: string | null;

  // Phase 2 Real Data Integrations
  historicalHazards: Record<string, CorridorHazardExposure>;
  elevationProfiles: Record<string, ElevationProfile>;
  osmNetwork: OsmNetworkSnapshot | null;
  backendVehiclePositions: Record<string, BackendVehiclePosition>;

  // Actions
  fetchPhase2RealData: () => Promise<void>;
  addIncident: (incident: Incident) => void;
  verifyIncident: (id: string, approved: boolean, verifiedBy?: string) => Promise<void>;
  updateRoadSegment: (id: string, patch: Partial<RoadSegment>) => void;
  setVehicleStatus: (vehicleId: string, patch: Partial<Vehicle>) => void;
  addDisruption: (disruption: Disruption) => void;
  clearDisruption: (disruptionId: string) => void;
  evaluateAffectedVehicles: (disruptionId: string) => string[];
  getAffectedVehicles: () => Vehicle[];
  rerouteVehicle: (vehicleId: string) => RerouteStatus;
  recommendEmergencyGodown: (vehicleId: string) => string | undefined;
  requestEmergencyPickup: (vehicleId: string) => string | undefined;
  approveEmergencyPickup: (requestId: string) => void;
  declineEmergencyPickup: (requestId: string) => void;
  setWeatherSpike: (active: boolean) => void;
  updateWeatherData: (data: Record<string, EnvironmentalSnapshot>) => void;
  resetToCleanState: () => Promise<void>;
  syncFromIndexedDB: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  activeIncidents: DEMO_INCIDENTS.map((i) => ({ ...i })),
  roadSegments: INITIAL_ROAD_SEGMENTS,
  activeVehicles: INITIAL_VEHICLES,
  disruptions: INITIAL_DISRUPTIONS,
  godowns: DEMO_GODOWNS.map((g) => ({ ...g })),
  pickupRequests: [],
  shipments: INITIAL_SHIPMENTS,
  weatherSpikeActive: false,
  weatherData: getBaselineRegionalWeather(false),
  backendSyncStatus: 'offline',
  backendHealth: null,
  lastBackendSyncAt: null,
  historicalHazards: {},
  elevationProfiles: {},
  osmNetwork: null,
  backendVehiclePositions: {},

  fetchPhase2RealData: async () => {
    try {
      const [hazardsRes, terrainRes, osmRes, posRes] = await Promise.allSettled([
        getHistoricalHazards(),
        getTerrainCorridors(),
        getOsmRoadNetwork(),
        getBackendVehiclePositions(),
      ]);

      set((state) => {
        const next: Partial<NetworkState> = {};

        if (hazardsRes.status === 'fulfilled' && hazardsRes.value?.corridors) {
          next.historicalHazards = hazardsRes.value.corridors;
        }

        if (terrainRes.status === 'fulfilled' && terrainRes.value?.profiles) {
          next.elevationProfiles = terrainRes.value.profiles;
        }

        if (osmRes.status === 'fulfilled' && osmRes.value?.roadSegments) {
          next.osmNetwork = osmRes.value;
        }

        if (posRes.status === 'fulfilled' && posRes.value?.positions) {
          const posMap: Record<string, BackendVehiclePosition> = {};
          posRes.value.positions.forEach((p) => {
            posMap[p.vehicleId] = p;
          });
          next.backendVehiclePositions = posMap;

          // Sync position signals to activeVehicles if valid coordinates
          const updatedVehicles = state.activeVehicles.map((v) => {
            const p = posMap[v.id];
            if (p && typeof p.latitude === 'number' && typeof p.longitude === 'number') {
              return {
                ...v,
                location: [p.latitude, p.longitude] as [number, number],
                heading: p.heading ?? v.heading,
                speedKmh: p.speedKmh ?? v.speedKmh,
                lastGpsUpdate: p.timestamp,
              };
            }
            return v;
          });
          next.activeVehicles = updatedVehicles;
        }

        return next;
      });
    } catch (err) {
      console.warn('[Phase2RealData] Failed to fetch Phase 2 live data:', err);
    }
  },

  setWeatherSpike: (active: boolean) => {
    set((state) => {
      const updatedWeather = active
        ? applySpikeToRegionalWeather(state.weatherData, true)
        : getBaselineRegionalWeather(false);

      const updatedSegments = state.roadSegments.map((seg) => {
        if (seg.id === 'rd-002') {
          return {
            ...seg,
            status: active ? ('caution' as RoadStatus) : ('open' as RoadStatus),
            riskLevel: active ? ('high' as RiskLevel) : ('low' as RiskLevel),
          };
        }
        return seg;
      });

      return {
        weatherSpikeActive: active,
        weatherData: updatedWeather,
        roadSegments: updatedSegments,
      };
    });
  },

  updateWeatherData: (data: Record<string, EnvironmentalSnapshot>) => {
    set((state) => {
      const weatherData = state.weatherSpikeActive ? applySpikeToRegionalWeather(data, true) : data;
      return { weatherData };
    });
  },

  addIncident: (incident: Incident) => {
    set((state) => {
      const exists = state.activeIncidents.some((i) => i.id === incident.id);
      const rawList = exists
        ? state.activeIncidents.map((i) => (i.id === incident.id ? incident : i))
        : [incident, ...state.activeIncidents];
      const correlated = correlateIncidents(rawList);
      return {
        activeIncidents: correlated,
      };
    });

    // Asynchronously submit to authoritative backend API and IndexedDB
    submitOperationalIncident(incident).catch((err) => {
      console.warn('[OperationalBackend] Failed to submit incident to backend:', err);
    });
    saveIncident(incident).catch((err) => {
      console.warn('[IndexedDB] Failed to save incident locally:', err);
    });
  },

  verifyIncident: async (id: string, approved: boolean, verifiedBy: string = 'Ranjit Sharma (SDMA-NE)') => {
    const state = get();
    const incidentIndex = state.activeIncidents.findIndex((i) => i.id === id);
    if (incidentIndex === -1) return;

    const targetIncident = state.activeIncidents[incidentIndex];
    const verifiedAt = new Date().toISOString();
    const newSyncStatus: IncidentSyncStatus = approved ? 'verified' : 'rejected';

    const updatedIncident: Incident = {
      ...targetIncident,
      syncStatus: newSyncStatus,
      verifiedBy: approved ? verifiedBy : targetIncident.verifiedBy,
      verifiedAt: approved ? verifiedAt : targetIncident.verifiedAt,
    };

    const updatedIncidents = [...state.activeIncidents];
    updatedIncidents[incidentIndex] = updatedIncident;

    let updatedSegments = [...state.roadSegments];
    let updatedDisruptions = [...state.disruptions];

    if (approved) {
      // Find the associated road segment
      const segment = findAssociatedRoadSegment(updatedIncident, updatedSegments);

      if (segment) {
        const isBlocking = incidentBlocksRoad(updatedIncident);

        const newStatus: RoadStatus = isBlocking ? 'blocked' : 'caution';
        const newRisk: RiskLevel = isBlocking ? 'blocked' : 'high';

        updatedSegments = updatedSegments.map((seg) =>
          seg.id === segment.id
            ? {
                ...seg,
                status: newStatus,
                riskLevel: newRisk,
                lastUpdated: verifiedAt,
                affectedByIncidentId: updatedIncident.id,
              }
            : seg
        );

        const disruptionId = `DIS-${updatedIncident.id}`;
        const disruptionRecord: Disruption = {
          id: disruptionId,
          incidentId: updatedIncident.id,
          affectedSegmentId: segment.id,
          status: 'active',
          createdAt: verifiedAt,
          updatedAt: verifiedAt,
          affectedVehicleIds: [],
        };

        const existingDisruptionIdx = updatedDisruptions.findIndex(
          (d) => d.incidentId === updatedIncident.id || d.id === disruptionId
        );

        if (existingDisruptionIdx >= 0) {
          updatedDisruptions[existingDisruptionIdx] = disruptionRecord;
        } else {
          updatedDisruptions.push(disruptionRecord);
        }

        try {
          await saveDisruption(disruptionRecord);
        } catch (err) {
          console.warn('Could not save disruption to IndexedDB:', err);
        }
      }
    } else {
      // Rejected: do not block road; clear any previous association
      updatedSegments = updatedSegments.map((seg) => {
        if (seg.affectedByIncidentId === updatedIncident.id) {
          return {
            ...seg,
            status: 'open' as RoadStatus,
            riskLevel: 'low' as RiskLevel,
            lastUpdated: verifiedAt,
            affectedByIncidentId: undefined,
          };
        }
        return seg;
      });

      updatedDisruptions = updatedDisruptions.filter(
        (d) => d.incidentId !== updatedIncident.id
      );
    }

    // Recompute fleet impact deterministically
    const updatedVehicles = computeFleetImpact(
      state.activeVehicles,
      updatedSegments,
      updatedDisruptions,
      updatedIncidents
    );

    // Update affectedVehicleIds on disruptions
    updatedDisruptions = updatedDisruptions.map((d) => ({
      ...d,
      affectedVehicleIds: updatedVehicles
        .filter((v) => v.affectedByDisruptionId === d.id)
        .map((v) => v.id),
    }));

    const updatedShipments = computeUpdatedShipments(
      state.shipments,
      updatedVehicles,
      updatedSegments,
      updatedDisruptions,
      updatedIncidents,
      state.pickupRequests
    );

    set({
      activeIncidents: updatedIncidents,
      roadSegments: updatedSegments,
      activeVehicles: updatedVehicles,
      disruptions: updatedDisruptions,
      shipments: updatedShipments,
    });

    try {
      await saveIncident(updatedIncident);
    } catch (err) {
      console.warn('Could not persist verified incident to IndexedDB:', err);
    }

    // Authoritative backend verification sync
    verifyOperationalIncident(id, approved, verifiedBy, undefined, updatedIncident).catch((err) => {
      console.warn('[OperationalBackend] Failed to verify incident on backend:', err);
    });
  },

  updateRoadSegment: (id: string, patch: Partial<RoadSegment>) => {
    set((state) => {
      const roadSegments = state.roadSegments.map((seg) =>
        seg.id === id ? { ...seg, ...patch } : seg
      );
      const activeVehicles = computeFleetImpact(
        state.activeVehicles,
        roadSegments,
        state.disruptions,
        state.activeIncidents
      );
      return { roadSegments, activeVehicles };
    });

    updateOperationalRoadSegment(id, patch).catch((err) => {
      console.warn('[OperationalBackend] Failed to patch road segment on backend:', err);
    });
  },

  setVehicleStatus: (vehicleId: string, patch: Partial<Vehicle>) => {
    set((state) => ({
      activeVehicles: state.activeVehicles.map((v) =>
        v.id === vehicleId ? { ...v, ...patch } : v
      ),
    }));

    updateOperationalVehicle(vehicleId, patch).catch((err) => {
      console.warn('[OperationalBackend] Failed to patch vehicle status on backend:', err);
    });
  },

  addDisruption: (disruption: Disruption) => {
    set((state) => {
      const disruptions = [
        ...state.disruptions.filter((d) => d.id !== disruption.id),
        disruption,
      ];
      const activeVehicles = computeFleetImpact(
        state.activeVehicles,
        state.roadSegments,
        disruptions,
        state.activeIncidents
      );
      const shipments = computeUpdatedShipments(
        state.shipments,
        activeVehicles,
        state.roadSegments,
        disruptions,
        state.activeIncidents,
        state.pickupRequests
      );
      return { disruptions, activeVehicles, shipments };
    });
  },

  clearDisruption: (disruptionId: string) => {
    set((state) => {
      const disruptions = state.disruptions.filter((d) => d.id !== disruptionId);
      const activeVehicles = computeFleetImpact(
        state.activeVehicles,
        state.roadSegments,
        disruptions,
        state.activeIncidents
      );
      const shipments = computeUpdatedShipments(
        state.shipments,
        activeVehicles,
        state.roadSegments,
        disruptions,
        state.activeIncidents,
        state.pickupRequests
      );
      return { disruptions, activeVehicles, shipments };
    });
  },

  evaluateAffectedVehicles: (disruptionId: string) => {
    const state = get();
    const updatedVehicles = computeFleetImpact(
      state.activeVehicles,
      state.roadSegments,
      state.disruptions,
      state.activeIncidents
    );

    const affectedIds = updatedVehicles
      .filter((v) => v.affectedByDisruptionId === disruptionId)
      .map((v) => v.id);

    const updatedDisruptions = state.disruptions.map((d) =>
      d.id === disruptionId ? { ...d, affectedVehicleIds: affectedIds } : d
    );

    const updatedShipments = computeUpdatedShipments(
      state.shipments,
      updatedVehicles,
      state.roadSegments,
      updatedDisruptions,
      state.activeIncidents,
      state.pickupRequests
    );

    set({
      activeVehicles: updatedVehicles,
      disruptions: updatedDisruptions,
      shipments: updatedShipments,
    });

    return affectedIds;
  },

  getAffectedVehicles: () => {
    return get().activeVehicles.filter((v) => Boolean(v.affectedByDisruptionId));
  },

  rerouteVehicle: (vehicleId: string) => {
    const state = get();
    const vehicle = state.activeVehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return 'none';

    if (vehicle.rerouteStatus === 'active') return 'active';

    if (!vehicle.affectedByDisruptionId) {
      return vehicle.rerouteStatus ?? 'none';
    }

    const disruption =
      state.disruptions.find((d) => d.id === vehicle.affectedByDisruptionId) ||
      state.disruptions.find((d) => d.status === 'active');

    const blockedSegmentId =
      disruption?.affectedSegmentId ||
      vehicle.plannedSegmentIds?.find((id) =>
        state.roadSegments.some((s) => s.id === id && s.status === 'blocked')
      );

    if (!blockedSegmentId) {
      const updated: Vehicle = {
        ...vehicle,
        rerouteStatus: 'no_alternative',
        rerouteReason: 'No blocked corridor identified for a reactive reroute.',
        reroutedAt: new Date().toISOString(),
      };
      set({
        activeVehicles: state.activeVehicles.map((v) => (v.id === vehicleId ? updated : v)),
      });
      return 'no_alternative';
    }

    const segment = state.roadSegments.find((s) => s.id === blockedSegmentId);
    const alternate = findAlternateRoute(vehicle, blockedSegmentId);

    if (!alternate) {
      const updated: Vehicle = {
        ...vehicle,
        rerouteStatus: 'no_alternative',
        rerouteReason: `No alternate corridor from current position that avoids ${segment?.name || 'the blocked segment'}.`,
        reroutedAt: new Date().toISOString(),
      };
      set({
        activeVehicles: state.activeVehicles.map((v) => (v.id === vehicleId ? updated : v)),
      });
      return 'no_alternative';
    }

    const from = vehicle.location;
    const fromLabel = nearestLocationLabel(from);
    const waypoints = buildReactiveWaypoints(from, alternate, vehicle.destination);
    // Prototype ETA: remaining time on the current route + 50 min for the safer corridor detour.
    // This is remaining-from-here time, not a new origin-to-destination schedule.
    const etaMinutes = (vehicle.etaMinutes ?? Math.round(alternate.etaMinutes * 0.3)) + 50;

    const updated: Vehicle = {
      ...vehicle,
      plannedRouteId: alternate.id,
      currentRoute: alternate.id,
      plannedSegmentIds: alternate.segmentIds ? [...alternate.segmentIds] : vehicle.plannedSegmentIds,
      previousRouteId: vehicle.plannedRouteId || vehicle.currentRoute,
      etaMinutes,
      status: 'on_route',
      riskLevel: 'moderate',
      affectedByDisruptionId: undefined,
      impactReason: undefined,
      rerouteStatus: 'active',
      rerouteFrom: from,
      rerouteFromLabel: fromLabel,
      rerouteTo: vehicle.destination,
      rerouteWaypoints: waypoints,
      reroutedAt: new Date().toISOString(),
      rerouteReason: `Reactive reroute from ${fromLabel} via ${alternate.label}, avoiding ${segment?.name || 'blocked corridor'}.`,
    };

    const activeVehicles = state.activeVehicles.map((v) => (v.id === vehicleId ? updated : v));
    const shipments = computeUpdatedShipments(
      state.shipments,
      activeVehicles,
      state.roadSegments,
      state.disruptions,
      state.activeIncidents,
      state.pickupRequests
    );

    set({
      activeVehicles,
      shipments,
    });

    updateOperationalVehicle(vehicleId, {
      plannedRouteId: alternate.id,
      currentRoute: alternate.id,
      plannedSegmentIds: alternate.segmentIds ? [...alternate.segmentIds] : vehicle.plannedSegmentIds,
      previousRouteId: vehicle.plannedRouteId || vehicle.currentRoute,
      etaMinutes,
      status: 'on_route',
      riskLevel: 'moderate',
      affectedByDisruptionId: undefined,
      impactReason: undefined,
      rerouteStatus: 'active',
      rerouteFrom: from,
      rerouteFromLabel: fromLabel,
      rerouteTo: vehicle.destination,
      rerouteWaypoints: waypoints,
      reroutedAt: updated.reroutedAt,
      rerouteReason: updated.rerouteReason,
    }).catch((err) => {
      console.warn('[OperationalBackend] Failed to patch rerouted vehicle on backend:', err);
    });

    return 'active';
  },

  recommendEmergencyGodown: (vehicleId: string) => {
    const state = get();
    const vehicle = state.activeVehicles.find((v) => v.id === vehicleId);
    if (!vehicle || vehicle.rerouteStatus !== 'no_alternative') return undefined;

    const match = findNearestSuitableGodown(vehicle, state.godowns);
    if (!match) return undefined;

    set({
      activeVehicles: state.activeVehicles.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              recommendedGodownId: match.godown.id,
              recommendedGodownDistanceKm: match.distanceKm,
            }
          : v
      ),
    });

    return match.godown.id;
  },

  requestEmergencyPickup: (vehicleId: string) => {
    const state = get();
    const vehicle = state.activeVehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return undefined;

    let godownId = vehicle.recommendedGodownId;
    let distanceKm = vehicle.recommendedGodownDistanceKm;
    if (!godownId) {
      const match = findNearestSuitableGodown(vehicle, state.godowns);
      if (!match) return undefined;
      godownId = match.godown.id;
      distanceKm = match.distanceKm;
    }

    const godown = state.godowns.find((g) => g.id === godownId);
    if (!godown) return undefined;

    const existing = state.pickupRequests.find(
      (r) => r.vehicleId === vehicleId && (r.status === 'requested' || r.status === 'approved' || r.status === 'dispatched')
    );
    if (existing) return existing.id;

    const request: EmergencyPickupRequest = {
      id: `EPK-${vehicleId}`,
      vehicleId: vehicle.id,
      driverName: vehicle.driverName,
      cargoType: vehicle.cargoType || 'Emergency supplies',
      destination: vehicle.destination || 'Kohima',
      godownId: godown.id,
      godownName: godown.name,
      status: 'requested',
      requestedAt: new Date().toISOString(),
      quantity: DEMO_PICKUP_QUANTITY,
      reason: 'No viable alternate corridor from current position.',
    };

    const updatedPickups = [request, ...state.pickupRequests.filter((r) => r.vehicleId !== vehicleId)];
    const activeVehicles: Vehicle[] = state.activeVehicles.map((v) =>
      v.id === vehicleId
        ? {
            ...v,
            rerouteStatus: 'no_alternative' as RerouteStatus,
            rerouteReason: 'No alternate highway corridor from current position.',
            recommendedGodownId: godown.id,
            recommendedGodownDistanceKm: distanceKm,
          }
        : v
    );
    const shipments = computeUpdatedShipments(
      state.shipments,
      activeVehicles,
      state.roadSegments,
      state.disruptions,
      state.activeIncidents,
      updatedPickups
    );

    set({
      pickupRequests: updatedPickups,
      activeVehicles,
      shipments,
    });

    submitOperationalEmergencyRequest(request).catch((err) => {
      console.warn('[OperationalBackend] Failed to submit emergency request to backend:', err);
    });
    updateOperationalVehicle(vehicleId, {
      rerouteStatus: 'no_alternative',
      rerouteReason: 'No alternate highway corridor from current position.',
      recommendedGodownId: godown.id,
      recommendedGodownDistanceKm: distanceKm,
    }).catch(() => {});

    return request.id;
  },

  approveEmergencyPickup: (requestIdOrVehicleId: string) => {
    const state = get();
    const request = state.pickupRequests.find(
      (r) => r.id === requestIdOrVehicleId || r.vehicleId === requestIdOrVehicleId
    );
    if (!request || request.status === 'declined' || request.status === 'dispatched') return;

    const godown = state.godowns.find((g) => g.id === request.godownId);
    if (!godown || godown.availableStock < request.quantity) return;

    const now = new Date().toISOString();
    const updatedRequest: EmergencyPickupRequest = {
      ...request,
      status: 'dispatched',
      approvedAt: now,
      dispatchedAt: now,
      contractorName: DEMO_CONTRACTOR_NAME,
      destinationNotified: true,
    };

    const updatedPickups = state.pickupRequests.map((r) => (r.id === request.id ? updatedRequest : r));
    const activeVehicles: Vehicle[] = state.activeVehicles.map((v) =>
      v.id === request.vehicleId
        ? {
            ...v,
            status: 'emergency_pickup' as VehicleStatus,
            riskLevel: 'moderate' as RiskLevel,
            destination: `${request.godownName} (Emergency Storage)`,
            affectedByDisruptionId: undefined,
            impactReason: undefined,
            rerouteReason: `Emergency storage secured at ${request.godownName}. Buffer stock reserved by ${DEMO_CONTRACTOR_NAME}.`,
          }
        : v
    );
    const shipments = computeUpdatedShipments(
      state.shipments,
      activeVehicles,
      state.roadSegments,
      state.disruptions,
      state.activeIncidents,
      updatedPickups
    );

    set({
      pickupRequests: updatedPickups,
      godowns: state.godowns.map((g) =>
        g.id === request.godownId
          ? { ...g, availableStock: g.availableStock - request.quantity }
          : g
      ),
      activeVehicles,
      shipments,
    });

    approveOperationalEmergencyRequest(request.id, DEMO_CONTRACTOR_NAME).catch((err) => {
      console.warn('[OperationalBackend] Failed to approve emergency request on backend:', err);
    });
  },

  declineEmergencyPickup: (requestIdOrVehicleId: string) => {
    const state = get();
    const request = state.pickupRequests.find(
      (r) => r.id === requestIdOrVehicleId || r.vehicleId === requestIdOrVehicleId
    );
    if (!request || request.status === 'dispatched') return;

    const updatedPickups = state.pickupRequests.map((r) =>
      r.id === request.id ? { ...r, status: 'declined' as const, contractorName: DEMO_CONTRACTOR_NAME } : r
    );
    const shipments = computeUpdatedShipments(
      state.shipments,
      state.activeVehicles,
      state.roadSegments,
      state.disruptions,
      state.activeIncidents,
      updatedPickups
    );

    set({
      pickupRequests: updatedPickups,
      shipments,
    });

    declineOperationalEmergencyRequest(request.id, undefined, DEMO_CONTRACTOR_NAME).catch((err) => {
      console.warn('[OperationalBackend] Failed to decline emergency request on backend:', err);
    });
  },

  resetToCleanState: async () => {
    try {
      await resetBackendOperationalState();
    } catch (err) {
      console.warn('[OperationalBackend] Failed to reset backend state:', err);
    }

    try {
      await clearAllStoredData();
    } catch (err) {
      console.warn('Failed to clear IndexedDB on reset:', err);
    }

    const cleanRoads = DEMO_ROAD_SEGMENTS.map((seg) => ({
      ...seg,
      status: 'open' as RoadStatus,
      riskLevel: 'low' as RiskLevel,
      affectedByIncidentId: undefined,
    }));

    const cleanVehicles = DEMO_FLEET.map((v) => ({
      ...v,
      status: v.id === 'AS-01-J-4422' ? ('idle' as const) : ('on_route' as const),
      riskLevel: 'low' as RiskLevel,
      affectedByDisruptionId: undefined,
      impactReason: undefined,
      rerouteStatus: undefined,
      rerouteReason: undefined,
      rerouteFrom: undefined,
      rerouteFromLabel: undefined,
      rerouteTo: undefined,
      reroutedAt: undefined,
      rerouteWaypoints: undefined,
      recommendedGodownId: undefined,
      recommendedGodownDistanceKm: undefined,
    }));

    const cleanShipments = DEMO_SHIPMENTS.map((s) => ({
      ...s,
      affected: false,
      continuityStatus: 'on_track' as const,
      disruptionId: undefined,
      disruptionReason: undefined,
    }));

    set({
      activeIncidents: [],
      roadSegments: cleanRoads,
      activeVehicles: cleanVehicles,
      disruptions: [],
      godowns: DEMO_GODOWNS.map((g) => ({ ...g })),
      pickupRequests: [],
      shipments: cleanShipments,
      weatherSpikeActive: false,
      weatherData: getBaselineRegionalWeather(false),
      lastBackendSyncAt: new Date().toISOString(),
    });

    useAppStore.getState().setSelectedDriverVehicleId('AS-01-J-4422');
    useAppStore.getState().setSelectedCustomRoute(null);
    useAppStore.getState().setTripState({
      activeTripId: null,
      selectedRouteId: null,
      selectedCustomRoute: null,
      isJourneyActive: false,
      isOfflineReady: false,
    });
  },

  syncFromIndexedDB: async () => {
    try {
      const storedIncidents = await getAllIncidents();
      const storedDisruptions = await getAllDisruptions();

      set((state) => {
        const hasStoredIncidents = Boolean(storedIncidents && storedIncidents.length > 0);
        const hasStoredDisruptions = Boolean(storedDisruptions && storedDisruptions.length > 0);

        // Empty IndexedDB must not rewrite seeded demo roads. Doing so previously
        // treated every verified demo incident as a blockage (rd-002 / rd-003),
        // which then impacted every route-a vehicle.
        if (!hasStoredIncidents && !hasStoredDisruptions) {
          return {};
        }

        let activeIncidents = [...state.activeIncidents];
        if (hasStoredIncidents) {
          storedIncidents.forEach((stored) => {
            const idx = activeIncidents.findIndex((item) => item.id === stored.id);
            if (idx >= 0) {
              activeIncidents[idx] = stored;
            } else {
              activeIncidents.unshift(stored);
            }
          });
        }

        let disruptions = [...state.disruptions];
        if (hasStoredDisruptions) {
          storedDisruptions.forEach((stored) => {
            const idx = disruptions.findIndex((item) => item.id === stored.id);
            if (idx >= 0) {
              disruptions[idx] = stored;
            } else {
              disruptions.push(stored);
            }
          });
        }

        // Reconstruct roadSegments based on verified/rejected stored incidents
        let roadSegments = state.roadSegments.map((seg) => {
          const disruption = disruptions.find(
            (d) => d.affectedSegmentId === seg.id && d.status === 'active'
          );
          if (disruption) {
            return {
              ...seg,
              status: 'blocked' as RoadStatus,
              riskLevel: 'blocked' as RiskLevel,
              affectedByIncidentId: disruption.incidentId,
            };
          }

          const linkedIncident = activeIncidents.find((i) => i.id === seg.affectedByIncidentId);
          if (linkedIncident && linkedIncident.syncStatus === 'rejected') {
            return {
              ...seg,
              status: 'open' as RoadStatus,
              riskLevel: 'low' as RiskLevel,
              affectedByIncidentId: undefined,
            };
          }
          if (linkedIncident && linkedIncident.syncStatus === 'verified' && incidentBlocksRoad(linkedIncident)) {
            return {
              ...seg,
              status: 'blocked' as RoadStatus,
              riskLevel: 'blocked' as RiskLevel,
            };
          }
          return seg;
        });

        // Recompute fleet impact deterministically
        const computed = computeFleetImpact(
          DEMO_FLEET.map((vehicle) => ({ ...vehicle })),
          roadSegments,
          disruptions,
          activeIncidents
        );
        const activeVehicles = mergeRerouteState(computed, state.activeVehicles);

        const correlatedIncidents = correlateIncidents(activeIncidents);
        const shipments = computeUpdatedShipments(
          state.shipments,
          activeVehicles,
          roadSegments,
          disruptions,
          correlatedIncidents,
          state.pickupRequests
        );

        return {
          activeIncidents: correlatedIncidents,
          roadSegments,
          disruptions,
          activeVehicles,
          shipments,
        };
      });
    } catch (err) {
      console.warn('Error syncing networkStore from IndexedDB:', err);
    }
  },

  syncWithBackend: async () => {
    try {
      const healthRes = await checkBackendHealth(2500);
      if (healthRes.connected && healthRes.data) {
        const snapshotRes = await fetchOperationalSnapshot();
        if (snapshotRes.ok && snapshotRes.data?.data) {
          const snapshot = snapshotRes.data.data;
          
          set((state) => {
            // 1. Incidents: Merge state active incidents and snapshot incidents
            const incidentMap = new Map<string, Incident>();
            for (const inc of state.activeIncidents) {
              incidentMap.set(inc.id, inc);
            }
            if (snapshot.incidents && Array.isArray(snapshot.incidents)) {
              for (const inc of snapshot.incidents) {
                incidentMap.set(inc.id, inc);
              }
            }
            const mergedIncidents = Array.from(incidentMap.values());
            const correlatedIncidents = correlateIncidents(mergedIncidents);

            // 2. Disruptions: Combine snapshot and state disruptions; synthesise active ones for verified blocking incidents
            const disruptionMap = new Map<string, Disruption>();
            for (const d of state.disruptions) {
              disruptionMap.set(d.id, d);
            }
            if (snapshot.disruptions && Array.isArray(snapshot.disruptions)) {
              for (const d of snapshot.disruptions) {
                disruptionMap.set(d.id, d);
              }
            }
            for (const inc of correlatedIncidents) {
              if (inc.syncStatus === 'verified' && incidentBlocksRoad(inc)) {
                const seg = findAssociatedRoadSegment(inc, state.roadSegments);
                if (seg) {
                  const disId = `dis-${inc.id.replace('INC-', '')}`;
                  if (!disruptionMap.has(disId)) {
                    disruptionMap.set(disId, {
                      id: disId,
                      incidentId: inc.id,
                      affectedSegmentId: seg.id,
                      status: 'active',
                      createdAt: inc.verifiedAt || inc.reportedAt,
                      updatedAt: inc.verifiedAt || inc.reportedAt,
                      affectedVehicleIds: [],
                    });
                  }
                }
              } else if (inc.syncStatus === 'rejected') {
                for (const [id, dis] of disruptionMap.entries()) {
                  if (dis.incidentId === inc.id) {
                    disruptionMap.set(id, { ...dis, status: 'cleared' });
                  }
                }
              }
            }
            const activeDisruptions = Array.from(disruptionMap.values()).filter((d) => d.status === 'active');

            // 3. Road Segments: Preserve blockages for any active disruptions
            const baseRoads = snapshot.roads && snapshot.roads.length > 0 ? snapshot.roads : state.roadSegments;
            const roadSegments = baseRoads.map((road) => {
              const activeDisruption = activeDisruptions.find((d) => d.affectedSegmentId === road.id);
              if (activeDisruption) {
                return {
                  ...road,
                  status: 'blocked' as RoadStatus,
                  riskLevel: 'blocked' as RiskLevel,
                  affectedByIncidentId: activeDisruption.incidentId,
                  lastUpdated: activeDisruption.updatedAt || road.lastUpdated,
                };
              }
              if (road.affectedByIncidentId) {
                const inc = correlatedIncidents.find((i) => i.id === road.affectedByIncidentId);
                if (inc && inc.syncStatus === 'rejected') {
                  return {
                    ...road,
                    status: 'open' as RoadStatus,
                    riskLevel: 'low' as RiskLevel,
                    affectedByIncidentId: undefined,
                  };
                }
              }
              return road;
            });

            // 4. Vehicles: Compute fleet impact and merge reroute/emergency states
            const baseVehicles = snapshot.vehicles && snapshot.vehicles.length > 0 ? snapshot.vehicles : state.activeVehicles;
            const computedFleet = computeFleetImpact(baseVehicles, roadSegments, activeDisruptions, correlatedIncidents);
            const activeVehicles = mergeRerouteState(computedFleet, state.activeVehicles);

            // 5. Pickup Requests: Merge state and snapshot requests
            const pickupMap = new Map<string, EmergencyPickupRequest>();
            for (const req of state.pickupRequests) {
              pickupMap.set(req.id, req);
            }
            if (snapshot.emergencyPickups && Array.isArray(snapshot.emergencyPickups)) {
              for (const req of snapshot.emergencyPickups) {
                pickupMap.set(req.id, req);
              }
            }
            const pickupRequests = Array.from(pickupMap.values());

            // 6. Shipments:
            const baseShipments = snapshot.shipments && snapshot.shipments.length > 0 ? snapshot.shipments : state.shipments;
            const shipments = computeUpdatedShipments(
              baseShipments,
              activeVehicles,
              roadSegments,
              activeDisruptions,
              correlatedIncidents,
              pickupRequests
            );

            return {
              activeIncidents: correlatedIncidents,
              roadSegments,
              disruptions: activeDisruptions,
              activeVehicles,
              pickupRequests,
              shipments,
              backendSyncStatus: 'connected',
              backendHealth: healthRes.data,
              lastBackendSyncAt: new Date().toISOString(),
            };
          });

          // Also mirror to IndexedDB for offline resilience
          if (snapshot.incidents) {
            for (const inc of snapshot.incidents) {
              await saveIncident(inc).catch(() => {});
            }
          }
          if (snapshot.disruptions) {
            for (const dis of snapshot.disruptions) {
              await saveDisruption(dis).catch(() => {});
            }
          }

          // Ingest live regional weather from backend Open-Meteo pipeline
          try {
            const regionalWeather = await fetchAllRegionalWeather(get().weatherSpikeActive);
            if (regionalWeather && Object.keys(regionalWeather).length > 0) {
              set({ weatherData: regionalWeather });
            }
          } catch (weatherErr) {
            console.warn('[OperationalBackend] Regional weather sync warning, preserving baseline:', weatherErr);
          }

          // Ingest Phase 2 Real Data (OSM Roads, Historical Hazards, Vehicle Positions, Terrain)
          try {
            await get().fetchPhase2RealData();
          } catch (p2Err) {
            console.warn('[Phase2RealData] Phase 2 real data ingestion error:', p2Err);
          }
          return;
        }
      }
      // If health or snapshot check failed, fall back gracefully to local IndexedDB
      set({ backendSyncStatus: 'local_fallback' });
      await get().syncFromIndexedDB();
    } catch (err) {
      console.warn('[OperationalBackend] Backend synchronization failed, using IndexedDB fallback:', err);
      set({ backendSyncStatus: 'local_fallback' });
      await get().syncFromIndexedDB();
    }
  },
}));

// Automatically trigger sync on module load in browser and run periodic polling loop
if (typeof window !== 'undefined') {
  useNetworkStore.getState().syncWithBackend();

  // Active polling loop for live multi-browser cross-role state sync
  let pollIntervalMs = 3000;
  let consecutiveErrors = 0;

  const runPoll = async () => {
    // Only poll when window/document is visible to conserve bandwidth
    if (document.visibilityState === 'visible') {
      try {
        await useNetworkStore.getState().syncWithBackend();
        consecutiveErrors = 0;
        pollIntervalMs = 3000;
      } catch {
        consecutiveErrors++;
        pollIntervalMs = Math.min(30000, 3000 * Math.pow(1.5, consecutiveErrors));
      }
    }
    setTimeout(runPoll, pollIntervalMs);
  };

  setTimeout(runPoll, pollIntervalMs);
}
