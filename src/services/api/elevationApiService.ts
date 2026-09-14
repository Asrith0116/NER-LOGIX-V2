import type { ElevationProfile } from '../../types/index.ts';
import { apiGet } from './apiClient.ts';

export async function getTerrainCorridors(): Promise<{
  profiles: Record<string, ElevationProfile>;
  source: string;
  calculatedAt: string;
} | null> {
  const res = await apiGet<{
    profiles: Record<string, ElevationProfile>;
    source: string;
    calculatedAt: string;
  }>('/terrain/corridors');
  return res.data;
}
