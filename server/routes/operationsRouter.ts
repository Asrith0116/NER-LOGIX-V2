import type { IncomingMessage, ServerResponse } from 'node:http';
import { operationalEngine } from '../services/operationalEngine.ts';
import { opDb } from '../db/sqliteStorage.ts';
import { backendWeatherService } from '../services/weatherService.ts';
import { backendOsmNetworkService } from '../services/osmNetworkService.ts';
import { backendHistoricalHazardService } from '../services/historicalHazardService.ts';
import { backendVehiclePositionService } from '../services/vehiclePositionService.ts';
import { backendElevationService } from '../services/elevationService.ts';
import { geospatialSnappingService } from '../services/geospatialSnappingService.ts';
import type { VehiclePositionUpdatePayload } from '../../src/types/index.ts';

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

  // 9. Shipments & Logistics Continuity (Step 9)
  if (
    (url === '/api/v1/shipments' || url === '/api/v1/operations/shipments') &&
    method === 'GET'
  ) {
    const shipments = operationalEngine.getAllShipments();
    sendJson(res, 200, shipments);
    return true;
  }

  if (
    (url === '/api/v1/shipments/impacts' ||
      url === '/api/v1/operations/shipments/impacts' ||
      url === '/api/v1/operations/shipment-impacts') &&
    method === 'GET'
  ) {
    const impacts = operationalEngine.getShipmentImpacts();
    sendJson(res, 200, impacts);
    return true;
  }

  const shipmentMatch = url.match(/^\/api\/v1\/(?:operations\/)?shipments\/([^/?]+)$/);
  if (shipmentMatch && method === 'GET') {
    const id = shipmentMatch[1];
    const shipment = operationalEngine.getShipmentById(id);
    if (!shipment) {
      sendJson(res, 404, { ok: false, error: `Shipment "${id}" not found` });
      return true;
    }
    sendJson(res, 200, shipment);
    return true;
  }

  // 10. Emergency Logistics & Strategic Godowns
  if (
    (url === '/api/v1/emergency-logistics/godowns' ||
      url === '/api/v1/operations/emergency-logistics/godowns' ||
      url === '/api/v1/godowns' ||
      url === '/api/v1/operations/godowns') &&
    method === 'GET'
  ) {
    const godowns = operationalEngine.getAllGodowns();
    sendJson(res, 200, godowns);
    return true;
  }

  if (
    (url === '/api/v1/emergency-logistics/requests' ||
      url === '/api/v1/operations/emergency-logistics/requests' ||
      url === '/api/v1/pickup-requests') &&
    method === 'GET'
  ) {
    const requests = operationalEngine.getAllPickupRequests();
    sendJson(res, 200, requests);
    return true;
  }

  if (
    (url === '/api/v1/emergency-logistics/requests' ||
      url === '/api/v1/operations/emergency-logistics/requests' ||
      url === '/api/v1/pickup-requests') &&
    method === 'POST'
  ) {
    try {
      const body = (await parseJsonBody(req)) as Record<string, any>;
      const created = operationalEngine.createPickupRequest(body);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // Approve Emergency Pickup
  const approveMatch = url.match(
    /^\/api\/v1\/(?:operations\/)?(?:emergency-logistics\/)?(?:requests|pickup-requests)\/([^/?]+)\/approve$/
  );
  if (approveMatch && method === 'POST') {
    try {
      const id = approveMatch[1];
      const body = (await parseJsonBody(req).catch(() => ({}))) as Record<string, any>;
      const result = operationalEngine.approvePickupRequest(
        id,
        body.contractorName || 'North East Logistics Contractor'
      );
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // Decline Emergency Pickup
  const declineMatch = url.match(
    /^\/api\/v1\/(?:operations\/)?(?:emergency-logistics\/)?(?:requests|pickup-requests)\/([^/?]+)\/decline$/
  );
  if (declineMatch && method === 'POST') {
    try {
      const id = declineMatch[1];
      const body = (await parseJsonBody(req).catch(() => ({}))) as Record<string, any>;
      const result = operationalEngine.declinePickupRequest(
        id,
        body.declineReason,
        body.contractorName
      );
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // 11. Trip Planning & Compute Endpoints (Honest Local Fallback Routing)
  if ((url === '/api/v1/trips/compute' || url === '/api/v1/operations/trips/compute') && method === 'POST') {
    sendJson(res, 200, {
      provider_status: 'fallback_local',
      candidates_count: 0,
      routes: [],
      message: 'Local fallback routing is active in Phase 1. Google Routes API is not configured.',
    });
    return true;
  }

  if ((url === '/api/v1/trips/plan' || url === '/api/v1/operations/trips/plan') && method === 'POST') {
    sendJson(res, 200, {
      request_id: 'req-local-plan',
      recommended_route_id: 'route-b',
      routes: [],
      provider: 'local_fallback',
      generated_at: new Date().toISOString(),
    });
    return true;
  }

  // 12. Weather Endpoints (Open-Meteo Live Integration with Fallback)
  if (
    (url === '/api/v1/weather' ||
      url === '/api/v1/operations/weather' ||
      url.startsWith('/api/v1/weather?') ||
      url.startsWith('/api/v1/operations/weather?')) &&
    method === 'GET'
  ) {
    try {
      const observations = await backendWeatherService.fetchRegionalWeather();
      sendJson(res, 200, {
        observations,
        is_spike_active: backendWeatherService.getSpikeStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  if (
    (url === '/api/v1/weather/current' ||
      url === '/api/v1/operations/weather/current' ||
      url.startsWith('/api/v1/weather/current?') ||
      url.startsWith('/api/v1/operations/weather/current?')) &&
    method === 'GET'
  ) {
    try {
      let location = 'Guwahati';
      const parsedUrl = new URL(url, 'http://localhost:3000');
      const qLoc = parsedUrl.searchParams.get('location') || parsedUrl.searchParams.get('loc');
      if (qLoc) {
        location = qLoc;
      }
      const data = await backendWeatherService.fetchLocationWeather(location);
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  if (
    (url === '/api/v1/weather/spike' || url === '/api/v1/operations/weather/spike') &&
    method === 'POST'
  ) {
    try {
      const body = (await parseJsonBody(req).catch(() => ({}))) as Record<string, any>;
      const active = Boolean(body.active);
      backendWeatherService.setSpike(active);
      sendJson(res, 200, { ok: true, is_spike_active: active });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // 13. OpenStreetMap Road Network Endpoints
  if (
    (url === '/api/v1/network/osm/roads' ||
      url === '/api/v1/operations/network/osm/roads' ||
      url === '/api/v1/network/osm' ||
      url === '/api/v1/operations/network/osm') &&
    method === 'GET'
  ) {
    try {
      const snapshot = await backendOsmNetworkService.fetchRoadNetwork();
      sendJson(res, 200, snapshot);
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  if (
    (url === '/api/v1/network/osm/corridors' ||
      url === '/api/v1/operations/network/osm/corridors') &&
    method === 'GET'
  ) {
    try {
      const snapshot = await backendOsmNetworkService.fetchRoadNetwork();
      sendJson(res, 200, {
        corridors: snapshot.corridors,
        source: snapshot.source,
        availabilityState: snapshot.availabilityState,
        fetchedAt: snapshot.fetchedAt,
      });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // 14. Historical Hazard & Landslide Inventory Endpoints (NASA GLC & GSI)
  if (
    (url === '/api/v1/hazards/historical' ||
      url === '/api/v1/operations/hazards/historical' ||
      url.startsWith('/api/v1/hazards/historical?') ||
      url.startsWith('/api/v1/operations/hazards/historical?')) &&
    method === 'GET'
  ) {
    try {
      const summary = backendHistoricalHazardService.getSummary();
      sendJson(res, 200, summary);
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  if (
    (url === '/api/v1/hazards/historical/corridors' ||
      url === '/api/v1/operations/hazards/historical/corridors' ||
      url.startsWith('/api/v1/hazards/historical/corridors?') ||
      url.startsWith('/api/v1/operations/hazards/historical/corridors?')) &&
    method === 'GET'
  ) {
    try {
      const summary = backendHistoricalHazardService.getSummary();
      sendJson(res, 200, {
        corridors: summary.corridors,
        source: summary.source,
        availabilityState: summary.availabilityState,
        timestamp: summary.timestamp,
      });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  if (
    (url === '/api/v1/hazards/historical/exposure' ||
      url === '/api/v1/operations/hazards/historical/exposure' ||
      url.startsWith('/api/v1/hazards/historical/exposure?') ||
      url.startsWith('/api/v1/operations/hazards/historical/exposure?')) &&
    method === 'GET'
  ) {
    try {
      const parsedUrl = new URL(url, 'http://localhost:3000');
      const corridor = parsedUrl.searchParams.get('corridor') || 'nh2_mountain_direct';
      const exposure = backendHistoricalHazardService.getCorridorExposure(corridor);
      sendJson(res, 200, exposure);
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // 15. Backend Vehicle Position Signal Boundary
  if (
    (url === '/api/v1/operations/vehicles/positions' ||
      url === '/api/v1/vehicles/positions') &&
    method === 'GET'
  ) {
    try {
      const positions = backendVehiclePositionService.getAllPositions();
      sendJson(res, 200, {
        positions,
        count: positions.length,
        timestamp: new Date().toISOString(),
        isHardwareTelematics: false,
        boundaryType: 'backend_authoritative_signal',
      });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  if (
    (url === '/api/v1/operations/vehicles/positions' ||
      url === '/api/v1/vehicles/positions') &&
    method === 'POST'
  ) {
    try {
      const body = (await parseJsonBody(req).catch(() => ({}))) as any;
      if (Array.isArray(body?.positions)) {
        const updated = backendVehiclePositionService.batchUpdatePositions(
          body.positions as VehiclePositionUpdatePayload[]
        );
        sendJson(res, 200, { ok: true, updated, count: updated.length });
      } else if (body?.vehicleId && typeof body.latitude === 'number' && typeof body.longitude === 'number') {
        const updated = backendVehiclePositionService.updatePosition(body as VehiclePositionUpdatePayload);
        sendJson(res, 200, { ok: true, position: updated });
      } else {
        sendJson(res, 400, { ok: false, error: 'Invalid vehicle position payload. Requires vehicleId, latitude, and longitude.' });
      }
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  const vehiclePosMatch = url.match(/^\/api\/v1\/(?:operations\/)?vehicles\/([^/]+)\/position$/);
  if (vehiclePosMatch && method === 'GET') {
    const vId = decodeURIComponent(vehiclePosMatch[1]);
    const pos = backendVehiclePositionService.getPosition(vId);
    if (!pos) {
      sendJson(res, 404, { ok: false, error: `Vehicle position signal for "${vId}" not found.` });
    } else {
      sendJson(res, 200, pos);
    }
    return true;
  }

  // 16. Terrain & Elevation Profiles (Open-Meteo Elevation API — Copernicus DEM GLO-90)
  if (
    (url === '/api/v1/terrain/corridors' ||
      url === '/api/v1/operations/terrain/corridors' ||
      url === '/api/v1/terrain/elevation' ||
      url === '/api/v1/operations/terrain/elevation' ||
      url.startsWith('/api/v1/terrain/corridors?') ||
      url.startsWith('/api/v1/terrain/elevation?')) &&
    method === 'GET'
  ) {
    try {
      const profiles = await backendElevationService.fetchCorridorProfiles();
      sendJson(res, 200, {
        profiles,
        source: 'Open-Meteo Elevation API — Copernicus DEM GLO-90 (90 m)',
        calculatedAt: new Date().toISOString(),
      });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  // 17. Geospatial Point-to-Road Snapping
  if (
    (url === '/api/v1/operations/incidents/snap' ||
      url === '/api/v1/incidents/snap') &&
    method === 'POST'
  ) {
    try {
      const body = (await parseJsonBody(req).catch(() => ({}))) as Record<string, any>;
      const lat = Number(body.latitude ?? body.lat);
      const lng = Number(body.longitude ?? body.lng);
      const thresholdMeters = Number(body.thresholdMeters || 15000);

      if (isNaN(lat) || isNaN(lng)) {
        sendJson(res, 400, { ok: false, error: 'latitude and longitude are required numbers.' });
        return true;
      }

      const snap = geospatialSnappingService.snapCoordinateToRoad(lat, lng, thresholdMeters);
      sendJson(res, 200, { ok: true, ...snap });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: (err as Error).message });
    }
    return true;
  }

  return false;
}
