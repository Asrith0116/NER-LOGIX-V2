/**
 * Hazard Incidents & SDMA Triage API Service Boundary.
 */

import { apiRequest, ApiResponse } from './apiClient';
import type { Incident } from '@/types';

export async function fetchBackendIncidents(): Promise<ApiResponse<Incident[]>> {
  return apiRequest<Incident[]>('/api/v1/incidents', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function submitBackendIncident(
  incident: Partial<Incident>
): Promise<ApiResponse<Incident>> {
  return apiRequest<Incident>('/api/v1/incidents', {
    method: 'POST',
    body: JSON.stringify(incident),
    timeoutMs: 4000,
  });
}

export async function verifyBackendIncident(
  incidentId: string,
  approved: boolean,
  verifiedBy: string = 'SDMA Command Officer'
): Promise<ApiResponse<Incident>> {
  return apiRequest<Incident>(`/api/v1/incidents/${encodeURIComponent(incidentId)}/verify`, {
    method: 'POST',
    body: JSON.stringify({ approved, verified_by: verifiedBy }),
    timeoutMs: 4000,
  });
}
