import { useNetworkStore } from '@/store/networkStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeAgo } from '@/utils';
import { Package, Clock, MapPin } from 'lucide-react';

const roadStatusConfig = {
  open: { label: 'Open', variant: 'success' as const },
  caution: { label: 'Caution', variant: 'warning' as const },
  high_risk: { label: 'High Risk', variant: 'danger' as const },
  blocked: { label: 'Blocked', variant: 'danger' as const },
};

export function SDMARoads() {
  const roadSegments = useNetworkStore((state) => state.roadSegments);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 bg-white border-b border-[#e4e4e3]">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#8a8a87]" />
          <h1 className="text-base font-semibold text-[#1a1a19]">Road Status Registry</h1>
        </div>
        <p className="text-xs text-[#8a8a87]">Live accessibility status of key corridors and segments</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-3">
          {roadSegments.map((seg) => {
            const cfg = roadStatusConfig[seg.status];
            return (
              <div
                key={seg.id}
                className="bg-white border border-[#e4e4e3] rounded-lg p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a19]">{seg.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#8a8a87]">
                      <MapPin className="w-3 h-3" />
                      <span>{seg.fromLocation} → {seg.toLocation}</span>
                    </div>
                  </div>
                  <StatusBadge label={cfg.label} variant={cfg.variant} />
                </div>
                <div className="flex items-center gap-2 text-xs text-[#8a8a87]">
                  <Clock className="w-3 h-3" />
                  <span>Updated {formatTimeAgo(seg.lastUpdated)}</span>
                  {seg.affectedByIncidentId && (
                    <>
                      <span>·</span>
                      <span>Incident: {seg.affectedByIncidentId}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
