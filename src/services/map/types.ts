/**
 * Provider-Agnostic Map Abstraction Types for NER-LOGIX.
 * Supports Google Maps Platform (Vector Maps JS API) and Leaflet/Carto (Local Fallback Engine).
 */

import type { Route, Incident, Vehicle, Godown, RoadSegment } from '@/types';
import type { SelectedMapEntity } from '@/components/map/MapInspector';

export type { SelectedMapEntity };


export type MapProviderType = 'google' | 'leaflet';

export type MapProviderState = 
  | 'google_live'
  | 'local_engine'
  | 'loading'
  | 'unavailable';

export interface MapInitOptions {
  container: HTMLDivElement;
  center: [number, number];
  zoom: number;
  apiKey?: string;
  onSelectEntity?: (entity: SelectedMapEntity | null) => void;
}

export interface MapLayerVisibility {
  routes: boolean;
  vehicles: boolean;
  incidents: boolean;
  godowns: boolean;
  roadSegments: boolean;
}

export interface IMapAdapter {
  readonly providerType: MapProviderType;
  readonly state: MapProviderState;

  initialize(options: MapInitOptions): Promise<void>;
  destroy(): void;

  setCenter(latlng: [number, number], zoom?: number, animate?: boolean): void;
  fitBounds(bounds: [number, number][], padding?: number): void;

  renderRoutes(routes: Route[], selectedRouteId?: string): void;
  renderVehicles(vehicles: Vehicle[], selectedVehicleId?: string): void;
  renderIncidents(incidents: Incident[]): void;
  renderGodowns(godowns: Godown[]): void;
  renderRoadSegments(roadSegments: RoadSegment[]): void;
  renderWaypoints(origin?: { latlng: [number, number]; label: string }, destination?: { latlng: [number, number]; label: string }): void;

  setLayerVisibility(visibility: Partial<MapLayerVisibility>): void;
}
