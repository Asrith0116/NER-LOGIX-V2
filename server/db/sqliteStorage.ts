import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  Incident,
  RoadSegment,
  Vehicle,
  Disruption,
  EmergencyPickupRequest,
  Shipment,
  Godown,
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
    shipments: number;
    godowns: number;
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
        alternative_godown_id TEXT,
        decline_reason TEXT,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        cargo_category TEXT NOT NULL,
        cargo_sensitivity TEXT NOT NULL,
        priority TEXT NOT NULL,
        priority_score REAL NOT NULL,
        priority_explanation TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        cold_chain_required INTEGER NOT NULL,
        current_temperature_c REAL,
        current_status TEXT NOT NULL,
        affected INTEGER NOT NULL,
        disruption_id TEXT,
        delay_minutes REAL,
        continuity_status TEXT NOT NULL,
        impact_reason TEXT,
        recommended_action TEXT,
        assigned_godown_id TEXT,
        pickup_request_id TEXT,
        last_updated TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS godowns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location_json TEXT NOT NULL,
        location_label TEXT NOT NULL,
        suitable_cargo_types_json TEXT NOT NULL,
        available_stock REAL NOT NULL,
        total_capacity REAL,
        status TEXT,
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
    this.db.exec('DELETE FROM shipments;');
    this.db.exec('DELETE FROM godowns;');

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

    const baselineGodowns: Godown[] = [
      {
        id: 'gd-dimapur',
        name: 'Dimapur Regional Relief Godown',
        location: [25.9093, 93.7265],
        locationLabel: 'Dimapur Strategic Supply Node, Nagaland',
        suitableCargoTypes: ['relief', 'rations', 'grain', 'general', 'medical', 'pharmaceuticals', 'cold-chain'],
        availableStock: 120,
        totalCapacity: 500,
        status: 'operational',
      },
      {
        id: 'gd-kohima',
        name: 'Kohima Emergency Logistics Godown',
        location: [25.6751, 94.1086],
        locationLabel: 'Kohima Relief Camp Depot, Nagaland',
        suitableCargoTypes: ['pharmaceuticals', 'relief', 'medical', 'cold-chain', 'surgical'],
        availableStock: 80,
        totalCapacity: 300,
        status: 'operational',
      },
      {
        id: 'gd-imphal',
        name: 'Imphal Medical Buffer Godown',
        location: [24.8170, 93.9368],
        locationLabel: 'Imphal Valley Health Buffer Depot, Manipur',
        suitableCargoTypes: ['medical', 'pharmaceuticals', 'cold-chain', 'diagnostic', 'surgical'],
        availableStock: 60,
        totalCapacity: 250,
        status: 'operational',
      },
      {
        id: 'gd-guwahati',
        name: 'Guwahati Apex Distribution Godown',
        location: [26.1445, 91.7362],
        locationLabel: 'Guwahati Central Logistics Hub, Assam',
        suitableCargoTypes: ['all', 'general', 'medical', 'relief', 'grain', 'pharmaceuticals', 'cold-chain'],
        availableStock: 350,
        totalCapacity: 1000,
        status: 'operational',
      },
    ];

    const insertGodown = this.db.prepare(`
      INSERT INTO godowns (
        id, name, location_json, location_label, suitable_cargo_types_json, available_stock, total_capacity, status, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const g of baselineGodowns) {
      insertGodown.run(
        g.id,
        g.name,
        JSON.stringify(g.location),
        g.locationLabel,
        JSON.stringify(g.suitableCargoTypes),
        g.availableStock,
        g.totalCapacity || null,
        g.status || 'operational',
        JSON.stringify(g)
      );
    }

    const baselineShipments: Shipment[] = [
      {
        id: 'SHP-MN04-1121',
        vehicleId: 'MN-04-B-1121',
        driverName: 'Prem Thoudam',
        origin: 'Dimapur',
        destination: 'Imphal',
        cargoCategory: 'Emergency Pharmaceuticals',
        cargoSensitivity: 'critical',
        priority: 'critical',
        priorityScore: 92,
        priorityExplanation: 'CRITICAL (92/100) — Emergency pharmaceuticals + cold-chain temperature control required (2–8°C)',
        quantity: 850,
        unit: 'vials',
        coldChainRequired: true,
        currentTemperatureC: 4.2,
        currentStatus: 'in_transit',
        affected: false,
        continuityStatus: 'on_track',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'SHP-NL02-3391',
        vehicleId: 'NL-02-C-3391',
        driverName: 'Kezhakevi Sema',
        origin: 'Guwahati',
        destination: 'Kohima',
        cargoCategory: 'Relief Rations & Grain',
        cargoSensitivity: 'high',
        priority: 'high',
        priorityScore: 75,
        priorityExplanation: 'HIGH (75/100) — Essential community food grain & disaster relief rations',
        quantity: 2400,
        unit: 'kg',
        coldChainRequired: false,
        currentStatus: 'in_transit',
        affected: false,
        continuityStatus: 'on_track',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'SHP-AS01-4422',
        vehicleId: 'AS-01-J-4422',
        driverName: 'Arjun Baruah',
        origin: 'Guwahati',
        destination: 'Imphal',
        cargoCategory: 'Cold-Chain Medical Supplies',
        cargoSensitivity: 'critical',
        priority: 'critical',
        priorityScore: 95,
        priorityExplanation: 'CRITICAL (95/100) — Life-saving vaccines & insulin under active cold-chain monitoring (2–8°C)',
        quantity: 1240,
        unit: 'kg',
        coldChainRequired: true,
        currentTemperatureC: 3.8,
        currentStatus: 'scheduled',
        affected: false,
        continuityStatus: 'on_track',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'SHP-AS03-7712',
        vehicleId: 'AS-03-K-7712',
        driverName: 'Rina Gogoi',
        origin: 'Guwahati',
        destination: 'Dimapur',
        cargoCategory: 'Diagnostic Lab Samples',
        cargoSensitivity: 'high',
        priority: 'high',
        priorityScore: 78,
        priorityExplanation: 'HIGH (78/100) — Time-critical pathology samples under deep freeze (-18°C)',
        quantity: 350,
        unit: 'specimens',
        coldChainRequired: true,
        currentTemperatureC: -18.2,
        currentStatus: 'in_transit',
        affected: false,
        continuityStatus: 'on_track',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'SHP-MN01-9934',
        vehicleId: 'MN-01-A-9934',
        driverName: 'Tomcha Singh',
        origin: 'Kohima',
        destination: 'Imphal',
        cargoCategory: 'Surgical Consumables',
        cargoSensitivity: 'medium',
        priority: 'normal',
        priorityScore: 55,
        priorityExplanation: 'NORMAL (55/100) — Hospital operation theater sterile consumable kits',
        quantity: 420,
        unit: 'kits',
        coldChainRequired: false,
        currentStatus: 'in_transit',
        affected: false,
        continuityStatus: 'on_track',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'SHP-AS07-2245',
        vehicleId: 'AS-07-D-2245',
        driverName: 'Bhuban Sharma',
        origin: 'Dimapur',
        destination: 'Kohima',
        cargoCategory: 'Disaster Shelter Materials',
        cargoSensitivity: 'medium',
        priority: 'normal',
        priorityScore: 48,
        priorityExplanation: 'NORMAL (48/100) — Tarpaulins, all-weather emergency family tents, and bedding',
        quantity: 180,
        unit: 'tents',
        coldChainRequired: false,
        currentStatus: 'in_transit',
        affected: false,
        continuityStatus: 'on_track',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'SHP-NL05-4481',
        vehicleId: 'NL-05-H-4481',
        driverName: 'Vikato Angami',
        origin: 'Silchar',
        destination: 'Dimapur',
        cargoCategory: 'Water Purification Units',
        cargoSensitivity: 'medium',
        priority: 'normal',
        priorityScore: 52,
        priorityExplanation: 'NORMAL (52/100) — Chlorine water purification tablets & filtration packs',
        quantity: 50000,
        unit: 'tablets',
        coldChainRequired: false,
        currentStatus: 'in_transit',
        affected: false,
        continuityStatus: 'on_track',
        lastUpdated: new Date().toISOString(),
      },
    ];

    const insertShipment = this.db.prepare(`
      INSERT INTO shipments (
        id, vehicle_id, driver_name, origin, destination, cargo_category, cargo_sensitivity,
        priority, priority_score, priority_explanation, quantity, unit, cold_chain_required,
        current_temperature_c, current_status, affected, disruption_id, delay_minutes,
        continuity_status, impact_reason, recommended_action, assigned_godown_id,
        pickup_request_id, last_updated, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of baselineShipments) {
      insertShipment.run(
        s.id,
        s.vehicleId,
        s.driverName,
        s.origin,
        s.destination,
        s.cargoCategory,
        s.cargoSensitivity,
        s.priority,
        s.priorityScore,
        s.priorityExplanation,
        s.quantity,
        s.unit,
        s.coldChainRequired ? 1 : 0,
        s.currentTemperatureC ?? null,
        s.currentStatus,
        s.affected ? 1 : 0,
        s.disruptionId || null,
        s.delayMinutes || null,
        s.continuityStatus,
        s.impactReason || null,
        s.recommendedAction || null,
        s.assignedGodownId || null,
        s.pickupRequestId || null,
        s.lastUpdated,
        JSON.stringify(s)
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

  public getEmergencyPickupById(id: string): EmergencyPickupRequest | null {
    const stmt = this.db.prepare('SELECT raw_json FROM emergency_pickups WHERE id = ?');
    const row = stmt.get(id) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as EmergencyPickupRequest) : null;
  }

  public saveEmergencyPickup(req: EmergencyPickupRequest): EmergencyPickupRequest {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO emergency_pickups (
        id, vehicle_id, driver_name, cargo_type, destination, godown_id, godown_name,
        status, requested_at, approved_at, dispatched_at, contractor_name,
        quantity, reason, destination_notified, alternative_godown_id, decline_reason, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      req.alternativeGodownId || null,
      req.declineReason || null,
      JSON.stringify(req)
    );
    return req;
  }

  // ── Shipments (Step 9) ────────────────────────────────────────────────────
  public getAllShipments(): Shipment[] {
    const stmt = this.db.prepare('SELECT raw_json FROM shipments ORDER BY id ASC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json) as Shipment);
  }

  public getShipmentById(id: string): Shipment | null {
    const stmt = this.db.prepare('SELECT raw_json FROM shipments WHERE id = ?');
    const row = stmt.get(id) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as Shipment) : null;
  }

  public getShipmentByVehicleId(vehicleId: string): Shipment | null {
    const stmt = this.db.prepare('SELECT raw_json FROM shipments WHERE vehicle_id = ?');
    const row = stmt.get(vehicleId) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as Shipment) : null;
  }

  public saveShipment(shipment: Shipment): Shipment {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shipments (
        id, vehicle_id, driver_name, origin, destination, cargo_category, cargo_sensitivity,
        priority, priority_score, priority_explanation, quantity, unit, cold_chain_required,
        current_temperature_c, current_status, affected, disruption_id, delay_minutes,
        continuity_status, impact_reason, recommended_action, assigned_godown_id,
        pickup_request_id, last_updated, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      shipment.id,
      shipment.vehicleId,
      shipment.driverName,
      shipment.origin,
      shipment.destination,
      shipment.cargoCategory,
      shipment.cargoSensitivity,
      shipment.priority,
      shipment.priorityScore,
      shipment.priorityExplanation,
      shipment.quantity,
      shipment.unit,
      shipment.coldChainRequired ? 1 : 0,
      shipment.currentTemperatureC ?? null,
      shipment.currentStatus,
      shipment.affected ? 1 : 0,
      shipment.disruptionId || null,
      shipment.delayMinutes || null,
      shipment.continuityStatus,
      shipment.impactReason || null,
      shipment.recommendedAction || null,
      shipment.assignedGodownId || null,
      shipment.pickupRequestId || null,
      shipment.lastUpdated,
      JSON.stringify(shipment)
    );
    return shipment;
  }

  // ── Godowns & Buffer Inventory (Step 9) ───────────────────────────────────
  public getAllGodowns(): Godown[] {
    const stmt = this.db.prepare('SELECT raw_json FROM godowns ORDER BY id ASC');
    const rows = stmt.all() as { raw_json: string }[];
    return rows.map((r) => JSON.parse(r.raw_json) as Godown);
  }

  public getGodownById(id: string): Godown | null {
    const stmt = this.db.prepare('SELECT raw_json FROM godowns WHERE id = ?');
    const row = stmt.get(id) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as Godown) : null;
  }

  public saveGodown(godown: Godown): Godown {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO godowns (
        id, name, location_json, location_label, suitable_cargo_types_json, available_stock, total_capacity, status, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      godown.id,
      godown.name,
      JSON.stringify(godown.location),
      godown.locationLabel,
      JSON.stringify(godown.suitableCargoTypes),
      godown.availableStock,
      godown.totalCapacity || null,
      godown.status || 'operational',
      JSON.stringify(godown)
    );
    return godown;
  }

  public updateGodownStock(godownId: string, decrementBy: number): Godown | null {
    const godown = this.getGodownById(godownId);
    if (!godown) return null;
    const newStock = Math.max(0, godown.availableStock - decrementBy);
    godown.availableStock = newStock;
    return this.saveGodown(godown);
  }

  // ── Health / Stats ────────────────────────────────────────────────────────
  public getHealthInfo(): StorageHealthInfo {
    const incidentsCount = (this.db.prepare('SELECT COUNT(*) as c FROM incidents').get() as { c: number }).c;
    const roadsCount = (this.db.prepare('SELECT COUNT(*) as c FROM road_segments').get() as { c: number }).c;
    const vehiclesCount = (this.db.prepare('SELECT COUNT(*) as c FROM vehicles').get() as { c: number }).c;
    const disruptionsCount = (this.db.prepare('SELECT COUNT(*) as c FROM disruptions').get() as { c: number }).c;
    const emergencyCount = (this.db.prepare('SELECT COUNT(*) as c FROM emergency_pickups').get() as { c: number }).c;
    const shipmentsCount = (this.db.prepare('SELECT COUNT(*) as c FROM shipments').get() as { c: number }).c;
    const godownsCount = (this.db.prepare('SELECT COUNT(*) as c FROM godowns').get() as { c: number }).c;

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
        shipments: shipmentsCount,
        godowns: godownsCount,
      },
    };
  }
}

export const opDb = new OperationalDatabase();
