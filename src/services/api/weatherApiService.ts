/**
 * Weather Intelligence API Service Boundary.
 */

import { apiRequest, ApiResponse } from './apiClient';
import type { EnvironmentalSnapshot } from '@/types';

export interface BackendRegionalWeatherResponse {
  observations: Record<string, EnvironmentalSnapshot>;
  is_spike_active: boolean;
  timestamp: string;
}

export async function fetchBackendRegionalWeather(): Promise<ApiResponse<BackendRegionalWeatherResponse>> {
  return apiRequest<BackendRegionalWeatherResponse>('/api/v1/weather', {
    method: 'GET',
    timeoutMs: 4000,
  });
}

export async function fetchBackendLocationWeather(
  locationName: string
): Promise<ApiResponse<EnvironmentalSnapshot>> {
  const encoded = encodeURIComponent(locationName);
  return apiRequest<EnvironmentalSnapshot>(`/api/v1/weather/current?location=${encoded}`, {
    method: 'GET',
    timeoutMs: 4000,
  });
}

export async function setBackendWeatherSpike(
  active: boolean
): Promise<ApiResponse<{ ok: boolean; is_spike_active: boolean }>> {
  return apiRequest<{ ok: boolean; is_spike_active: boolean }>('/api/v1/weather/spike', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
    timeoutMs: 3000,
  });
}
