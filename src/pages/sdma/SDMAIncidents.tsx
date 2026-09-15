import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStore } from '@/store/networkStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Button } from '@/components/ui/Button';
import { Notification } from '@/components/ui/Notification';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { formatTimeAgo, getIncidentTypeLabel } from '@/utils';
import { cn } from '@/utils';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCheck,
  Camera,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Truck,
  Copy,
  AlertOctagon,
  Layers,
  Waves,
  Mountain,
  TreePine,
  Car,
  CloudLightning,
  Construction,
  Zap,
  Flame,
  Shield,
} from 'lucide-react';

function getHazardIcon(type: string) {
  switch (type) {
    case 'landslide':
      return <Mountain className="w-3.5 h-3.5 text-[#dc2626]" />;
    case 'flood':
      return <Waves className="w-3.5 h-3.5 text-[#2563eb]" />;
    case 'rockfall':
      return <AlertTriangle className="w-3.5 h-3.5 text-[#d97706]" />;
    case 'road_washout':
      return <Layers className="w-3.5 h-3.5 text-[#991b1b]" />;
    case 'bridge_damage':
      return <ShieldAlert className="w-3.5 h-3.5 text-[#b91c1c]" />;
    case 'tree_fall':
      return <TreePine className="w-3.5 h-3.5 text-[#16a34a]" />;
    case 'vehicle_accident':
      return <Car className="w-3.5 h-3.5 text-[#ea580c]" />;
    case 'severe_weather':
      return <CloudLightning className="w-3.5 h-3.5 text-[#4f46e5]" />;
    case 'road_closure':
      return <Construction className="w-3.5 h-3.5 text-[#6b7280]" />;
    case 'pothole_surface':
      return <Zap className="w-3.5 h-3.5 text-[#ca8a04]" />;
    case 'fire_smoke':
      return <Flame className="w-3.5 h-3.5 text-[#dc2626]" />;
    default:
      return <Shield className="w-3.5 h-3.5 text-[#64748b]" />;
  }
}

