import type {
  Incident,
  RoadSegment,
  Vehicle,
  Disruption,
  RiskLevel,
  VehicleStatus,
} from '../../src/types/index.ts';
import { opDb } from '../db/sqliteStorage.ts';

export function incidentBlocksRoad(incident: Incident): boolean {
  return (
    incident.severity === 'critical' ||
    incident.severity === 'high' ||
    incident.type === 'landslide' ||
    incident.type === 'road_washout'
  );
}

export function findAssociatedRoadSegment(
  incident: Incident,
  segments: RoadSegment[]
): RoadSegment | undefined {
  if (incident.affectedRouteId === 'route-b') {
    const segB = segments.find((s) => s.id === 'rd-001');
    if (segB) return segB;
  }
  if (incident.affectedRouteId === 'route-a') {
    const segA = segments.find((s) => s.id === 'rd-002' || s.id === 'rd-003');
    if (segA) return segA;
  }

  const directMatch = segments.find((s) => s.affectedByIncidentId === incident.id);
  if (directMatch) return directMatch;

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

  return segments.find((s) => s.status !== 'blocked') || segments[0];
}

function determineVehicleImpact(
  vehicle: Vehicle,
  segmentId: string,
  incident?: Incident
): boolean {
  if (vehicle.plannedSegmentIds?.includes(segmentId)) {
    return true;
  }
  if (incident?.affectedRouteId && vehicle.plannedRouteId === incident.affectedRouteId) {
    return true;
  }
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
    // Check active disruptions
    for (const disruption of activeDisruptions) {
      const segment = roadSegments.find((s) => s.id === disruption.affectedSegmentId);
      const incident = incidents.find((i) => i.id === disruption.incidentId);
      const isSegmentBlocked = segment?.status === 'blocked';
      const isImpacted = isSegmentBlocked && segment && determineVehicleImpact(v, segment.id, incident);

      if (isImpacted) {
        if (v.status === 'emergency_pickup') {
          return v;
        }

        const isDriverTruck = v.id === 'AS-01-J-4422';
        const hasActiveReroute = v.rerouteStatus === 'active';

        return {
          ...v,
          status: 'disrupted' as VehicleStatus,
          riskLevel: 'high' as RiskLevel,
          affectedByDisruptionId: disruption.id,
          impactReason: `Corridor blocked: ${segment.name} impassable due to ${incident?.type || 'disruption'}.`,
          rerouteStatus: hasActiveReroute ? 'active' : isDriverTruck ? 'recommended' : 'recommended',
          rerouteReason:
            v.rerouteReason ||
            `Alternate route via Dimapur Hill Road recommended. NH-2 Mao Gate blocked by verified incident.`,
        };
      }
    }

    // Check directly blocked segments
    for (const segId of blockedSegmentIds) {
      const segment = roadSegments.find((s) => s.id === segId);
      const incident = incidents.find((i) => i.id === segment?.affectedByIncidentId);
      if (segment && determineVehicleImpact(v, segId, incident)) {
        if (v.status === 'emergency_pickup') {
          return v;
        }

        return {
          ...v,
          status: 'disrupted' as VehicleStatus,
          riskLevel: 'high' as RiskLevel,
          impactReason: `Corridor blocked: ${segment.name} impassable.`,
          rerouteStatus: v.rerouteStatus || 'recommended',
          rerouteReason:
            v.rerouteReason ||
            `Corridor impassable. Detour recommended from current coordinates.`,
        };
      }
    }

    // If vehicle was disrupted and is now clear
    if (v.affectedByDisruptionId && !activeDisruptions.some((d) => d.id === v.affectedByDisruptionId)) {
      return {
        ...v,
        status: v.id === 'AS-01-J-4422' ? 'idle' : 'on_route',
        riskLevel: 'low' as RiskLevel,
        affectedByDisruptionId: undefined,
        impactReason: undefined,
        rerouteStatus: undefined,
        rerouteReason: undefined,
      };
    }

    return v;
  });
}

export class OperationalEngine {
  public getAllIncidents(): Incident[] {
    return opDb.getAllIncidents();
  }

  public getIncidentById(id: string): Incident | null {
    return opDb.getIncidentById(id);
  }

