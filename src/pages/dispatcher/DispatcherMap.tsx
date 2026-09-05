import { MapContainer } from '@/components/map/MapContainer';
import { DEMO_ROUTES } from '@/data/demo';
import { useNetworkStore, getReactiveDisplayRoute } from '@/store/networkStore';
import { Map, Truck, AlertTriangle } from 'lucide-react';

export function DispatcherMap() {
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const godowns = useNetworkStore((state) => state.godowns);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);

  const affectedCount = activeVehicles.filter(
    (v) => Boolean(v.affectedByDisruptionId) && v.rerouteStatus !== 'active' && v.status !== 'emergency_pickup'
  ).length;

  const reactiveRoutes = activeVehicles
    .map(getReactiveDisplayRoute)
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="h-full flex flex-col bg-[#f8f8f7]">
      <div className="px-6 py-3 bg-white border-b border-[#e4e4e3] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center text-[#2563eb]">
            <Map className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#1a1a19]">Fleet GIS Tactical Map</h1>
            <p className="text-[11px] text-[#8a8a87]">Real-time spatial visualization of all 18 active regional transports</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#5a5a57]">
            <Truck className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>{activeVehicles.length} Vehicles</span>
          </div>
          {affectedCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fef2f2] border border-[#fecaca] text-xs font-semibold text-[#dc2626]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{affectedCount} Disrupted</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <MapContainer
          center={[25.5, 93.0]}
          zoom={7}
          routes={[...Object.values(DEMO_ROUTES), ...reactiveRoutes]}
          selectedRouteId={reactiveRoutes[0]?.id}
          incidents={activeIncidents}
          vehicles={activeVehicles}
          godowns={godowns}
          userRole="dispatcher"
          onRerouteVehicle={rerouteVehicle}
          onRequestEmergencyPickup={requestEmergencyPickup}
        />
      </div>
    </div>
  );
}
