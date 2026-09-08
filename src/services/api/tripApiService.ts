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

export interface BackendComputeRoutingResponse {
  provider_status: 'google_live' | 'fallback_local' | 'error';
  candidates_count: number;
  routes: Route[];
  message: string;
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

export async function computeBackendRouting(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string },
  vehicleType: string = '10-wheeler',
  cargoCategory: string = 'general_cargo',
  priority: string = 'standard',
  cargoSensitivity: string = 'medium',
  constraints?: any
): Promise<ApiResponse<BackendComputeRoutingResponse>> {
  return apiRequest<BackendComputeRoutingResponse>('/api/v1/trips/compute', {
    method: 'POST',
    body: JSON.stringify({
      origin: { name: origin.name, short_name: origin.name, lat: origin.lat, lng: origin.lng },
      destination: { name: destination.name, short_name: destination.name, lat: destination.lat, lng: destination.lng },
      vehicle_type: vehicleType,
      cargo_category: cargoCategory,
      cargo_sensitivity: cargoSensitivity,
      priority,
      constraints,
    }),
    timeoutMs: 4000,
  });
}

