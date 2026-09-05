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
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 bg-white border-b border-[#e4e4e3]">
        <h1 className="text-base font-semibold text-[#1a1a19]">Incident Feed</h1>
        <p className="text-xs text-[#8a8a87]">Real-time reports from field operators across NE Region</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl space-y-3">
          {activeIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white border border-[#e4e4e3] rounded-lg shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]"
            >
              <div className="px-4 py-3 border-b border-[#e4e4e3] flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1a1a19]">{inc.id}</span>
                      <StatusBadge syncStatus={inc.syncStatus} />
                    </div>
                    <p className="text-xs text-[#5a5a57]">
                      {getIncidentTypeLabel(inc.type)} — {inc.severity.toUpperCase()}
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

              <div className="px-4 py-3">
                <p className="text-sm text-[#1a1a19] mb-3 leading-relaxed">{inc.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs text-[#8a8a87]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{inc.locationName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span className="truncate">{inc.reportedBy}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(inc.reportedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">{formatTimeAgo(inc.reportedAt)}</span>
                  </div>
                </div>

                {inc.verifiedBy && (
                  <div className="mt-2 pt-2 border-t border-[#f4f4f3] text-[11px] text-[#8a8a87]">
                    Verified by {inc.verifiedBy} · {inc.verifiedAt ? formatTimeAgo(inc.verifiedAt) : ''}
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