  public createIncident(input: Partial<Incident>): Incident {
    const id = input.id || `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const incident: Incident = {
      id,
      type: input.type || 'landslide',
      severity: input.severity || 'high',
      location: input.location || [25.3200, 93.5500],
      locationName: input.locationName || 'NH-2 Corridor',
      locationSource: input.locationSource || 'DEVICE_GPS',
      description: input.description || '',
      reportedBy: input.reportedBy || 'Field Driver',
      reportedVehicleId: input.reportedVehicleId || 'AS-01-J-4422',
      reportedAt: input.reportedAt || now,
      // CRITICAL: Driver incidents MUST enter pending_verification; AI is purely advisory
      syncStatus: 'pending_verification',
      photoUrl: input.photoUrl,
      photoCapturedAt: input.photoCapturedAt,
      voiceNote: input.voiceNote,
      voiceNoteUrl: input.voiceNoteUrl,
      voiceTranscript: input.voiceTranscript,
      voiceLanguage: input.voiceLanguage,
      voiceDurationSec: input.voiceDurationSec,
      aiAnalysis: input.aiAnalysis,
      affectedRouteId: input.affectedRouteId,
      notes: input.notes,
      correlation: input.correlation,
    };

    opDb.saveIncident(incident);
    return incident;
  }

  public verifyIncident(
    incidentId: string,
    approved: boolean,
    verifiedBy: string = 'SDMA Command Officer',
    notes?: string
  ): {
    incident: Incident;
    affectedRoad?: RoadSegment;
    disruption?: Disruption;
    affectedVehicles: Vehicle[];
  } {
    const incident = opDb.getIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${incidentId}" not found.`);
    }

    const now = new Date().toISOString();
    incident.syncStatus = approved ? 'verified' : 'rejected';
    incident.verifiedBy = verifiedBy;
    incident.verifiedAt = now;
    if (notes) {
      incident.notes = notes;
    }
    opDb.saveIncident(incident);

    const roads = opDb.getAllRoadSegments();
    let affectedRoad: RoadSegment | undefined;
    let disruption: Disruption | undefined;

    if (approved && incidentBlocksRoad(incident)) {
      affectedRoad = findAssociatedRoadSegment(incident, roads);
      if (affectedRoad) {
        affectedRoad.status = 'blocked';
        affectedRoad.riskLevel = 'blocked';
        affectedRoad.affectedByIncidentId = incident.id;
        affectedRoad.lastUpdated = now;
        opDb.saveRoadSegment(affectedRoad);

        const disruptionId = `dis-${incident.id.replace('INC-', '')}`;
        disruption = {
          id: disruptionId,
          incidentId: incident.id,
          affectedSegmentId: affectedRoad.id,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };
        opDb.saveDisruption(disruption);
      }
    } else if (!approved) {
      // If rejected, unblock road if this incident was the cause
      const existingDisruptions = opDb.getAllDisruptions();
      const linkedDisruptions = existingDisruptions.filter((d: Disruption) => d.incidentId === incident.id);
      for (const d of linkedDisruptions) {
        d.status = 'cleared';
        d.updatedAt = now;
        opDb.saveDisruption(d);
      }

      for (const r of roads) {
        if (r.affectedByIncidentId === incident.id) {
          r.status = 'open';
          r.riskLevel = 'low';
          r.affectedByIncidentId = undefined;
          r.lastUpdated = now;
          opDb.saveRoadSegment(r);
          affectedRoad = r;
        }
      }
    }

    // Recompute fleet impact across all vehicles
    const updatedRoads = opDb.getAllRoadSegments();
    const updatedDisruptions = opDb.getAllDisruptions();
    const updatedIncidents = opDb.getAllIncidents();
    const currentVehicles = opDb.getAllVehicles();

    const affectedVehicles = computeFleetImpact(
      currentVehicles,
      updatedRoads,
      updatedDisruptions,
      updatedIncidents
    );

    for (const v of affectedVehicles) {
      opDb.saveVehicle(v);
    }

    return {
      incident,
      affectedRoad,
      disruption,
      affectedVehicles,
    };
  }

  public getAllRoadSegments(): RoadSegment[] {
    return opDb.getAllRoadSegments();
  }

  public updateRoadSegment(id: string, patch: Partial<RoadSegment>): RoadSegment {
    const road = opDb.getRoadSegmentById(id);
    if (!road) {
      throw new Error(`Road segment with ID "${id}" not found.`);
    }

    const updated: RoadSegment = {
      ...road,
      ...patch,
      id: road.id,
      lastUpdated: new Date().toISOString(),
    };

    opDb.saveRoadSegment(updated);

    // Recompute fleet impact
    const roads = opDb.getAllRoadSegments();
    const disruptions = opDb.getAllDisruptions();
    const incidents = opDb.getAllIncidents();
    const vehicles = opDb.getAllVehicles();
    const recomputed = computeFleetImpact(vehicles, roads, disruptions, incidents);
    for (const v of recomputed) {
      opDb.saveVehicle(v);
    }

    return updated;
  }

  public getAllVehicles(): Vehicle[] {
    return opDb.getAllVehicles();
  }

  public getVehicleById(id: string): Vehicle | null {
    return opDb.getVehicleById(id);
  }

  public updateVehicle(id: string, patch: Partial<Vehicle>): Vehicle {
    const vehicle = opDb.getVehicleById(id);
    if (!vehicle) {
      throw new Error(`Vehicle with ID "${id}" not found.`);
    }

    const updated: Vehicle = {
      ...vehicle,
      ...patch,
      id: vehicle.id,
    };

    opDb.saveVehicle(updated);
    return updated;
  }

  public getAllDisruptions(): Disruption[] {
    return opDb.getAllDisruptions();
  }

  public getFleetImpact(): {
    affectedVehicles: Vehicle[];
    totalVehicles: number;
    disruptedCount: number;
    activeDisruptions: Disruption[];
    blockedRoads: RoadSegment[];
  } {
    const vehicles = opDb.getAllVehicles();
    const roads = opDb.getAllRoadSegments();
    const disruptions = opDb.getAllDisruptions();
    const incidents = opDb.getAllIncidents();

    const computed = computeFleetImpact(vehicles, roads, disruptions, incidents);
    const disrupted = computed.filter((v: Vehicle) => v.status === 'disrupted' || v.rerouteStatus === 'recommended');

    return {
      affectedVehicles: disrupted,
      totalVehicles: vehicles.length,
      disruptedCount: disrupted.length,
      activeDisruptions: disruptions.filter((d: Disruption) => d.status === 'active'),
      blockedRoads: roads.filter((r: RoadSegment) => r.status === 'blocked'),
    };
  }

  public resetToCleanState(): void {
    opDb.resetToBaseline();
  }

  public getSnapshot() {
    return {
      incidents: opDb.getAllIncidents(),
      roads: opDb.getAllRoadSegments(),
      vehicles: opDb.getAllVehicles(),
      disruptions: opDb.getAllDisruptions(),
      emergencyPickups: opDb.getAllEmergencyPickups(),
      storageHealth: opDb.getHealthInfo(),
    };
  }
}

export const operationalEngine = new OperationalEngine();
