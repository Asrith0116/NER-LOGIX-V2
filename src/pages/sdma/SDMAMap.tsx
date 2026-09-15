import { MapContainer } from '@/components/map/MapContainer';
import { useNetworkStore } from '@/store/networkStore';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export function SDMAMap() {
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const roadSegments = useNetworkStore((state) => state.roadSegments);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const verifyIncident = useNetworkStore((state) => state.verifyIncident);

  const blockedCount = roadSegments.filter((s) => s.status === 'blocked').length;

  return (
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      <div className="px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Regional Hazard & Vulnerability GIS</h1>
            <p className="text-xs text-slate-500 font-medium">State Disaster Management Authority · Highway Network Command</p>
          </div>
        </div>

        {blockedCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{blockedCount} Critical Corridor Cut</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 relative">
        <MapContainer
          center={[25.5, 93.0]}
          zoom={7}
          incidents={activeIncidents}
          roadSegments={roadSegments}
          vehicles={activeVehicles}
          userRole="sdma"
          onVerifyIncident={verifyIncident}
        />
      </div>
    </div>
  );
}
