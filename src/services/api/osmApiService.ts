import type { OsmNetworkSnapshot, OsmCorridorDetail } from '../../types/index.ts';
import { apiGet } from './apiClient.ts';

export async function getOsmRoadNetwork(): Promise<OsmNetworkSnapshot | null> {
  const res = await apiGet<OsmNetworkSnapshot>('/network/osm/roads');
  return res.data;
}

export async function getOsmCorridors(): Promise<{
  corridors: Record<string, OsmCorridorDetail>;
  source: string;
  availabilityState: string;
  fetchedAt: string;
} | null> {
  const res = await apiGet<{
    corridors: Record<string, OsmCorridorDetail>;
    source: string;
    availabilityState: string;
    fetchedAt: string;
  }>('/network/osm/corridors');
  return res.data;
}
