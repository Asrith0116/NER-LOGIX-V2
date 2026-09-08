/**
 * Google Maps Vector API Adapter for NER-LOGIX.
 * Provides integration readiness for Google Maps Platform JS API.
 * Safely falls back if VITE_GOOGLE_MAPS_API_KEY is missing or script fails to load.
 */

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

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
  }
}

declare const google: any;

function loadGoogleMapsScript(apiKey: string, timeoutMs: number = 2500): Promise<void> {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Google Maps script loading timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Failed to load Google Maps JS script'));
    };

    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}

export class GoogleMapsAdapter implements IMapAdapter {
  readonly providerType: MapProviderType = 'google';
  state: MapProviderState = 'unavailable';

  private map: any = null;
  private routePolylines: any[] = [];
  private vehicleMarkers: any[] = [];
  private incidentMarkers: any[] = [];
  private godownMarkers: any[] = [];
  private roadPolylines: any[] = [];
  private waypointMarkers: any[] = [];

  private visibility: MapLayerVisibility = {
    routes: true,
    vehicles: true,
    incidents: true,
    godowns: true,
    roadSegments: true,
  };

  private onSelectEntity?: (entity: SelectedMapEntity | null) => void;

  async initialize(options: MapInitOptions): Promise<void> {
    this.onSelectEntity = options.onSelectEntity;
    const apiKey = options.apiKey || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string);

