/**
 * Vehicle & Fleet Telemetry API Service Boundary.
 */

import { apiRequest, ApiResponse } from './apiClient';
import type { Vehicle } from '@/types';

export async function fetchBackendVehicles(): Promise<ApiResponse<Vehicle[]>> {
  return apiRequest<Vehicle[]>('/api/v1/vehicles', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function fetchBackendVehicleById(id: string): Promise<ApiResponse<Vehicle>> {
  return apiRequest<Vehicle>(`/api/v1/vehicles/${encodeURIComponent(id)}`, {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function updateBackendVehicleStatus(
  id: string,
  patch: Partial<Vehicle>
): Promise<ApiResponse<Vehicle>> {
  return apiRequest<Vehicle>(`/api/v1/vehicles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    timeoutMs: 3000,
  });
}
