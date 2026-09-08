import type { IncomingMessage, ServerResponse } from 'node:http';
import { operationalEngine } from '../services/operationalEngine.ts';
import { opDb } from '../db/sqliteStorage.ts';

export function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });
  res.end(json);
}

export async function parseJsonBody<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (!raw.trim()) {
          resolve({} as T);
          return;
        }
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`Invalid JSON request body: ${(err as Error).message}`));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

export async function handleOperationsRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method?.toUpperCase() || 'GET';
  const rawUrl = req.url || '';
  const url = rawUrl.split('?')[0];

  // 1. Health Probe
  if (method === 'GET' && (url === '/health' || url === '/api/v1/operations/health' || url === '/api/health')) {
    const storageInfo = opDb.getHealthInfo();
    sendJson(res, 200, {
      status: 'ok',
      service: 'ner-logix-operational-backend',
      version: '1.0.0',
      environment: 'development',
      database: storageInfo.type,
      storageLocation: storageInfo.location,
      persistenceMode: storageInfo.isPersistent ? 'Persistent SQLite' : 'In-Memory Demo',
      timestamp: new Date().toISOString(),
      capabilities: [
        'shared_operational_backend',
        'incident_operations',
        'sdma_human_verification',
        'road_segment_status',
        'fleet_telemetry',
        'disruption_engine',
        'deterministic_fleet_impact',
        'emergency_godowns',
        'gemini_advisory_integration',
        'sqlite_demo_persistence',
      ],
      counts: storageInfo.tableCounts,
    });
    return true;
  }

  // 2. Full Operational Snapshot
  if (method === 'GET' && (url === '/api/v1/operations/snapshot' || url === '/api/v1/snapshot')) {
    const snapshot = operationalEngine.getSnapshot();
    sendJson(res, 200, {
      ok: true,
      data: snapshot,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  // 3. Reset Operational State
  if (method === 'POST' && (url === '/api/v1/operations/reset' || url === '/api/v1/reset')) {
    operationalEngine.resetToCleanState();
    sendJson(res, 200, {
      ok: true,
      message: 'Operational database successfully reset to clean baseline state.',
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  // 4. Incidents
  if ((url === '/api/v1/operations/incidents' || url === '/api/v1/incidents') && method === 'GET') {
    const incidents = operationalEngine.getAllIncidents();
    sendJson(res, 200, incidents);
    return true;
  }

  if ((url === '/api/v1/operations/incidents' || url === '/api/v1/incidents') && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const created = operationalEngine.createIncident(body);
      sendJson(res, 201, {
        ok: true,
        incident: created,
        message: 'Incident created with pending_verification state.',
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // Incident Verification: /api/v1/incidents/:id/verify or /api/v1/operations/incidents/:id/verify
  const verifyMatch = url.match(/^\/api\/v1\/(?:operations\/)?incidents\/([^/]+)\/verify$/);
  if (verifyMatch && method === 'POST') {
    const incidentId = decodeURIComponent(verifyMatch[1]);
    try {
      const body = await parseJsonBody<{
        approved?: boolean;
        verified_by?: string;
        notes?: string;
      }>(req);
      const approved = body.approved ?? true;
      const verifiedBy = body.verified_by || 'SDMA Command Officer';
      const result = operationalEngine.verifyIncident(incidentId, approved, verifiedBy, body.notes);
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // Single Incident: /api/v1/incidents/:id
  const incidentMatch = url.match(/^\/api\/v1\/(?:operations\/)?incidents\/([^/]+)$/);
  if (incidentMatch && method === 'GET') {
    const incidentId = decodeURIComponent(incidentMatch[1]);
    const incident = operationalEngine.getIncidentById(incidentId);
    if (!incident) {
      sendJson(res, 404, { ok: false, error: `Incident "${incidentId}" not found.` });
    } else {
      sendJson(res, 200, incident);
    }
    return true;
  }

  // 5. Road Segments
  if ((url === '/api/v1/operations/roads' || url === '/api/v1/roads') && method === 'GET') {
    const roads = operationalEngine.getAllRoadSegments();
    sendJson(res, 200, roads);
    return true;
  }

  const roadMatch = url.match(/^\/api\/v1\/(?:operations\/)?roads\/([^/]+)$/);
  if (roadMatch && method === 'PATCH') {
    const roadId = decodeURIComponent(roadMatch[1]);
    try {
      const patch = await parseJsonBody(req);
      const updated = operationalEngine.updateRoadSegment(roadId, patch);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // 6. Vehicles
  if ((url === '/api/v1/operations/vehicles' || url === '/api/v1/vehicles') && method === 'GET') {
    const vehicles = operationalEngine.getAllVehicles();
    sendJson(res, 200, vehicles);
    return true;
  }

  const vehicleMatch = url.match(/^\/api\/v1\/(?:operations\/)?vehicles\/([^/]+)$/);
  if (vehicleMatch && method === 'GET') {
    const vehicleId = decodeURIComponent(vehicleMatch[1]);
    const vehicle = operationalEngine.getVehicleById(vehicleId);
    if (!vehicle) {
      sendJson(res, 404, { ok: false, error: `Vehicle "${vehicleId}" not found.` });
    } else {
      sendJson(res, 200, vehicle);
    }
    return true;
  }

  if (vehicleMatch && method === 'PATCH') {
    const vehicleId = decodeURIComponent(vehicleMatch[1]);
    try {
      const patch = await parseJsonBody(req);
      const updated = operationalEngine.updateVehicle(vehicleId, patch);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // 7. Disruptions
  if ((url === '/api/v1/operations/disruptions' || url === '/api/v1/disruptions') && method === 'GET') {
    const disruptions = operationalEngine.getAllDisruptions();
    sendJson(res, 200, disruptions);
    return true;
  }

  // 8. Fleet Impact
  if ((url === '/api/v1/operations/fleet-impact' || url === '/api/v1/fleet-impact') && method === 'GET') {
    const impact = operationalEngine.getFleetImpact();
    sendJson(res, 200, impact);
    return true;
  }

  // 9. Emergency Logistics
  if (
    (url === '/api/v1/emergency-logistics/godowns' ||
      url === '/api/v1/operations/emergency-logistics/godowns') &&
    method === 'GET'
  ) {
    const DEMO_GODOWNS = [
      {
        id: 'godown-001',
        name: 'Dimapur Buffer Depot',
        location: [25.9093, 93.7265],
        locationLabel: 'Dimapur Supply Node',
        suitableCargoTypes: [
          'Cold-Chain Medical Supplies',
          'Emergency Pharmaceuticals',
          'Diagnostic Lab Samples',
        ],
        availableStock: 5000,
      },
      {
        id: 'godown-002',
        name: 'Kohima Strategic Buffer',
        location: [25.6751, 94.1086],
        locationLabel: 'Kohima Relief Camp',
        suitableCargoTypes: [
          'Relief Rations & Grain',
          'Disaster Shelter Materials',
          'Water Purification Tablets',
        ],
        availableStock: 3200,
      },
      {
        id: 'godown-003',
        name: 'Silchar Medical Depot',
        location: [24.8268, 92.7981],
        locationLabel: 'Silchar Logistics Hub',
        suitableCargoTypes: [
          'Cold-Chain Medical Supplies',
          'Surgical Consumables',
          'Emergency Pharmaceuticals',
        ],
        availableStock: 4500,
      },
    ];
    sendJson(res, 200, DEMO_GODOWNS);
    return true;
  }

  if (
    (url === '/api/v1/emergency-logistics/requests' ||
      url === '/api/v1/operations/emergency-logistics/requests') &&
    method === 'GET'
  ) {
    const requests = opDb.getAllEmergencyPickups();
    sendJson(res, 200, requests);
    return true;
  }

  if (
    (url === '/api/v1/emergency-logistics/requests' ||
      url === '/api/v1/operations/emergency-logistics/requests') &&
    method === 'POST'
  ) {
    try {
      const body = (await parseJsonBody(req)) as Record<string, any>;
      const reqId = String(body.id || `REQ-EMG-${Math.floor(1000 + Math.random() * 9000)}`);
      const saved = opDb.saveEmergencyPickup({
        id: reqId,
        vehicleId: String(body.vehicleId || 'AS-01-J-4422'),
        driverName: String(body.driverName || 'Arjun Baruah'),
        cargoType: String(body.cargoType || 'Cold-Chain Medical Supplies'),
        destination: String(body.destination || 'Imphal District Hospital'),
        godownId: String(body.godownId || 'godown-001'),
        godownName: String(body.godownName || 'Dimapur Buffer Depot'),
        status: (body.status || 'requested') as any,
        requestedAt: String(body.requestedAt || new Date().toISOString()),
        quantity: typeof body.quantity === 'number' ? body.quantity : 1200,
        reason: String(body.reason || 'No alternate route from current position.'),
        destinationNotified: typeof body.destinationNotified === 'boolean' ? body.destinationNotified : true,
      });
      sendJson(res, 201, saved);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  return false;
}
