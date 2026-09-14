/**
 * Unified Provider-Agnostic Map Container for NER-LOGIX.
 * Automatically initializes Google Maps JS API when VITE_GOOGLE_MAPS_API_KEY exists,
 * or seamlessly falls back to Leaflet & Carto Voyager raster maps.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';
import type { Route, Incident, Vehicle, Godown, RoadSegment, UserRole } from '@/types';
import type { IMapAdapter, MapLayerVisibility, MapProviderState, SelectedMapEntity } from '@/services/map/types';
import { createMapAdapter } from '@/services/map/MapAdapterFactory';
import { MapInspector } from './MapInspector';
import { Layers, Eye, EyeOff, RotateCcw, AlertTriangle, Truck, Route as RouteIcon, Warehouse } from 'lucide-react';

interface UnifiedMapContainerProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  routes?: Route[];
  selectedRouteId?: string;
  incidents?: Incident[];
  vehicles?: Vehicle[];
  godowns?: Godown[];
  roadSegments?: RoadSegment[];
  originMarker?: { latlng: [number, number]; label: string };
  destinationMarker?: { latlng: [number, number]; label: string };
  userRole?: UserRole;
  onRerouteVehicle?: (vehicleId: string) => void;
  onRequestEmergencyPickup?: (vehicleId: string) => void;
  onVerifyIncident?: (incidentId: string, approved: boolean) => void;
  onSelectRoute?: (routeId: string) => void;
}

export function UnifiedMapContainer({
  className,
  center = [25.5, 93.0],
  zoom = 7,
  routes = [],
  selectedRouteId,
  incidents = [],
  vehicles = [],
  godowns = [],
  roadSegments = [],
  originMarker,
  destinationMarker,
  userRole = 'dispatcher',
  onRerouteVehicle,
  onRequestEmergencyPickup,
  onVerifyIncident,
  onSelectRoute,
}: UnifiedMapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<IMapAdapter | null>(null);

  const [providerState, setProviderState] = useState<MapProviderState>('loading');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);

  const [visibility, setVisibility] = useState<MapLayerVisibility>({
    routes: true,
    vehicles: true,
    incidents: true,
    godowns: true,
    roadSegments: true,
  });

  // Initialize Map Adapter
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    async function initMap() {
      if (!containerRef.current) return;
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
      try {
        const { adapter, providerState: pState } = await createMapAdapter({
          container: containerRef.current,
          center,
          zoom,
          onSelectEntity: (entity) => {
            if (isMounted) {
              setSelectedEntity(entity);
              if (entity?.type === 'route' && entity.data?.id) {
                onSelectRoute?.(entity.data.id);
              }
            }
          },
        });

        if (!isMounted) {
          adapter.destroy();
          return;
        }

        adapterRef.current = adapter;
        setProviderState(pState);
      } catch (err) {
        console.error('Failed to initialize map adapter:', err);
        if (isMounted) setProviderState('unavailable');
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render Overlays when data or layer visibility changes
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    adapter.setLayerVisibility(visibility);
    adapter.renderRoutes(routes, selectedRouteId);
    adapter.renderVehicles(vehicles);
    adapter.renderIncidents(incidents);
    adapter.renderGodowns(godowns);
    adapter.renderRoadSegments(roadSegments);
    adapter.renderWaypoints(originMarker, destinationMarker);

    // Auto-fit map viewport to active route and waypoints
    const boundsPoints: [number, number][] = [];
    if (originMarker?.latlng) boundsPoints.push(originMarker.latlng);
    if (destinationMarker?.latlng) boundsPoints.push(destinationMarker.latlng);

    const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (activeRoute?.waypoints && activeRoute.waypoints.length > 0) {
      activeRoute.waypoints.forEach((wp) => boundsPoints.push(wp));
    }

    if (boundsPoints.length >= 2) {
      adapter.fitBounds(boundsPoints, 45);
    }
  }, [
    routes,
    selectedRouteId,
    incidents,
    vehicles,
    godowns,
    roadSegments,
    originMarker,
    destinationMarker,
    visibility,
  ]);

  const handleRecenter = () => {
    if (adapterRef.current) {
      adapterRef.current.setCenter(center, zoom, true);
    }
  };

  const toggleLayer = (key: keyof MapLayerVisibility) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={cn('relative w-full h-full select-none isolate overflow-hidden', className)}>
      {/* Map Canvas */}
      <div ref={containerRef} className="w-full h-full z-0 bg-[#e5e3df]" />

      {/* Floating Top-Left HUD Bar */}
      <div className="absolute top-3 left-3 z-[900] flex items-center gap-2">
        {/* Layer Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setLayersOpen(!layersOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-lg border border-[#d4d4d2] text-xs font-semibold text-[#1a1a19] shadow-sm hover:bg-white transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Map Layers</span>
          </button>

          {layersOpen && (
            <div className="absolute top-10 left-0 bg-white rounded-xl border border-[#d4d4d2] shadow-xl p-2 w-52 space-y-1 text-xs z-[1000] animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => toggleLayer('routes')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <RouteIcon className="w-3.5 h-3.5 text-[#2563eb]" />
                  Corridor Candidates
                </span>
                {visibility.routes ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
              </button>

              <button
                onClick={() => toggleLayer('vehicles')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#2563eb]" />
                  Active Transports
                </span>
                {visibility.vehicles ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
              </button>

              <button
                onClick={() => toggleLayer('incidents')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
                  Hazard Disruption Pins
                </span>
                {visibility.incidents ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
              </button>

              {godowns.length > 0 && (
                <button
                  onClick={() => toggleLayer('godowns')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Warehouse className="w-3.5 h-3.5 text-[#ea580c]" />
                    Emergency Relief Godowns
                  </span>
                  {visibility.godowns ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="p-1.5 bg-white/95 backdrop-blur-md rounded-lg border border-[#d4d4d2] text-[#5a5a57] hover:text-[#1a1a19] shadow-sm hover:bg-white transition-colors cursor-pointer"
          title="Reset Camera to Regional Corridor Overview"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Top-Right Provider Indicator */}
      <div className="absolute top-3 right-3 z-[900]">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-lg border text-[11px] font-semibold shadow-sm transition-all',
            providerState === 'google_live'
              ? 'border-[#bbf7d0] text-[#166534]'
              : 'border-[#e4e4e3] text-[#52525b]'
          )}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              providerState === 'google_live'
                ? 'bg-[#16a34a] animate-pulse'
                : providerState === 'loading'
                ? 'bg-[#d97706] animate-ping'
                : 'bg-[#71717a]'
            )}
          />
          <span>
            {providerState === 'google_live'
              ? 'Google Maps Vector (Live)'
              : providerState === 'loading'
              ? 'Initializing Engine...'
              : 'Map Engine: Local Fallback (Carto)'}
          </span>
        </div>
      </div>

      {/* Interactive Context Inspector Drawer */}
      <MapInspector
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onRerouteVehicle={onRerouteVehicle}
        onRequestEmergencyPickup={onRequestEmergencyPickup}
        onVerifyIncident={onVerifyIncident}
        userRole={userRole}
      />
    </div>
  );
}
