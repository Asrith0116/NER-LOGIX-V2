import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_INCIDENTS } from '@/data/demo';
import { useNetworkStore } from '@/store/networkStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Button } from '@/components/ui/Button';
import { Notification } from '@/components/ui/Notification';
import { formatDateTime, formatTimeAgo, getIncidentTypeLabel } from '@/utils';
import { cn } from '@/utils';
import {
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  FileCheck,
  Camera,
  ChevronRight,
  ArrowRight,
  Mic,
  ShieldAlert,
} from 'lucide-react';

export function SDMAIncidents() {
  const incidents = useNetworkStore((state) => state.activeIncidents);
  const roadSegments = useNetworkStore((state) => state.roadSegments);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const verifyIncident = useNetworkStore((state) => state.verifyIncident);
  const syncFromIndexedDB = useNetworkStore((state) => state.syncFromIndexedDB);

  const [selectedId, setSelectedId] = useState<string | null>(DEMO_INCIDENTS[0]?.id || null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    syncFromIndexedDB();
  }, [syncFromIndexedDB]);

  const selected = incidents.find((i) => i.id === selectedId) || incidents[0] || null;

  const pendingIncidents = incidents.filter(
    (i) => i.syncStatus === 'pending_verification' || i.syncStatus === 'synced',
  );
  const verifiedIncidents = incidents.filter((i) => i.syncStatus === 'verified' || i.syncStatus === 'rejected');

  const relatedSegment = roadSegments.find(
    (s) => s.id === 'seg-nh2-02' || (selected && s.affectedByIncidentId === selected.id)
  );

  const handleVerify = (id: string, approved: boolean) => {
    setVerifyingId(id);
    setTimeout(async () => {
      await verifyIncident(id, approved, 'Ranjit Sharma (SDMA-NE Command)');
      setNotification({
        type: approved ? 'success' : 'error',
        msg: approved
          ? `Incident ${id} officially verified — road status updated to BLOCKED on shared network.`
          : `Incident ${id} rejected as false positive.`,
      });
      setVerifyingId(null);
      setTimeout(() => setNotification(null), 3500);
    }, 900);
  };

  return (
    <div className="h-full flex min-h-0 bg-[#f8f8f7]">
      {/* Incident list */}
      <div className="w-80 border-r border-[#e4e4e3] bg-[#fafaf9] flex flex-col shrink-0">
        <div className="px-4 py-3.5 bg-white border-b border-[#e4e4e3]">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#2563eb]" />
            <h1 className="text-sm font-bold text-[#1a1a19]">Verification Triage Queue</h1>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-[#fffbeb] border border-[#fde68a] text-[#d97706] text-[10px] font-bold">
              {pendingIncidents.length} Awaiting Verification
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-[10px] font-bold">
              {verifiedIncidents.length} Resolved
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Pending section */}
          {pendingIncidents.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">
                Field Reports Awaiting Review
              </p>
              {pendingIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-2.5 border-b border-[#f0f0ef] text-left transition-colors cursor-pointer',
                    selected?.id === inc.id
                      ? 'bg-[#eff6ff] border-l-3 border-l-[#2563eb]'
                      : 'hover:bg-white',
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-[#fffbeb] flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#d97706]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1a1a19]">{inc.id}</span>
                      <ChevronRight className="w-3 h-3 text-[#8a8a87]" />
                    </div>
                    <p className="text-[11px] font-semibold text-[#5a5a57]">{getIncidentTypeLabel(inc.type)}</p>
                    <p className="text-[10px] text-[#8a8a87] truncate">{inc.locationName}</p>
                    <p className="text-[10px] text-[#8a8a87] mt-0.5">{formatTimeAgo(inc.reportedAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Resolved section */}
          {verifiedIncidents.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold mt-2">
                Processed Authority Records
              </p>
              {verifiedIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-2.5 border-b border-[#f0f0ef] text-left transition-colors cursor-pointer',
                    selected?.id === inc.id
                      ? 'bg-[#eff6ff] border-l-3 border-l-[#2563eb]'
                      : 'hover:bg-white',
                  )}
                >
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    inc.syncStatus === 'verified' ? 'bg-[#f0fdf4]' : 'bg-[#fef2f2]'
                  )}>
                    {inc.syncStatus === 'verified'
                      ? <CheckCircle className="w-3.5 h-3.5 text-[#16a34a]" />
                      : <XCircle className="w-3.5 h-3.5 text-[#dc2626]" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-[#1a1a19]">{inc.id}</span>
                    <p className="text-[11px] text-[#5a5a57]">{getIncidentTypeLabel(inc.type)}</p>
                    <StatusBadge syncStatus={inc.syncStatus} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto bg-white">
        {notification && (
          <div className="px-6 pt-4">
            <Notification
              type={notification.type}
              title={notification.msg}
              visible
            />
          </div>
        )}

        {selected ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="px-6 py-5 max-w-4xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#e4e4e3]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-[#1a1a19]">{selected.id}</h2>
                    <StatusBadge syncStatus={selected.syncStatus} />
                    <span className="text-xs text-[#8a8a87]">· Field Observation</span>
                  </div>
                  <p className="text-sm font-semibold text-[#5a5a57]">
                    {getIncidentTypeLabel(selected.type)} — Severity: {selected.severity.toUpperCase()}
                  </p>
                </div>
                <RiskBadge
                  level={
                    selected.severity === 'critical' ? 'blocked' :
                    selected.severity === 'high' ? 'high' :
                    selected.severity === 'moderate' ? 'moderate' : 'low'
                  }
                />
              </div>

              {/* Verification Lifecycle Indicator */}
              <div className="mb-5 p-3 rounded-xl bg-[#fafaf9] border border-[#e4e4e3]">
                <p className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider mb-2">
                  SDMA Incident Lifecycle State
                </p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#16a34a] font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Reported by Driver</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-[#8a8a87]" />
                  <div className={cn('flex items-center gap-1.5 font-semibold', selected.syncStatus === 'verified' ? 'text-[#16a34a]' : 'text-[#d97706]')}>
                    {selected.syncStatus === 'verified' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    <span>Official SDMA Verification</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-[#8a8a87]" />
                  <div className={cn('flex items-center gap-1.5 font-semibold', selected.syncStatus === 'verified' ? 'text-[#dc2626]' : 'text-[#8a8a87]')}>
                    <span>Active Road Disruption Enforced</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-[#8a8a87]" />
                  <div className="flex items-center gap-1.5 text-[#8a8a87]">
                    <span>Highway Reopened</span>
                  </div>
                </div>
              </div>

              {/* Photo & Audio Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Photo evidence */}
                <div className="bg-[#f8f8f7] border border-[#e4e4e3] rounded-xl h-44 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="w-7 h-7 text-[#8a8a87] mb-1.5" />
                  <p className="text-xs font-semibold text-[#1a1a19]">Field Photo Evidence Attached</p>
                  <p className="text-[11px] text-[#8a8a87] mt-0.5">
                    Debris blocking entire carriageway · Slope failure approx 45m
                  </p>
                </div>

                {/* Audio memo evidence */}
                <div className="bg-[#f8f8f7] border border-[#e4e4e3] rounded-xl h-44 flex flex-col items-center justify-center p-4 text-center">
                  <Mic className="w-7 h-7 text-[#2563eb] mb-1.5" />
                  <p className="text-xs font-semibold text-[#1a1a19]">Field Audio Note (0:18s)</p>
                  <p className="text-[11px] text-[#8a8a87] mt-0.5">
                    "Heavy mudslide right after checkpoint, no light vehicles passing either."
                  </p>
                  <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff6ff] text-[#2563eb]">
                    Verified Audio Evidence
                  </span>
                </div>
              </div>

              {/* Incident Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-[#f8f8f7] rounded-lg p-3 border border-[#e4e4e3]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                    <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">Location</span>
                  </div>
                  <p className="text-xs font-bold text-[#1a1a19]">{selected.locationName}</p>
                  <p className="text-[10px] text-[#8a8a87] mt-0.5">
                    {selected.location[0].toFixed(4)}°N, {selected.location[1].toFixed(4)}°E
                  </p>
                </div>
                <div className="bg-[#f8f8f7] rounded-lg p-3 border border-[#e4e4e3]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#d97706]" />
                    <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">Reported Time</span>
                  </div>
                  <p className="text-xs font-bold text-[#1a1a19]">{formatDateTime(selected.reportedAt)}</p>
                  <p className="text-[10px] text-[#8a8a87] mt-0.5">{formatTimeAgo(selected.reportedAt)}</p>
                </div>
                <div className="bg-[#f8f8f7] rounded-lg p-3 border border-[#e4e4e3]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">Source Observer</span>
                  </div>
                  <p className="text-xs font-bold text-[#1a1a19]">{selected.reportedBy}</p>
                  <p className="text-[10px] text-[#8a8a87] mt-0.5">Field Transport Driver</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-5">
                <p className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold mb-2">Driver Field Description</p>
                <div className="bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg p-3.5 text-xs text-[#1a1a19] leading-relaxed">
                  {selected.description}
                </div>
              </div>

              {/* Corridor Impact Preview */}
              <div className="mb-5 p-3.5 rounded-xl bg-[#fff8f8] border border-[#fca5a5]">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#dc2626]" />
                  <p className="text-xs font-bold text-[#991b1b] uppercase tracking-wider">
                    Downstream Corridor Impact Analysis
                  </p>
                </div>
                <p className="text-xs text-[#7f1d1d] leading-snug">
                  Verifying this incident will mark <strong>{relatedSegment?.name || 'NH-2 Mao Gate'}</strong> as <strong>BLOCKED</strong>.
                  This immediately propagates a disruption event to active transport vehicles (monitoring {activeVehicles.length} vehicles across regional routes).
                </p>
              </div>

              {/* Verification status if verified */}
              {selected.verifiedBy && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle className="w-4 h-4 text-[#16a34a]" />
                    <span className="text-xs font-bold text-[#166534]">Officially Verified by Highway Authority</span>
                  </div>
                  <p className="text-xs text-[#16a34a]">
                    Verified by {selected.verifiedBy} · {selected.verifiedAt ? formatTimeAgo(selected.verifiedAt) : ''}.
                    Shared road network updated.
                  </p>
                </div>
              )}

              {/* Official Action Controls */}
              {(selected.syncStatus === 'pending_verification' || selected.syncStatus === 'synced') && (
                <div className="border-t border-[#e4e4e3] pt-4">
                  <p className="text-xs text-[#5a5a57] mb-3">
                    As SDMA Authority, your confirmation updates the authoritative state of the highway network:
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      className="bg-[#16a34a] hover:bg-[#15803d] text-white text-xs"
                      iconLeft={<CheckCircle className="w-4 h-4" />}
                      loading={verifyingId === selected.id}
                      onClick={() => handleVerify(selected.id, true)}
                    >
                      Confirm Hazard & Close Corridor
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs text-[#dc2626] border-[#fca5a5] hover:bg-[#fef2f2]"
                      iconLeft={<XCircle className="w-4 h-4" />}
                      onClick={() => handleVerify(selected.id, false)}
                    >
                      Reject (False Report)
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[#8a8a87]">Select a field incident to triage</p>
          </div>
        )}
      </div>
    </div>
  );
}
