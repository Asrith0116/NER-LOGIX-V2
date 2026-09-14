/**
 * Backend Health & Capability Detection Service.
 * Periodically or on-demand probes the backend `/health` endpoint
 * (served authoritatively by the Node/Vite operations router, and compatible with FastAPI).
 */

import { apiRequest } from './apiClient';

export interface BackendHealthInfo {
  status: string;
  service: string;
  version: string;
  environment: string;
  database: string;
  timestamp: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface BackendConnectionState {
  isConnected: boolean;
  isChecking: boolean;
  healthInfo: BackendHealthInfo | null;
  lastCheckedAt: string | null;
  errorMessage: string | null;
}

export async function checkBackendHealth(timeoutMs: number = 2000): Promise<{
  connected: boolean;
  data: BackendHealthInfo | null;
  error: string | null;
}> {
  const result = await apiRequest<BackendHealthInfo>('/health', {
    method: 'GET',
    timeoutMs,
  });

  if (result.ok && result.data && result.data.status === 'ok') {
    return {
      connected: true,
      data: result.data,
      error: null,
    };
  }

  return {
    connected: false,
    data: null,
    error: result.error,
  };
}
