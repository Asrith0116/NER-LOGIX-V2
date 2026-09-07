/**
 * Road Network & Blockage Status API Service Boundary.
 */

import { apiRequest, ApiResponse } from './apiClient';
import type { RoadSegment } from '@/types';

export async function fetchBackendRoadSegments(): Promise<ApiResponse<RoadSegment[]>> {
  return apiRequest<RoadSegment[]>('/api/v1/roads', {
    method: 'GET',
    timeoutMs: 3000,
  });
}

export async function updateBackendRoadSegment(
  segmentId: string,
  patch: Partial<RoadSegment>
): Promise<ApiResponse<RoadSegment>> {
  return apiRequest<RoadSegment>(`/api/v1/roads/${encodeURIComponent(segmentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    timeoutMs: 3000,
  });
}
