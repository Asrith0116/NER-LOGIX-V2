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
    <div className="h-full flex flex-col bg-[#f8f8f7]">
      <div className="px-6 py-3 bg-white border-b border-[#e4e4e3] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#16a34a]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#1a1a19]">Regional Hazard & Vulnerability GIS</h1>
            <p className="text-[11px] text-[#8a8a87]">State Disaster Management Authority · Highway Network Command</p>
          </div>
        </div>

        {blockedCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fef2f2] border border-[#fecaca] text-xs font-semibold text-[#dc2626]">
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
