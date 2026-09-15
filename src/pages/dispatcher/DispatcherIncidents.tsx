import { useEffect } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatDateTime, formatTimeAgo, getIncidentTypeLabel } from '@/utils';
import { MapPin, Clock, User, AlertTriangle } from 'lucide-react';

export function DispatcherIncidents() {
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const syncFromIndexedDB = useNetworkStore((state) => state.syncFromIndexedDB);

  useEffect(() => {
    syncFromIndexedDB();
  }, [syncFromIndexedDB]);

  return (
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Incident Feed</h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time verified and crowd hazard reports across NE corridors</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-3xl space-y-3.5">
          {activeIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100/80 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{inc.id}</span>
                      <StatusBadge syncStatus={inc.syncStatus} />
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      {getIncidentTypeLabel(inc.type)} — <span className="uppercase font-bold text-slate-700">{inc.severity}</span>
                    </p>
                  </div>
                </div>
                <RiskBadge
                  level={
                    inc.severity === 'critical'
                      ? 'blocked'
                      : inc.severity === 'high'
                      ? 'high'
                      : inc.severity === 'moderate'
                      ? 'moderate'
                      : 'low'
                  }
                  size="sm"
                />
              </div>

              <div className="px-5 py-4">
                <p className="text-sm text-slate-800 mb-3.5 leading-relaxed font-medium">{inc.description}</p>

                <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{inc.locationName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{inc.reportedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatDateTime(inc.reportedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">{formatTimeAgo(inc.reportedAt)}</span>
                  </div>
                </div>

                {inc.verifiedBy && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                    Verified by <span className="font-semibold text-slate-700">{inc.verifiedBy}</span> · {inc.verifiedAt ? formatTimeAgo(inc.verifiedAt) : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
