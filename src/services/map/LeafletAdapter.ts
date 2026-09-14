/**
 * Leaflet & Carto Local Fallback Engine Adapter.
 * Guaranteed local map renderer for NER-LOGIX.
 */

import L from 'leaflet';
import { getRiskColor } from '@/utils';
import type { Route, RouteCandidate, Incident, Vehicle, Godown, RoadSegment } from '@/types';
import type {
  IMapAdapter,
  MapInitOptions,
  MapLayerVisibility,
  MapProviderState,
  MapProviderType,
} from './types';
import type { SelectedMapEntity } from '@/components/map/MapInspector';

// Fix Leaflet default icon path issue with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Safe guard L.DomUtil.getPosition and setPosition to prevent "Cannot read properties of undefined (reading '_leaflet_pos')"
if (L.DomUtil && L.DomUtil.getPosition) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: any) {
    if (!el) {
      return new L.Point(0, 0);
    }
    try {
      return originalGetPosition(el);
    } catch {
      return new L.Point(0, 0);
    }
  };
}

if (L.DomUtil && L.DomUtil.setPosition) {
  const originalSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: any, point: any) {
    if (!el) return;
    try {
      originalSetPosition(el, point);
    } catch {
      // ignore
    }
  };
}

function createIncidentIcon(severity: string, isSelected: boolean = false) {
  const colors: Record<string, string> = {
    low: '#16a34a',
    moderate: '#d97706',
    high: '#dc2626',
    critical: '#991b1b',
  };
  const color = colors[severity] ?? '#dc2626';
  const size = isSelected ? 32 : 26;
  const stroke = isSelected ? '3px solid #1a1a19' : '2px solid white';

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:${stroke};
      border-radius:50%;
      box-shadow:0 3px 10px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
      transition:transform 0.15s ease;
    ">
      <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createVehicleIcon(v: Vehicle, isSelected: boolean = false) {
  const colors: Record<string, string> = {
    low: '#16a34a',
    moderate: '#d97706',
    high: '#dc2626',
    blocked: '#7f1d1d',
  };
  const isDisrupted = Boolean(v.affectedByDisruptionId);
  const isRerouted = v.rerouteStatus === 'active';
  const isFallback = v.status === 'emergency_pickup' || v.rerouteStatus === 'no_alternative';

  const baseColor = isFallback ? '#c2410c' : isRerouted ? '#2563eb' : isDisrupted ? '#dc2626' : (colors[v.riskLevel] ?? '#2563eb');
  const size = isSelected ? 34 : 26;
  const stroke = isSelected ? '3px solid #1a1a19' : '2px solid white';
  const shortId = v.id.split('-').pop() || v.id;

  return L.divIcon({
    className: '',
    html: `<div style="
      position:relative;
      display:flex;flex-direction:column;align-items:center;
      cursor:pointer;
    ">
      <div style="
        width:${size}px;height:${size}px;
        background:${baseColor};
        border:${stroke};
        border-radius:8px;
        box-shadow:0 3px 10px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <path d="M16 8l4 3v5h-4V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
      <div style="
        margin-top:2px;
        background:#1a1a19;color:white;
        font-family:Inter,sans-serif;font-size:9px;font-weight:700;
        padding:1px 5px;border-radius:4px;white-space:nowrap;
        box-shadow:0 1px 4px rgba(0,0,0,0.25);
      ">
        ${shortId}
      </div>
    </div>`,
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size / 2],
  });
}

