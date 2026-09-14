import type {
  HistoricalHazardSummary,
  CorridorHazardExposure,
} from '../../types/index.ts';
import { apiGet } from './apiClient.ts';

export async function getHistoricalHazards(): Promise<HistoricalHazardSummary | null> {
  const res = await apiGet<HistoricalHazardSummary>('/hazards/historical');
  return res.data;
}

export async function getHistoricalCorridorExposure(corridorKey: string): Promise<CorridorHazardExposure | null> {
  const res = await apiGet<CorridorHazardExposure>(`/hazards/historical/exposure?corridor=${encodeURIComponent(corridorKey)}`);
  return res.data;
}
