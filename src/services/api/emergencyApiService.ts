/**
 * Emergency Logistics & Strategic Buffer Godown API Service Boundary.
 */

import { apiRequest, ApiResponse } from './apiClient';
import type { Godown, EmergencyPickupRequest } from '@/types';

export async function fetchBackendGodowns(): Promise<ApiResponse<Godown[]>> {
  return apiRequest<Godown[]>('/api/v1/emergency-logistics/godowns', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function fetchBackendPickupRequests(): Promise<ApiResponse<EmergencyPickupRequest[]>> {
  return apiRequest<EmergencyPickupRequest[]>('/api/v1/emergency-logistics/requests', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function submitBackendPickupRequest(
  request: Partial<EmergencyPickupRequest>
): Promise<ApiResponse<EmergencyPickupRequest>> {
  return apiRequest<EmergencyPickupRequest>('/api/v1/emergency-logistics/requests', {
    method: 'POST',
    body: JSON.stringify(request),
    timeoutMs: 4000,
  });
}

export async function decideBackendPickupRequest(
  requestId: string,
  approved: boolean,
  contractorName: string = 'North East Logistics Contractor'
): Promise<ApiResponse<EmergencyPickupRequest>> {
  return apiRequest<EmergencyPickupRequest>(
    `/api/v1/emergency-logistics/requests/${encodeURIComponent(requestId)}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({ approved, contractor_name: contractorName }),
      timeoutMs: 4000,
    }
  );
}
