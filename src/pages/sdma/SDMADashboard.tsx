import { useNavigate } from 'react-router-dom';
import { useNetworkStore } from '@/store/networkStore';
import type { RoadStatus } from '@/types';
import { MapContainer } from '@/components/map/MapContainer';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeAgo, getIncidentTypeLabel } from '@/utils';
import {
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Map,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const roadStatusConfig: Record<RoadStatus, { label: string; color: string; bg: string; border: string }> = {
  open: { label: 'Open', color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]' },
  caution: { label: 'Caution', color: 'text-[#d97706]', bg: 'bg-[#fffbeb]', border: 'border-[#fde68a]' },
  high_risk: { label: 'High Risk', color: 'text-[#ea580c]', bg: 'bg-[#fff7ed]', border: 'border-[#fed7aa]' },
  blocked: { label: 'Blocked', color: 'text-[#dc2626]', bg: 'bg-[#fef2f2]', border: 'border-[#fecaca]' },
};

export function SDMADashboard() {
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const roadSegments = useNetworkStore((state) => state.roadSegments);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const verifyIncident = useNetworkStore((state) => state.verifyIncident);

  const navigate = useNavigate();

  const pendingIncidents = activeIncidents.filter((i) => i.syncStatus === 'pending_verification' || i.syncStatus === 'synced');
  const verifiedIncidents = activeIncidents.filter((i) => i.syncStatus === 'verified');
  const blockedRoads = roadSegments.filter((r) => r.status === 'blocked');
  const cautionRoads = roadSegments.filter((r) => r.status === 'caution');

  return (
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      {/* SDMA Authority Header */}
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                State Disaster Management Authority
              </span>
              <span className="text-xs text-slate-400 font-medium">· Regional Infrastructure & Verification Unit</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">
              Regional Accessibility & Hazard Intelligence
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge label="Authority Verification Desk" variant="success" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/sdma/incidents')}
              iconLeft={<FileCheck className="w-3.5 h-3.5" />}
              className="rounded-xl shadow-2xs font-semibold text-xs"
            >
              Full Queue ({pendingIncidents.length})
            </Button>
          </div>
        </div>

        {/* Focused 3-Metric Authority Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Pending Field Reports"
            value={pendingIncidents.length.toString().padStart(2, '0')}
            subtext={pendingIncidents.length > 0 ? 'Awaiting authority triage' : 'Queue fully cleared'}
            riskLevel={pendingIncidents.length > 0 ? 'moderate' : 'low'}
            icon={<FileCheck className="w-4 h-4 text-amber-600" />}
          />
          <MetricCard
            label="Verified Active Hazards"
            value={verifiedIncidents.length.toString().padStart(2, '0')}
            subtext={verifiedIncidents.length > 0 ? 'Enforced across regional routing grid' : 'No active hazards'}
            riskLevel={verifiedIncidents.length > 0 ? 'high' : 'low'}
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          />
          <MetricCard
            label="Corridors Blocked / Caution"
            value={`${blockedRoads.length} / ${cautionRoads.length}`}
            subtext={blockedRoads.length > 0 ? `${blockedRoads[0]?.name || 'Corridor'} blocked` : 'All corridors open'}
            riskLevel={blockedRoads.length > 0 ? 'high' : 'low'}
            icon={<Map className="w-4 h-4 text-slate-600" />}
          />
        </div>
      </div>

      {/* Main Map + Right Intelligence Panel */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Prominent Regional Hazard & Road Map */}
        <div className="flex-1 h-80 lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-200/80">
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

        {/* Right Intelligence & Triage Panel */}
        <div className="w-full lg:w-96 bg-white overflow-y-auto shrink-0 flex flex-col divide-y divide-slate-100">
          {/* Priority Incident Verification Triage */}
          <div className="p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Verification Triage Queue
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                {pendingIncidents.length} Pending
              </span>
            </div>

            <div className="space-y-3 mt-2">
              {pendingIncidents.length > 0 ? (
                pendingIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{inc.id}</span>
                        <p className="text-xs font-bold text-amber-800 mt-0.5">
                          {getIncidentTypeLabel(inc.type)} · <span className="uppercase">{inc.severity}</span>
                        </p>
                      </div>
                      <StatusBadge syncStatus={inc.syncStatus} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs space-y-1 text-amber-900">
                      <p className="font-semibold">📍 {inc.locationName}</p>
                      <p className="text-[11px] opacity-90">{inc.description}</p>
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
                      <span>Reporter: {inc.reportedBy}</span>
                      <span>{formatTimeAgo(inc.reportedAt)}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs"
                        onClick={() => verifyIncident(inc.id, true, 'Ranjit Sharma (SDMA-NE)')}
                        iconLeft={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Verify & Enforce Block
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs rounded-xl border-slate-200 hover:bg-rose-50 hover:text-rose-700 shadow-2xs font-semibold"
                        onClick={() => verifyIncident(inc.id, false, 'SDMA Operations Desk')}
                        iconLeft={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1.5 shadow-2xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-900">Queue Cleared</p>
                  <p className="text-[11px] text-slate-400 font-medium">No pending reports awaiting authority triage.</p>
                </div>
              )}
            </div>
          </div>

          {/* Highway Corridors Status */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Corridor Accessibility Registry
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-[11px] text-blue-600 font-semibold p-0 h-auto"
                onClick={() => navigate('/sdma/roads')}
              >
                All Segments →
              </Button>
            </div>

            <div className="space-y-2">
              {roadSegments.slice(0, 4).map((seg) => {
                const cfg = roadStatusConfig[seg.status] || roadStatusConfig.open;
                return (
                  <div
                    key={seg.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-slate-900 truncate">{seg.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{seg.fromLocation} → {seg.toLocation}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cfg.color} ${cfg.bg} border ${cfg.border} shrink-0 shadow-2xs`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Protocol Lifecycle Note */}
          <div className="p-4 bg-slate-50/60 space-y-2 mt-auto border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Authority Clearance Protocol
            </span>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Verified road closures automatically propagate to dispatcher intervention queues and driver reroute calculations. Reopening a segment restores standard transit pathways.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
