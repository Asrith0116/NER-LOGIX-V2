import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { cn, getRiskColor } from '@/utils';
import type { Route, Incident, Vehicle, Godown, RoadSegment, UserRole } from '@/types';
import { MapInspector, type SelectedMapEntity } from './MapInspector';
import { Layers, Eye, EyeOff, RotateCcw, AlertTriangle, Truck, Route as RouteIcon, Warehouse } from 'lucide-react';

// Fix Leaflet default icon path issue with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapContainerProps {
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
    popupAnchor: [0, -size / 2],
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
    popupAnchor: [0, -size / 2],
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
    popupAnchor: [0, -size / 2],
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
    popupAnchor: [0, -30],
  });
}

export function MapContainer({
  className,
  center = [25.5, 93.0],
  zoom = 7,
  routes = [],
  selectedRouteId,
  incidents = [],
  vehicles = [],
  godowns = [],
  roadSegments: _roadSegments = [],
  originMarker,
  destinationMarker,
  userRole = 'dispatcher',
  onRerouteVehicle,
  onRequestEmergencyPickup,
  onVerifyIncident,
}: MapContainerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.Layer[]>([]);

  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showGodowns, setShowGodowns] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;

    const map = L.map(divRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // High quality CartoDB Positron / OSM tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-draw overlays when data or visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old layers
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    // 1. Draw Routes
    if (showRoutes) {
      routes.forEach((route) => {
        const isReactive = route.id.startsWith('reactive-');
        const isSelected = route.id === selectedRouteId || (selectedEntity?.type === 'route' && selectedEntity.data.id === route.id);
        const color = isReactive ? '#2563eb' : getRiskColor(route.riskLevel);
        const opacity = isSelected ? 1 : selectedRouteId ? 0.4 : 0.8;
        const weight = isReactive || isSelected ? 5 : 3.5;

        // Background halo for reactive / selected route
        if (isReactive || isSelected) {
          const halo = L.polyline(route.waypoints, {
            color: '#ffffff',
            weight: weight + 3,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          layersRef.current.push(halo);
        }

        const line = L.polyline(route.waypoints, {
          color,
          weight,
          opacity,
          dashArray: isReactive ? undefined : route.recommended ? undefined : '8 5',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        line.on('click', () => {
          setSelectedEntity({ type: 'route', data: route });
        });

        layersRef.current.push(line);
      });
    }

    // 2. Draw Incidents
    if (showIncidents) {
      incidents.forEach((inc) => {
        const isSelected = selectedEntity?.type === 'incident' && selectedEntity.data.id === inc.id;
        const icon = createIncidentIcon(inc.severity, isSelected);
        const marker = L.marker(inc.location, { icon }).addTo(map);

        marker.on('click', () => {
          setSelectedEntity({ type: 'incident', data: inc });
        });

        layersRef.current.push(marker);
      });
    }

    // 3. Draw Vehicles
    if (showVehicles) {
      vehicles.forEach((v) => {
        const isSelected = selectedEntity?.type === 'vehicle' && selectedEntity.data.id === v.id;
        const icon = createVehicleIcon(v, isSelected);
        const marker = L.marker(v.location, { icon }).addTo(map);

        marker.on('click', () => {
          setSelectedEntity({ type: 'vehicle', data: v });
        });

        layersRef.current.push(marker);
      });
    }

    // 4. Draw Godowns
    if (showGodowns && godowns.length > 0) {
      godowns.forEach((g) => {
        const isSelected = selectedEntity?.type === 'godown' && selectedEntity.data.id === g.id;
        const icon = createGodownIcon(isSelected);
        const marker = L.marker(g.location, { icon }).addTo(map);

        marker.on('click', () => {
          setSelectedEntity({ type: 'godown', data: g });
        });

        layersRef.current.push(marker);
      });
    }

    // 5. Origin / destination markers
    if (originMarker) {
      const m = L.marker(originMarker.latlng, {
        icon: createPointIcon('#2563eb', 'A'),
      }).addTo(map);
      layersRef.current.push(m);
    }

    if (destinationMarker) {
      const m = L.marker(destinationMarker.latlng, {
        icon: createPointIcon('#dc2626', 'B'),
      }).addTo(map);
      layersRef.current.push(m);
    }
  }, [
    routes,
    selectedRouteId,
    incidents,
    vehicles,
    godowns,
    originMarker,
    destinationMarker,
    showRoutes,
    showVehicles,
    showIncidents,
    showGodowns,
    selectedEntity,
  ]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(center, zoom, { duration: 1.2 });
    }
  };

  return (
    <div className={cn('relative w-full h-full select-none isolate', className)}>
      <div ref={divRef} className="w-full h-full z-0" />

      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 z-[900] flex items-center gap-2">
        {/* Layer Toggle Button */}
        <div className="relative">
          <button
            onClick={() => setLayersOpen(!layersOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg border border-[#d4d4d2] text-xs font-semibold text-[#1a1a19] shadow-sm hover:bg-white transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Layers</span>
          </button>

          {layersOpen && (
            <div className="absolute top-10 left-0 bg-white rounded-xl border border-[#d4d4d2] shadow-lg p-2 w-48 space-y-1 text-xs z-[1000]">
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19]"
              >
                <span className="flex items-center gap-2">
                  <RouteIcon className="w-3.5 h-3.5 text-[#2563eb]" />
                  Corridor Routes
                </span>
                {showRoutes ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
              </button>

              <button
                onClick={() => setShowVehicles(!showVehicles)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19]"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#2563eb]" />
                  Active Fleet
                </span>
                {showVehicles ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
              </button>

              <button
                onClick={() => setShowIncidents(!showIncidents)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19]"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
                  Road Hazards
                </span>
                {showIncidents ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
              </button>

              {godowns.length > 0 && (
                <button
                  onClick={() => setShowGodowns(!showGodowns)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f3] text-[#1a1a19]"
                >
                  <span className="flex items-center gap-2">
                    <Warehouse className="w-3.5 h-3.5 text-[#ea580c]" />
                    Relief Godowns
                  </span>
                  {showGodowns ? <Eye className="w-3.5 h-3.5 text-[#16a34a]" /> : <EyeOff className="w-3.5 h-3.5 text-[#8a8a87]" />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="p-1.5 bg-white/95 backdrop-blur-sm rounded-lg border border-[#d4d4d2] text-[#5a5a57] hover:text-[#1a1a19] shadow-sm hover:bg-white transition-colors"
          title="Reset to Regional Overview"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Weather Radar / Terrain placeholder pill architecture */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-[#d4d4d2] text-[11px] text-[#5a5a57] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
          <span>Regional Terrain Map (Carto Voyager)</span>
        </div>
      </div>

      {/* Interactive Context Inspector Sheet */}
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
