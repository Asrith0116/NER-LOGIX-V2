import type {
  BackendVehiclePosition,
  VehiclePositionUpdatePayload,
} from '../../types/index.ts';
import { apiGet, apiPost } from './apiClient.ts';

export async function getBackendVehiclePositions(): Promise<{
  positions: BackendVehiclePosition[];
  count: number;
  timestamp: string;
  isHardwareTelematics: boolean;
  boundaryType: string;
} | null> {
  const res = await apiGet<{
    positions: BackendVehiclePosition[];
    count: number;
    timestamp: string;
    isHardwareTelematics: boolean;
    boundaryType: string;
  }>('/operations/vehicles/positions');
  return res.data;
}

export async function updateBackendVehiclePosition(
  payload: VehiclePositionUpdatePayload
): Promise<{ ok: boolean; position: BackendVehiclePosition } | null> {
  const res = await apiPost<{ ok: boolean; position: BackendVehiclePosition }>(
    '/operations/vehicles/positions',
    payload
  );
  return res.data;
}

export async function batchUpdateBackendVehiclePositions(
  positions: VehiclePositionUpdatePayload[]
): Promise<{ ok: boolean; updated: BackendVehiclePosition[]; count: number } | null> {
  const res = await apiPost<{ ok: boolean; updated: BackendVehiclePosition[]; count: number }>(
    '/operations/vehicles/positions',
    { positions }
  );
  return res.data;
}