    if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_') || apiKey.includes('PLACEHOLDER')) {
      this.state = 'unavailable';
      throw new Error('No valid VITE_GOOGLE_MAPS_API_KEY configured');
    }

    this.state = 'loading';

    try {
      await loadGoogleMapsScript(apiKey);
      if (!window.google?.maps) {
        throw new Error('Google Maps JS global object not available after load');
      }

      const mapOptions = {
        center: { lat: options.center[0], lng: options.center[1] },
        zoom: options.zoom,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      };

      this.map = new window.google.maps.Map(options.container, mapOptions);
      this.state = 'google_live';
    } catch (err) {
      this.state = 'unavailable';
      throw err;
    }
  }

  destroy(): void {
    this.clearAll();
    this.map = null;
    this.state = 'unavailable';
  }

  setCenter(latlng: [number, number], zoom?: number, animate: boolean = true): void {
    if (!this.map) return;
    const target = { lat: latlng[0], lng: latlng[1] };
    if (animate) {
      this.map.panTo(target);
      if (zoom) this.map.setZoom(zoom);
    } else {
      this.map.setCenter(target);
      if (zoom) this.map.setZoom(zoom);
    }
  }

  fitBounds(bounds: [number, number][], padding: number = 40): void {
    if (!this.map || bounds.length === 0 || !window.google?.maps) return;
    const gBounds = new window.google.maps.LatLngBounds();
    bounds.forEach((b) => gBounds.extend({ lat: b[0], lng: b[1] }));
    this.map.fitBounds(gBounds, padding);
  }

  renderRoutes(routes: Route[], selectedRouteId?: string): void {
    if (!this.map || !window.google?.maps) return;
    this.clearPolylines(this.routePolylines);

    if (!this.visibility.routes) return;

    routes.forEach((route) => {
      const isBlocked = Boolean((route as RouteCandidate).isBlocked);
      const isReactive = route.id.startsWith('reactive-');
      const isSelected = route.id === selectedRouteId;
      const color = isBlocked ? '#dc2626' : isReactive ? '#2563eb' : getRiskColor(route.riskLevel);
      const strokeOpacity = isSelected ? 1.0 : selectedRouteId ? 0.45 : 0.85;
      const strokeWeight = isSelected || isReactive ? 6 : 4;

      const path = route.waypoints.map((wp) => ({ lat: wp[0], lng: wp[1] }));

      const polyline = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity,
        strokeWeight,
        map: this.map,
      });

      google.maps.event.addListener(polyline, 'click', () => {
        this.onSelectEntity?.({ type: 'route', data: route });
      });

      this.routePolylines.push(polyline);
    });
  }

  renderVehicles(vehicles: Vehicle[], _selectedVehicleId?: string): void {
    if (!this.map || !window.google?.maps) return;
    this.clearMarkers(this.vehicleMarkers);

    if (!this.visibility.vehicles) return;

    vehicles.forEach((v) => {
      const shortId = v.id.split('-').pop() || v.id;

      const marker = new window.google.maps.Marker({
        position: { lat: v.location[0], lng: v.location[1] },
        map: this.map,
        title: `${v.driverName} (${shortId})`,
      });

      marker.addListener('click', () => {
        this.onSelectEntity?.({ type: 'vehicle', data: v });
      });

      this.vehicleMarkers.push(marker);
    });
  }

  renderIncidents(incidents: Incident[]): void {
    if (!this.map || !window.google?.maps) return;
    this.clearMarkers(this.incidentMarkers);

    if (!this.visibility.incidents) return;

    incidents.forEach((inc) => {
      const marker = new window.google.maps.Marker({
        position: { lat: inc.location[0], lng: inc.location[1] },
        map: this.map,
        title: `Hazard: ${inc.locationName}`,
      });

      marker.addListener('click', () => {
        this.onSelectEntity?.({ type: 'incident', data: inc });
      });

      this.incidentMarkers.push(marker);
    });
  }

  renderGodowns(godowns: Godown[]): void {
    if (!this.map || !window.google?.maps) return;
    this.clearMarkers(this.godownMarkers);

    if (!this.visibility.godowns) return;

    godowns.forEach((g) => {
      const marker = new window.google.maps.Marker({
        position: { lat: g.location[0], lng: g.location[1] },
        map: this.map,
        title: g.name,
      });

      marker.addListener('click', () => {
        this.onSelectEntity?.({ type: 'godown', data: g });
      });

      this.godownMarkers.push(marker);
    });
  }

  renderRoadSegments(roadSegments: RoadSegment[]): void {
    if (!this.map || !window.google?.maps) return;
    this.clearPolylines(this.roadPolylines);

    if (!this.visibility.roadSegments) return;

    roadSegments.forEach((seg) => {
      const segCoords = (seg as unknown as { coordinates?: [number, number][] }).coordinates;
      if (!segCoords || segCoords.length === 0) return;

      const color = seg.status === 'blocked' ? '#dc2626' : seg.status === 'caution' ? '#d97706' : '#16a34a';
      const path = segCoords.map((c) => ({ lat: c[0], lng: c[1] }));

      const poly = new window.google.maps.Polyline({
        path,
        strokeColor: color,
        strokeWeight: seg.status === 'blocked' ? 4 : 2,
        strokeOpacity: 0.8,
        map: this.map,
      });

      google.maps.event.addListener(poly, 'click', () => {
        this.onSelectEntity?.({ type: 'road', data: seg });
      });

      this.roadPolylines.push(poly);
    });
  }

  renderWaypoints(
    origin?: { latlng: [number, number]; label: string },
    destination?: { latlng: [number, number]; label: string }
  ): void {
    if (!this.map || !window.google?.maps) return;
    this.clearMarkers(this.waypointMarkers);

    if (origin) {
      const m = new window.google.maps.Marker({
        position: { lat: origin.latlng[0], lng: origin.latlng[1] },
        map: this.map,
        label: origin.label || 'A',
      });
      this.waypointMarkers.push(m);
    }

    if (destination) {
      const m = new window.google.maps.Marker({
        position: { lat: destination.latlng[0], lng: destination.latlng[1] },
        map: this.map,
        label: destination.label || 'B',
      });
      this.waypointMarkers.push(m);
    }
  }

  setLayerVisibility(visibility: Partial<MapLayerVisibility>): void {
    this.visibility = { ...this.visibility, ...visibility };
  }

  private clearMarkers(markers: any[]): void {
    markers.forEach((m) => m.setMap(null));
    markers.length = 0;
  }

  private clearPolylines(polylines: any[]): void {
    polylines.forEach((p) => p.setMap(null));
    polylines.length = 0;
  }

  private clearAll(): void {
    this.clearMarkers(this.vehicleMarkers);
    this.clearMarkers(this.incidentMarkers);
    this.clearMarkers(this.godownMarkers);
    this.clearMarkers(this.waypointMarkers);
    this.clearPolylines(this.routePolylines);
    this.clearPolylines(this.roadPolylines);
  }
}