function createGodownIcon(isSelected: boolean = false) {
  const size = isSelected ? 30 : 24;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:#ea580c;
      border:2px solid white;
      border-radius:6px;
      box-shadow:0 3px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
    ">
      <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
        <path d="M6 18h12"/>
        <path d="M6 14h12"/>
        <rect x="10" y="10" width="4" height="4"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createPointIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      border:2px solid white;
      border-radius:50% 50% 50% 0;
      width:28px;height:28px;
      transform:rotate(-45deg);
      box-shadow:0 3px 8px rgba(0,0,0,0.3);
    ">
      <div style="
        transform:rotate(45deg);
        color:white;font-size:10px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        width:100%;height:100%;font-family:Inter,sans-serif;
      ">${label}</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export class LeafletAdapter implements IMapAdapter {
  readonly providerType: MapProviderType = 'leaflet';
  state: MapProviderState = 'local_engine';

  private map: L.Map | null = null;
  private routeLayers: L.Layer[] = [];
  private vehicleLayers: L.Layer[] = [];
  private incidentLayers: L.Layer[] = [];
  private godownLayers: L.Layer[] = [];
  private roadLayers: L.Layer[] = [];
  private waypointLayers: L.Layer[] = [];

  private visibility: MapLayerVisibility = {
    routes: true,
    vehicles: true,
    incidents: true,
    godowns: true,
    roadSegments: true,
  };

  private onSelectEntity?: (entity: SelectedMapEntity | null) => void;

  private containerEl: HTMLElement | null = null;

  async initialize(options: MapInitOptions): Promise<void> {
    this.onSelectEntity = options.onSelectEntity;
    this.containerEl = options.container;

    if (this.map) {
      try {
        this.map.remove();
      } catch {
        // ignore cleanup error
      }
      this.map = null;
    }

    const rawContainer = options.container as unknown as { _leaflet_id?: number | null };
    if (rawContainer && rawContainer._leaflet_id != null) {
      rawContainer._leaflet_id = null;
    }

    this.map = L.map(options.container, {
      center: options.center,
      zoom: options.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // CartoDB Voyager Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
  }

  destroy(): void {
    if (this.map) {
      try {
        this.map.remove();
      } catch {
        // ignore cleanup error
      }
      this.map = null;
    }
    if (this.containerEl) {
      const rawContainer = this.containerEl as unknown as { _leaflet_id?: number | null };
      if (rawContainer && rawContainer._leaflet_id != null) {
        rawContainer._leaflet_id = null;
      }
      this.containerEl = null;
    }
  }

  setCenter(latlng: [number, number], zoom?: number, animate: boolean = true): void {
    if (!this.map) return;
    try {
      if (animate) {
        this.map.flyTo(latlng, zoom ?? this.map.getZoom(), { duration: 1.2 });
      } else {
        this.map.setView(latlng, zoom ?? this.map.getZoom());
      }
    } catch (err) {
      console.warn('Leaflet setCenter failed:', err);
    }
  }

  fitBounds(bounds: [number, number][], padding: number = 40): void {
    if (!this.map || bounds.length === 0) return;
    try {
      const lBounds = L.latLngBounds(bounds.map((b) => L.latLng(b[0], b[1])));
      this.map.fitBounds(lBounds, { padding: [padding, padding] });
    } catch (err) {
      console.warn('Leaflet fitBounds failed:', err);
    }
  }

  renderRoutes(routes: Route[], selectedRouteId?: string): void {
    if (!this.map) return;
    this.clearLayers(this.routeLayers);

    if (!this.visibility.routes) return;

    routes.forEach((route) => {
      const isBlocked = Boolean((route as RouteCandidate).isBlocked);
      const isReactive = route.id.startsWith('reactive-');
      const isSelected = route.id === selectedRouteId;
      const color = isBlocked ? '#dc2626' : isReactive ? '#2563eb' : getRiskColor(route.riskLevel);
      const opacity = isSelected ? 1.0 : selectedRouteId ? 0.45 : 0.85;
      const weight = isSelected || isReactive ? 5.5 : 3.5;

      if (isSelected || isReactive) {
        const halo = L.polyline(route.waypoints, {
          color: '#ffffff',
          weight: weight + 3.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(this.map!);
        this.routeLayers.push(halo);
      }

      const polyline = L.polyline(route.waypoints, {
        color,
        weight,
        opacity,
        dashArray: isBlocked ? '6 6' : route.recommended || isReactive ? undefined : '8 5',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(this.map!);

      polyline.on('click', () => {
        this.onSelectEntity?.({ type: 'route', data: route });
      });

      this.routeLayers.push(polyline);
    });
  }

  renderVehicles(vehicles: Vehicle[], selectedVehicleId?: string): void {
    if (!this.map) return;
    this.clearLayers(this.vehicleLayers);

    if (!this.visibility.vehicles) return;

    vehicles.forEach((v) => {
      const isSelected = v.id === selectedVehicleId;
      const icon = createVehicleIcon(v, isSelected);
      const marker = L.marker(v.location, { icon }).addTo(this.map!);

      marker.on('click', () => {
        this.onSelectEntity?.({ type: 'vehicle', data: v });
      });

      this.vehicleLayers.push(marker);
    });
  }

  renderIncidents(incidents: Incident[]): void {
    if (!this.map) return;
    this.clearLayers(this.incidentLayers);

    if (!this.visibility.incidents) return;

    incidents.forEach((inc) => {
      const icon = createIncidentIcon(inc.severity, false);
      const marker = L.marker(inc.location, { icon }).addTo(this.map!);

      marker.on('click', () => {
        this.onSelectEntity?.({ type: 'incident', data: inc });
      });

      this.incidentLayers.push(marker);
    });
  }

  renderGodowns(godowns: Godown[]): void {
    if (!this.map) return;
    this.clearLayers(this.godownLayers);

    if (!this.visibility.godowns) return;

    godowns.forEach((g) => {
      const icon = createGodownIcon(false);
      const marker = L.marker(g.location, { icon }).addTo(this.map!);

      marker.on('click', () => {
        this.onSelectEntity?.({ type: 'godown', data: g });
      });

      this.godownLayers.push(marker);
    });
  }

  renderRoadSegments(roadSegments: RoadSegment[]): void {
    if (!this.map) return;
    this.clearLayers(this.roadLayers);

    if (!this.visibility.roadSegments) return;

    roadSegments.forEach((seg) => {
      const segCoords = (seg as unknown as { coordinates?: [number, number][] }).coordinates;
      if (!segCoords || segCoords.length === 0) return;

      const color = seg.status === 'blocked' ? '#dc2626' : seg.status === 'caution' ? '#d97706' : '#16a34a';
      const poly = L.polyline(segCoords, {
        color,
        weight: seg.status === 'blocked' ? 4 : 2,
        dashArray: seg.status === 'blocked' ? '4 4' : undefined,
        opacity: 0.7,
      }).addTo(this.map!);

      poly.on('click', () => {
        this.onSelectEntity?.({ type: 'road', data: seg });
      });

      this.roadLayers.push(poly);
    });
  }

  renderWaypoints(
    origin?: { latlng: [number, number]; label: string },
    destination?: { latlng: [number, number]; label: string }
  ): void {
    if (!this.map) return;
    this.clearLayers(this.waypointLayers);

    if (origin) {
      const m = L.marker(origin.latlng, { icon: createPointIcon('#2563eb', 'A') }).addTo(this.map);
      this.waypointLayers.push(m);
    }

    if (destination) {
      const m = L.marker(destination.latlng, { icon: createPointIcon('#dc2626', 'B') }).addTo(this.map);
      this.waypointLayers.push(m);
    }
  }

  setLayerVisibility(visibility: Partial<MapLayerVisibility>): void {
    this.visibility = { ...this.visibility, ...visibility };
  }

  private clearLayers(layers: L.Layer[]): void {
    if (!this.map) return;
    layers.forEach((l) => this.map!.removeLayer(l));
    layers.length = 0;
  }
}
