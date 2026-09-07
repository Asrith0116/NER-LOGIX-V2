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
    timeoutMs: 3000,
  });
}