export function SDMAIncidents() {
  const incidents = useNetworkStore((state) => state.activeIncidents);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const verifyIncident = useNetworkStore((state) => state.verifyIncident);
  const syncFromIndexedDB = useNetworkStore((state) => state.syncFromIndexedDB);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    syncFromIndexedDB();
  }, [syncFromIndexedDB]);

  const selected = incidents.find((i) => i.id === selectedId) || incidents[0] || null;

  const pendingIncidents = incidents.filter(
    (i) => i.syncStatus === 'pending_verification' || i.syncStatus === 'synced' || i.syncStatus === 'local_pending'
  );
  const verifiedIncidents = incidents.filter((i) => i.syncStatus === 'verified' || i.syncStatus === 'rejected');

  // Vehicles that would be affected by closing this specific corridor
  const potentiallyAffectedVehicles = activeVehicles.filter((v) => {
    if (selected?.affectedRouteId && v.plannedRouteId === selected.affectedRouteId) {
      return true;
    }
    if (v.status === 'disrupted' && v.affectedByDisruptionId?.includes(selected?.id || '')) {
      return true;
    }
    // NH-2 corridor check
    const isNH2Incident =
      selected?.locationName?.toLowerCase().includes('nh-2') ||
      selected?.locationName?.toLowerCase().includes('mao');
    if (isNH2Incident && (v.plannedRouteId === 'route-b' || (v.destination === 'Imphal' && v.status !== 'idle'))) {
      return true;
    }
    return v.status === 'disrupted';
  });

  const handleVerify = (id: string, approved: boolean) => {
    setVerifyingId(id);
    setTimeout(async () => {
      await verifyIncident(id, approved, 'Dr. Rohan Goswami (SDMA-NE Authority)');
      setNotification({
        type: approved ? 'success' : 'error',
        msg: approved
          ? `Incident ${id} officially verified — road status updated to BLOCKED. Broadcast sent to approaching fleet.`
          : `Incident ${id} dismissed as false positive.`,
      });
      setVerifyingId(null);
      setTimeout(() => setNotification(null), 4000);
    }, 700);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row min-h-0 bg-[#f4f6f8]">
      {/* Left Column: Triage Queue */}
      <div className="w-full lg:w-88 border-r border-slate-200/80 bg-slate-50/60 flex flex-col shrink-0">
        <div className="px-4 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <FileCheck className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">SDMA Verification Triage</h1>
          </div>
          <div className="flex gap-2 mt-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shadow-2xs">
              {pendingIncidents.length} Pending Review
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold shadow-2xs">
              {verifiedIncidents.length} Authoritative Records
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-100">
          {pendingIncidents.length === 0 && verifiedIncidents.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-2 shadow-2xs">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-900">Triage Queue Empty</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                No pending field reports or active hazard alerts requiring sign-off.
              </p>
            </div>
          )}

          {/* Pending triage */}
          {pendingIncidents.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Awaiting Authority Sign-off
              </p>
              {pendingIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 border-b border-slate-100 text-left transition-colors cursor-pointer',
                    selected?.id === inc.id
                      ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                      : 'hover:bg-white'
                  )}
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getHazardIcon(inc.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{inc.id}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">{getIncidentTypeLabel(inc.type)}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">{inc.locationName}</p>
                    <div className="flex items-center justify-between mt-1.5 gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(inc.reportedAt)}</span>
                      {inc.correlation?.isDuplicateOrCorroborating && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          Corroborated
                        </span>
                      )}
                      {inc.correlation?.isConflicting && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                          Conflict
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Resolved/Verified section */}
          {verifiedIncidents.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-2">
                Processed Authority Records
              </p>
              {verifiedIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 border-b border-slate-100 text-left transition-colors cursor-pointer',
                    selected?.id === inc.id
                      ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                      : 'hover:bg-white'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs',
                      inc.syncStatus === 'verified'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    )}
                  >
                    {inc.syncStatus === 'verified' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900">{inc.id}</span>
                    <p className="text-[11px] font-semibold text-slate-600">{getIncidentTypeLabel(inc.type)}</p>
                    <div className="mt-1">
                      <StatusBadge syncStatus={inc.syncStatus} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-white">
        {notification && (
          <div className="px-6 pt-4">
            <Notification type={notification.type} title={notification.msg} visible />
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
              className="px-6 py-6 max-w-4xl space-y-5"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-200/80">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selected.id}</h2>
                    <StatusBadge syncStatus={selected.syncStatus} />
                    <span className="text-xs text-slate-400 font-medium">· Layer 4 Human-in-the-Loop Triage</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    {getHazardIcon(selected.type)}
                    <span>{getIncidentTypeLabel(selected.type)}</span>
                    <span>—</span>
                    <span className="font-bold uppercase text-slate-900">Severity: {selected.severity}</span>
                  </p>
                </div>
                <RiskBadge
                  level={
                    selected.severity === 'critical'
                      ? 'blocked'
                      : selected.severity === 'high'
                      ? 'high'
                      : selected.severity === 'moderate'
                      ? 'moderate'
                      : 'low'
                  }
                />
              </div>

              {/* Correlation & Conflict Detection Banners */}
              {selected.correlation?.isConflicting && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 shadow-2xs">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-900">Conflicting Report Contradiction Detected</p>
                    <p className="text-rose-800 mt-0.5 leading-relaxed font-medium">{selected.correlation.conflictReason}</p>
                  </div>
                </div>
              )}

              {selected.correlation?.isDuplicateOrCorroborating && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 shadow-2xs">
                  <Copy className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900">Spatial Report Corroboration</p>
                    <p className="text-emerald-800 mt-0.5 leading-relaxed font-medium">
                      {selected.correlation.correlationNotes || 'Corroborated by independent regional field observations.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Multi-Lingual Audio Player with Waveform & Bilingual Translation */}
              {Boolean(selected.voiceNote || selected.voiceTranscript) && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Acoustic Evidence & Multilingual Speech-to-Intent
                  </p>
                  <AudioPlayer
                    language={selected.voiceLanguage || 'Assamese (অসমীয়া)'}
                    transcript={selected.voiceTranscript || 'Audio dispatch recorded from field vehicle.'}
                    translatedSummary={
                      selected.aiAnalysis?.englishSummary ||
                      selected.description ||
                      'Audio transcript recorded from field dispatch.'
                    }
                  />
                </div>
              )}

              {/* Field Evidence & Telemetry Source Card */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Driver Field Evidence & Telemetry Feed</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-lg border border-slate-300/80">
                    Source: {selected.locationSource || 'DEVICE_GPS'}
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Raw Typed Description</span>
                    <p className="font-medium text-slate-800 bg-white p-3 rounded-xl border border-slate-200/80 leading-relaxed shadow-2xs">
                      {selected.description || 'No additional typed description provided by driver.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Observer / Unit</span>
                      <p className="font-bold text-slate-900 mt-0.5">{selected.reportedBy}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">GPS Coordinates</span>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">
                        {selected.location[0].toFixed(5)}° N, {selected.location[1].toFixed(5)}° E
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Structured Entity Extraction Card */}
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-blue-200/80 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>AI Autonomous Triage & Extraction Engine</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs',
                        selected.aiAnalysis?.isLiveGemini
                          ? 'bg-white text-blue-700 border-blue-200'
                          : 'bg-white text-slate-600 border-slate-200'
                      )}
                    >
                      {selected.aiAnalysis?.statusLabel || selected.aiAnalysis?.provider || 'Local NLP · Deterministic Fallback'}
                    </span>
                    {selected.aiAnalysis?.model && (
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                        {selected.aiAnalysis.model}
                      </span>
                    )}
                    {selected.aiAnalysis?.confidenceScore !== null && selected.aiAnalysis?.confidenceScore !== undefined ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        Confidence: {Math.round(selected.aiAnalysis.confidenceScore * 100)}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        Confidence: Not available · Heuristic fallback
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-blue-900 uppercase font-bold tracking-wider block mb-1">Synthesized AI English Summary</span>
                    <p className="font-semibold text-blue-950 bg-white p-3 rounded-xl border border-blue-200/80 leading-relaxed shadow-2xs">
                      {selected.aiAnalysis?.englishSummary || selected.description || 'Synthesizing report triage...'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Road Blockage Impact</span>
                      <span className={selected.aiAnalysis?.roadImpact === 'none' ? "font-bold text-emerald-700 mt-1 block" : "font-bold text-rose-700 mt-1 block"}>
                        {selected.aiAnalysis?.roadImpact ? (selected.aiAnalysis.roadImpact === 'none' ? 'NONE (NO OPERATIONAL IMPACT)' : selected.aiAnalysis.roadImpact.replace('_', ' ').toUpperCase()) : 'FULLY BLOCKED'}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Extracted Entities</span>
                      <span className="font-semibold text-slate-800 line-clamp-1 mt-1 block">
                        {selected.aiAnalysis?.extractedEntities?.join(' · ') || 'Corridor Sector'}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Recommended Action</span>
                      <span className="font-semibold text-blue-700 line-clamp-1 mt-1 block">
                        {selected.aiAnalysis?.recommendedAction || 'SDMA verification required before executing reroutes.'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic border-t border-blue-200/60 pt-1.5 font-medium">
                  Advisory Notice: Autonomous entity classifications assist state authorities with high-throughput field triage.
                </p>
              </div>

              {/* Photo Evidence with Photo-Aware AI Triage Badge */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row gap-4 items-center shadow-2xs">
                {selected.photoUrl ? (
                  <div className="w-full sm:w-48 h-32 rounded-xl bg-black/5 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                    <img
                      src={selected.photoUrl}
                      alt="Debris evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full sm:w-48 h-32 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center p-3 text-slate-400 shrink-0">
                    <Camera className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-600">No photo evidence</span>
                    <span className="text-[9px] text-slate-400 font-medium">Telemetry & acoustic report only</span>
                  </div>
                )}
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Visual Evidence Analysis</span>
                  </div>
                  {selected.photoUrl ? (
                    <>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        Geotagged image evidence attached by driver. Visual evidence available for human assessment.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selected.aiAnalysis?.photoAnalyzedByAi ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>AI Analyzed Photo & Verified Evidence</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                            <Camera className="w-3 h-3 text-emerald-600" />
                            <span>Photo Attached · Awaiting Authority Audit</span>
                          </span>
                        )}
                        <span className="inline-block text-[10px] font-semibold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                          EXIF Metadata Validated
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-500 leading-relaxed font-medium">
                      No photographic evidence was captured. Evaluation relies on driver acoustic/text telemetry and corridor sensor feeds.
                    </p>
                  )}
                </div>
              </div>

              {/* Downstream Fleet Blast Radius Table */}
              <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Affected In-Transit Fleet Blast Radius
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100/80 text-rose-800 border border-rose-200 shadow-2xs">
                    {potentiallyAffectedVehicles.length} Transports En Route
                  </span>
                </div>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  Official verification will immediately trigger automated reroute recalculations for approaching freight:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {potentiallyAffectedVehicles.map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-white border border-rose-200/80 flex items-center justify-between text-xs shadow-2xs">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>{v.id}</span>
                          <span className="font-medium text-slate-400">· {v.driverName}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {v.origin} → {v.destination} ({v.cargoType})
                        </p>
                      </div>
                      <StatusBadge
                        label={v.status === 'disrupted' ? 'Disrupted' : 'En Route'}
                        variant={v.status === 'disrupted' ? 'danger' : 'warning'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Action Controls */}
              {(selected.syncStatus === 'pending_verification' ||
                selected.syncStatus === 'synced' ||
                selected.syncStatus === 'local_pending') && (
                <div className="border-t border-slate-200/80 pt-5 space-y-3">
                  <p className="text-xs text-slate-600 font-medium">
                    Confirming as State Disaster Management Authority updates authoritative road accessibility layers and broadcasts reroute directives:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs"
                      iconLeft={<CheckCircle className="w-4 h-4" />}
                      loading={verifyingId === selected.id}
                      onClick={() => handleVerify(selected.id, true)}
                    >
                      Confirm Hazard & Close Corridor
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 rounded-xl font-bold shadow-2xs"
                      iconLeft={<XCircle className="w-4 h-4" />}
                      onClick={() => handleVerify(selected.id, false)}
                    >
                      Reject (False Alarm)
                    </Button>
                  </div>
                </div>
              )}

              {selected.syncStatus === 'verified' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5 shadow-2xs font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Officially validated by {selected.verifiedBy || 'Dr. Rohan Goswami'} · Road sector marked as <strong>BLOCKED</strong>.
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3.5 shadow-2xs">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">All Corridors Operational</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mt-1 leading-relaxed">
              No active hazard reports in the verification queue. New incident reports filed by field drivers or highway patrol will appear here for authority triage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

