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
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Road Status Registry</h1>
            <p className="text-xs text-slate-500 font-medium">Live accessibility status of key corridors and segments</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-3">
          {roadSegments.map((seg) => {
            const cfg = roadStatusConfig[seg.status];
            return (
              <div
                key={seg.id}
                className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:border-slate-300/80 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{seg.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{seg.fromLocation} → {seg.toLocation}</span>
                    </div>
                  </div>
                  <StatusBadge label={cfg.label} variant={cfg.variant} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated {formatTimeAgo(seg.lastUpdated)}</span>
                  {seg.affectedByIncidentId && (
                    <>
                      <span>·</span>
                      <span className="text-rose-600 font-semibold">Incident: {seg.affectedByIncidentId}</span>
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
