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
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      <div className="px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <Map className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Fleet GIS Tactical Map</h1>
            <p className="text-[11px] text-slate-500 font-medium">Real-time spatial visualization of all 18 active regional transports</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold px-2.5 py-1 rounded-xl bg-slate-100/80 border border-slate-200/60 shadow-2xs">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>{activeVehicles.length} Vehicles</span>
          </div>
          {affectedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
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
