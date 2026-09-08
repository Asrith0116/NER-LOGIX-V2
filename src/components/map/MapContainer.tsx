import type { Route, Incident, Vehicle, Godown, RoadSegment, UserRole } from '@/types';
import { UnifiedMapContainer } from './UnifiedMapContainer';

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
  onSelectRoute?: (routeId: string) => void;
}

export function MapContainer(props: MapContainerProps) {
  return <UnifiedMapContainer {...props} />;
}
