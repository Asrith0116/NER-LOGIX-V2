import { apiRequest, ApiResponse } from './apiClient';
import type {
  Incident,
  RoadSegment,
  Vehicle,
  Disruption,
  EmergencyPickupRequest,
  Godown,
  Shipment,
  ShipmentImpactResult,
} from '@/types';

export interface OperationalSnapshot {
  incidents: Incident[];
  roads: RoadSegment[];
  vehicles: Vehicle[];
  disruptions: Disruption[];
  emergencyPickups: EmergencyPickupRequest[];
  shipments?: Shipment[];
  godowns?: Godown[];
  storageHealth: {
    type: string;
    location: string;
    isPersistent: boolean;
    tableCounts: {
      incidents: number;
      roadSegments: number;
      vehicles: number;
      disruptions: number;
      emergencyRequests: number;
      shipments?: number;
      godowns?: number;
    };
  };
}

export interface FleetImpactResult {
  affectedVehicles: Vehicle[];
  totalVehicles: number;
  disruptedCount: number;
  activeDisruptions: Disruption[];
  blockedRoads: RoadSegment[];
}

export async function fetchOperationalSnapshot(): Promise<ApiResponse<{ ok: boolean; data: OperationalSnapshot }>> {
  return apiRequest<{ ok: boolean; data: OperationalSnapshot }>('/api/v1/operations/snapshot', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function fetchOperationalIncidents(): Promise<ApiResponse<Incident[]>> {
  return apiRequest<Incident[]>('/api/v1/operations/incidents', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function submitOperationalIncident(
  incident: Partial<Incident>
): Promise<ApiResponse<{ ok: boolean; incident: Incident; message?: string }>> {
  return apiRequest<{ ok: boolean; incident: Incident; message?: string }>('/api/v1/operations/incidents', {
    method: 'POST',
    body: JSON.stringify(incident),
    timeoutMs: 4000,
  });
}

export async function verifyOperationalIncident(
  incidentId: string,
  approved: boolean,
  verifiedBy: string = 'SDMA Command Officer',
  notes?: string
): Promise<
  ApiResponse<{
    ok: boolean;
    incident: Incident;
    affectedRoad?: RoadSegment;
    disruption?: Disruption;
    affectedVehicles: Vehicle[];
  }>
> {
  return apiRequest<{
    ok: boolean;
    incident: Incident;
    affectedRoad?: RoadSegment;
    disruption?: Disruption;
    affectedVehicles: Vehicle[];
  }>(`/api/v1/operations/incidents/${encodeURIComponent(incidentId)}/verify`, {
    method: 'POST',
    body: JSON.stringify({ approved, verified_by: verifiedBy, notes }),
    timeoutMs: 4000,
  });
}

export async function fetchOperationalRoadSegments(): Promise<ApiResponse<RoadSegment[]>> {
  return apiRequest<RoadSegment[]>('/api/v1/operations/roads', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function updateOperationalRoadSegment(
  segmentId: string,
  patch: Partial<RoadSegment>
): Promise<ApiResponse<RoadSegment>> {
  return apiRequest<RoadSegment>(`/api/v1/operations/roads/${encodeURIComponent(segmentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    timeoutMs: 3000,
  });
}

export async function fetchOperationalVehicles(): Promise<ApiResponse<Vehicle[]>> {
  return apiRequest<Vehicle[]>('/api/v1/operations/vehicles', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function updateOperationalVehicle(
  vehicleId: string,
  patch: Partial<Vehicle>
): Promise<ApiResponse<Vehicle>> {
  return apiRequest<Vehicle>(`/api/v1/operations/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    timeoutMs: 3000,
  });
}

export async function fetchOperationalDisruptions(): Promise<ApiResponse<Disruption[]>> {
  return apiRequest<Disruption[]>('/api/v1/operations/disruptions', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function fetchOperationalFleetImpact(): Promise<ApiResponse<FleetImpactResult>> {
  return apiRequest<FleetImpactResult>('/api/v1/operations/fleet-impact', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function resetBackendOperationalState(): Promise<ApiResponse<{ ok: boolean; message: string }>> {
  return apiRequest<{ ok: boolean; message: string }>('/api/v1/operations/reset', {
    method: 'POST',
    timeoutMs: 3000,
  });
}

export async function fetchOperationalEmergencyGodowns(): Promise<ApiResponse<Godown[]>> {
  return apiRequest<Godown[]>('/api/v1/operations/emergency-logistics/godowns', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function fetchOperationalEmergencyRequests(): Promise<ApiResponse<EmergencyPickupRequest[]>> {
  return apiRequest<EmergencyPickupRequest[]>('/api/v1/operations/emergency-logistics/requests', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function submitOperationalEmergencyRequest(
  request: Partial<EmergencyPickupRequest>
): Promise<ApiResponse<EmergencyPickupRequest>> {
  return apiRequest<EmergencyPickupRequest>('/api/v1/operations/emergency-logistics/requests', {
    method: 'POST',
    body: JSON.stringify(request),
    timeoutMs: 4000,
  });
}

export async function approveOperationalEmergencyRequest(
  requestId: string,
  contractorName: string = 'North East Logistics Contractor'
): Promise<ApiResponse<{ ok: boolean; request: EmergencyPickupRequest; godown: Godown; vehicle?: Vehicle; shipment?: Shipment }>> {
  return apiRequest<{ ok: boolean; request: EmergencyPickupRequest; godown: Godown; vehicle?: Vehicle; shipment?: Shipment }>(
    `/api/v1/operations/emergency-logistics/requests/${encodeURIComponent(requestId)}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ contractorName }),
      timeoutMs: 4000,
    }
  );
}

export async function declineOperationalEmergencyRequest(
  requestId: string,
  declineReason?: string,
  contractorName: string = 'North East Logistics Contractor'
): Promise<ApiResponse<{ ok: boolean; request: EmergencyPickupRequest; alternativeGodown?: Godown }>> {
  return apiRequest<{ ok: boolean; request: EmergencyPickupRequest; alternativeGodown?: Godown }>(
    `/api/v1/operations/emergency-logistics/requests/${encodeURIComponent(requestId)}/decline`,
    {
      method: 'POST',
      body: JSON.stringify({ declineReason, contractorName }),
      timeoutMs: 4000,
    }
  );
}

export async function fetchOperationalShipments(): Promise<ApiResponse<Shipment[]>> {
  return apiRequest<Shipment[]>('/api/v1/operations/shipments', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function fetchOperationalShipmentImpacts(): Promise<ApiResponse<ShipmentImpactResult>> {
  return apiRequest<ShipmentImpactResult>('/api/v1/operations/shipment-impacts', {
    method: 'GET',
    timeoutMs: 3000,
  });
}
