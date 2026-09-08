import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  Incident,
  RoadSegment,
  Vehicle,
  Disruption,
  EmergencyPickupRequest,
} from '../../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'operations.db');

export interface StorageHealthInfo {
  type: string;
  location: string;
  isPersistent: boolean;
  tableCounts: {
    incidents: number;
    roadSegments: number;
    vehicles: number;
    disruptions: number;
    emergencyRequests: number;
  };
}

class OperationalDatabase {
  private db: DatabaseSync;
  private isMemory = false;

  constructor() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      this.db = new DatabaseSync(DB_FILE);
      this.isMemory = false;
    } catch (err) {
      console.warn('[OperationalDatabase] Falling back to in-memory SQLite storage:', err);
      this.db = new DatabaseSync(':memory:');
      this.isMemory = true;
    }

    this.initTables();
    this.seedBaselineIfEmpty();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        location_json TEXT NOT NULL,
        location_name TEXT NOT NULL,
        location_source TEXT,
        description TEXT NOT NULL,
        reported_by TEXT NOT NULL,
        reported_vehicle_id TEXT,
        reported_at TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        photo_url TEXT,
        voice_transcript TEXT,
        voice_language TEXT,
        ai_analysis_json TEXT,
        affected_route_id TEXT,
        verified_by TEXT,
        verified_at TEXT,
        notes TEXT,
        correlation_json TEXT,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS road_segments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        from_location TEXT NOT NULL,
        to_location TEXT NOT NULL,
        status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        affected_by_incident_id TEXT,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        driver_name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        location_json TEXT NOT NULL,
        origin TEXT,
        destination TEXT,
        eta_minutes INTEGER,
        cargo_type TEXT,
        planned_route_id TEXT,
        assigned_corridor_id TEXT,
        planned_segment_ids_json TEXT,
        affected_by_disruption_id TEXT,
        impact_reason TEXT,
        reroute_status TEXT,
        reroute_reason TEXT,
        rerouted_at TEXT,
        reroute_from_json TEXT,
        reroute_from_label TEXT,
        reroute_to TEXT,
        reroute_waypoints_json TEXT,
        recommended_godown_id TEXT,
        recommended_godown_distance_km REAL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS disruptions (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        affected_segment_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        affected_vehicle_ids_json TEXT,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS emergency_pickups (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        cargo_type TEXT NOT NULL,
        destination TEXT NOT NULL,
        godown_id TEXT NOT NULL,
        godown_name TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        approved_at TEXT,
        dispatched_at TEXT,
        contractor_name TEXT,
        quantity REAL NOT NULL,
        reason TEXT NOT NULL,
        destination_notified INTEGER,
        raw_json TEXT NOT NULL
      );
    `);
  }

  public seedBaselineIfEmpty() {
    const countQuery = this.db.prepare('SELECT COUNT(*) as count FROM road_segments');
    const row = countQuery.get() as { count: number };
    if (row && row.count > 0) {
      return;
    }

    this.resetToBaseline();
  }

  public resetToBaseline() {
    this.db.exec('DELETE FROM incidents;');
    this.db.exec('DELETE FROM road_segments;');
    this.db.exec('DELETE FROM vehicles;');
    this.db.exec('DELETE FROM disruptions;');
    this.db.exec('DELETE FROM emergency_pickups;');

    const baselineRoads: RoadSegment[] = [
      {
        id: 'rd-001',
        name: 'NH-2 Mao Gate Segment',
        fromLocation: 'Senapati',
        toLocation: 'Mao Gate',
        status: 'open',
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rd-002',
        name: 'Doyyang River Bridge',
        fromLocation: 'Wokha',
        toLocation: 'Merapani',
        status: 'open',
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rd-003',
        name: 'NH-39 Senapati Section',
        fromLocation: 'Maram',
        toLocation: 'Senapati',
        status: 'open',
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rd-004',
        name: 'Guwahati–Shillong Highway',
        fromLocation: 'Guwahati',
        toLocation: 'Shillong',
        status: 'open',
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rd-005',
        name: 'Inner Manipur Ring Road',
        fromLocation: 'Kangpokpi',
        toLocation: 'Imphal',
        status: 'open',
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
      },
    ];

    const baselineFleet: Vehicle[] = [
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
        origin: 'Silchar',
        destination: 'Dimapur',
        etaMinutes: 110,
        cargoType: 'Water Purification Tablets',
        plannedRouteId: 'route-a',
        assignedCorridorId: 'cor-003',
        plannedSegmentIds: ['rd-003'],
      },
    ];

    const insertRoad = this.db.prepare(`
      INSERT INTO road_segments (id, name, from_location, to_location, status, risk_level, last_updated, affected_by_incident_id, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of baselineRoads) {
      insertRoad.run(
        r.id,
        r.name,
        r.fromLocation,
        r.toLocation,
        r.status,
        r.riskLevel,
        r.lastUpdated,
        r.affectedByIncidentId || null,
        JSON.stringify(r)
      );
    }

    const insertVehicle = this.db.prepare(`
      INSERT INTO vehicles (
        id, driver_name, type, status, risk_level, location_json, origin, destination,
        eta_minutes, cargo_type, planned_route_id, assigned_corridor_id,
        planned_segment_ids_json, affected_by_disruption_id, impact_reason,
        reroute_status, reroute_reason, rerouted_at, reroute_from_json,
        reroute_from_label, reroute_to, reroute_waypoints_json,
        recommended_godown_id, recommended_godown_distance_km, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of baselineFleet) {
      insertVehicle.run(
        v.id,
        v.driverName,
        v.type,
        v.status,
        v.riskLevel,
        JSON.stringify(v.location),
        v.origin || null,
        v.destination || null,
        v.etaMinutes || null,
        v.cargoType || null,
        v.plannedRouteId || null,
        v.assignedCorridorId || null,
        v.plannedSegmentIds ? JSON.stringify(v.plannedSegmentIds) : null,
        v.affectedByDisruptionId || null,
        v.impactReason || null,
        v.rerouteStatus || null,
        v.rerouteReason || null,
        v.reroutedAt || null,
        v.rerouteFrom ? JSON.stringify(v.rerouteFrom) : null,
        v.rerouteFromLabel || null,
        v.rerouteTo || null,
        v.rerouteWaypoints ? JSON.stringify(v.rerouteWaypoints) : null,
        v.recommendedGodownId || null,
        v.recommendedGodownDistanceKm || null,
        JSON.stringify(v)
      );
    }
  }

  // ── Incidents ─────────────────────────────────────────────────────────────
  public getAllIncidents(): Incident[] {
    const stmt = this.db.prepare('SELECT raw_json FROM incidents ORDER BY reported_at DESC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json) as Incident);
  }

  public getIncidentById(id: string): Incident | null {
    const stmt = this.db.prepare('SELECT raw_json FROM incidents WHERE id = ?');
    const row = stmt.get(id) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as Incident) : null;
  }

  public saveIncident(incident: Incident): Incident {
    const existing = this.getIncidentById(incident.id);
    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE incidents SET
          type = ?, severity = ?, location_json = ?, location_name = ?,
          location_source = ?, description = ?, reported_by = ?,
          reported_vehicle_id = ?, reported_at = ?, sync_status = ?,
          photo_url = ?, voice_transcript = ?, voice_language = ?,
          ai_analysis_json = ?, affected_route_id = ?, verified_by = ?,
          verified_at = ?, notes = ?, correlation_json = ?, raw_json = ?
        WHERE id = ?
      `);
      stmt.run(
        incident.type,
        incident.severity,
        JSON.stringify(incident.location),
        incident.locationName,
        incident.locationSource || null,
        incident.description,
        incident.reportedBy,
        incident.reportedVehicleId || null,
        incident.reportedAt,
        incident.syncStatus,
        incident.photoUrl || null,
        incident.voiceTranscript || null,
        incident.voiceLanguage || null,
        incident.aiAnalysis ? JSON.stringify(incident.aiAnalysis) : null,
        incident.affectedRouteId || null,
        incident.verifiedBy || null,
        incident.verifiedAt || null,
        incident.notes || null,
        incident.correlation ? JSON.stringify(incident.correlation) : null,
        JSON.stringify(incident),
        incident.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO incidents (
          id, type, severity, location_json, location_name, location_source,
          description, reported_by, reported_vehicle_id, reported_at,
          sync_status, photo_url, voice_transcript, voice_language,
          ai_analysis_json, affected_route_id, verified_by, verified_at,
          notes, correlation_json, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        incident.id,
        incident.type,
        incident.severity,
        JSON.stringify(incident.location),
        incident.locationName,
        incident.locationSource || null,
        incident.description,
        incident.reportedBy,
        incident.reportedVehicleId || null,
        incident.reportedAt,
        incident.syncStatus,
        incident.photoUrl || null,
        incident.voiceTranscript || null,
        incident.voiceLanguage || null,
        incident.aiAnalysis ? JSON.stringify(incident.aiAnalysis) : null,
        incident.affectedRouteId || null,
        incident.verifiedBy || null,
        incident.verifiedAt || null,
        incident.notes || null,
        incident.correlation ? JSON.stringify(incident.correlation) : null,
        JSON.stringify(incident)
      );
    }
    return incident;
  }

  // ── Road Segments ─────────────────────────────────────────────────────────
  public getAllRoadSegments(): RoadSegment[] {
    const stmt = this.db.prepare('SELECT raw_json FROM road_segments ORDER BY id ASC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json) as RoadSegment);
  }

  public getRoadSegmentById(id: string): RoadSegment | null {
    const stmt = this.db.prepare('SELECT raw_json FROM road_segments WHERE id = ?');
    const row = stmt.get(id) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as RoadSegment) : null;
  }

  public saveRoadSegment(segment: RoadSegment): RoadSegment {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO road_segments (
        id, name, from_location, to_location, status, risk_level, last_updated, affected_by_incident_id, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      segment.id,
      segment.name,
      segment.fromLocation,
      segment.toLocation,
      segment.status,
      segment.riskLevel,
      segment.lastUpdated,
      segment.affectedByIncidentId || null,
      JSON.stringify(segment)
    );
    return segment;
  }

  // ── Vehicles ──────────────────────────────────────────────────────────────
  public getAllVehicles(): Vehicle[] {
    const stmt = this.db.prepare('SELECT raw_json FROM vehicles ORDER BY id ASC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json) as Vehicle);
  }

  public getVehicleById(id: string): Vehicle | null {
    const stmt = this.db.prepare('SELECT raw_json FROM vehicles WHERE id = ?');
    const row = stmt.get(id) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as Vehicle) : null;
  }

  public saveVehicle(vehicle: Vehicle): Vehicle {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vehicles (
        id, driver_name, type, status, risk_level, location_json, origin, destination,
        eta_minutes, cargo_type, planned_route_id, assigned_corridor_id,
        planned_segment_ids_json, affected_by_disruption_id, impact_reason,
        reroute_status, reroute_reason, rerouted_at, reroute_from_json,
        reroute_from_label, reroute_to, reroute_waypoints_json,
        recommended_godown_id, recommended_godown_distance_km, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      vehicle.id,
      vehicle.driverName,
      vehicle.type,
      vehicle.status,
      vehicle.riskLevel,
      JSON.stringify(vehicle.location),
      vehicle.origin || null,
      vehicle.destination || null,
      vehicle.etaMinutes || null,
      vehicle.cargoType || null,
      vehicle.plannedRouteId || null,
      vehicle.assignedCorridorId || null,
      vehicle.plannedSegmentIds ? JSON.stringify(vehicle.plannedSegmentIds) : null,
      vehicle.affectedByDisruptionId || null,
      vehicle.impactReason || null,
      vehicle.rerouteStatus || null,
      vehicle.rerouteReason || null,
      vehicle.reroutedAt || null,
      vehicle.rerouteFrom ? JSON.stringify(vehicle.rerouteFrom) : null,
      vehicle.rerouteFromLabel || null,
      vehicle.rerouteTo || null,
      vehicle.rerouteWaypoints ? JSON.stringify(vehicle.rerouteWaypoints) : null,
      vehicle.recommendedGodownId || null,
      vehicle.recommendedGodownDistanceKm || null,
      JSON.stringify(vehicle)
    );
    return vehicle;
  }

  // ── Disruptions ───────────────────────────────────────────────────────────
  public getAllDisruptions(): Disruption[] {
    const stmt = this.db.prepare('SELECT raw_json FROM disruptions ORDER BY created_at DESC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json) as Disruption);
  }

  public getDisruptionById(id: string): Disruption | null {
    const stmt = this.db.prepare('SELECT raw_json FROM disruptions WHERE id = ?');
    const row = stmt.get(id) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as Disruption) : null;
  }

  public saveDisruption(disruption: Disruption): Disruption {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO disruptions (
        id, incident_id, affected_segment_id, status, created_at, updated_at, affected_vehicle_ids_json, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      disruption.id,
      disruption.incidentId,
      disruption.affectedSegmentId,
      disruption.status,
      disruption.createdAt,
      disruption.updatedAt,
      disruption.affectedVehicleIds ? JSON.stringify(disruption.affectedVehicleIds) : null,
      JSON.stringify(disruption)
    );
    return disruption;
  }

  // ── Emergency Logistics ───────────────────────────────────────────────────
  public getAllEmergencyPickups(): EmergencyPickupRequest[] {
    const stmt = this.db.prepare('SELECT raw_json FROM emergency_pickups ORDER BY requested_at DESC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json) as EmergencyPickupRequest);
  }

  public saveEmergencyPickup(req: EmergencyPickupRequest): EmergencyPickupRequest {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO emergency_pickups (
        id, vehicle_id, driver_name, cargo_type, destination, godown_id, godown_name,
        status, requested_at, approved_at, dispatched_at, contractor_name,
        quantity, reason, destination_notified, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      req.id,
      req.vehicleId,
      req.driverName,
      req.cargoType,
      req.destination,
      req.godownId,
      req.godownName,
      req.status,
      req.requestedAt,
      req.approvedAt || null,
      req.dispatchedAt || null,
      req.contractorName || null,
      req.quantity,
      req.reason,
      req.destinationNotified ? 1 : 0,
      JSON.stringify(req)
    );
    return req;
  }

  // ── Health / Stats ────────────────────────────────────────────────────────
  public getHealthInfo(): StorageHealthInfo {
    const incidentsCount = (this.db.prepare('SELECT COUNT(*) as c FROM incidents').get() as { c: number }).c;
    const roadsCount = (this.db.prepare('SELECT COUNT(*) as c FROM road_segments').get() as { c: number }).c;
    const vehiclesCount = (this.db.prepare('SELECT COUNT(*) as c FROM vehicles').get() as { c: number }).c;
    const disruptionsCount = (this.db.prepare('SELECT COUNT(*) as c FROM disruptions').get() as { c: number }).c;
    const emergencyCount = (this.db.prepare('SELECT COUNT(*) as c FROM emergency_pickups').get() as { c: number }).c;

    return {
      type: this.isMemory ? 'SQLite (in-memory)' : 'SQLite (node:sqlite local demo file)',
      location: this.isMemory ? ':memory:' : DB_FILE,
      isPersistent: !this.isMemory,
      tableCounts: {
        incidents: incidentsCount,
        roadSegments: roadsCount,
        vehicles: vehiclesCount,
        disruptions: disruptionsCount,
        emergencyRequests: emergencyCount,
      },
    };
  }
}

export const opDb = new OperationalDatabase();
