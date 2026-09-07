/**
 * Trip Planning & Route Candidate API Service Boundary.
 */

import { apiRequest, ApiResponse } from './apiClient';
import type { TripRequest, Route } from '@/types';

export interface BackendTripResponse {
  request_id: string;
  recommended_route_id: string;
  routes: Route[];
  generated_at: string;
  provider: string;
}

export async function requestBackendTripPlan(
  tripRequest: TripRequest
): Promise<ApiResponse<BackendTripResponse>> {
  return apiRequest<BackendTripResponse>('/api/v1/trips/plan', {
    method: 'POST',
    body: JSON.stringify(tripRequest),
    timeoutMs: 4000,
  });
}
