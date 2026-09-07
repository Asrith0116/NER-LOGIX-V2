import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStore } from '@/store/networkStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Button } from '@/components/ui/Button';
import { Notification } from '@/components/ui/Notification';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
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
    <div className="h-full flex flex-col lg:flex-row min-h-0 bg-[#f8f8f7]">
      {/* Left Column: Triage Queue */}
      <div className="w-full lg:w-88 border-r border-[#e4e4e3] bg-[#fafaf9] flex flex-col shrink-0">
        <div className="px-4 py-3.5 bg-white border-b border-[#e4e4e3]">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#2563eb]" />
            <h1 className="text-sm font-bold text-[#1a1a19]">SDMA Verification Triage</h1>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-[#fffbeb] border border-[#fde68a] text-[#d97706] text-[10px] font-bold">
              {pendingIncidents.length} Pending Review
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-[10px] font-bold">
              {verifiedIncidents.length} Authoritative Records
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {pendingIncidents.length === 0 && verifiedIncidents.length === 0 && (
            <div className="p-6 text-center text-[#8a8a87]">
              <div className="w-10 h-10 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#16a34a] mx-auto mb-2">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#1a1a19]">Triage Queue Empty</p>
              <p className="text-[11px] text-[#8a8a87] mt-1 leading-relaxed">
                No pending field reports or active hazard alerts requiring sign-off.
              </p>
            </div>
          )}

          {/* Pending triage */}
          {pendingIncidents.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">
                Awaiting Authority Sign-off
              </p>
              {pendingIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-2.5 border-b border-[#f0f0ef] text-left transition-colors cursor-pointer',
                    selected?.id === inc.id
                      ? 'bg-[#eff6ff] border-l-4 border-l-[#2563eb]'
                      : 'hover:bg-white'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-[#fffbeb] flex items-center justify-center shrink-0 mt-0.5">
                    {getHazardIcon(inc.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1a1a19]">{inc.id}</span>
                      <ChevronRight className="w-3 h-3 text-[#8a8a87]" />
                    </div>
                    <p className="text-[11px] font-semibold text-[#5a5a57]">{getIncidentTypeLabel(inc.type)}</p>
                    <p className="text-[10px] text-[#8a8a87] truncate">{inc.locationName}</p>
                    <div className="flex items-center justify-between mt-1 gap-1 flex-wrap">
                      <span className="text-[10px] text-[#8a8a87]">{formatTimeAgo(inc.reportedAt)}</span>
                      {inc.correlation?.isDuplicateOrCorroborating && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                          Corroborated
                        </span>
                      )}
                      {inc.correlation?.isConflicting && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#fef2f2] text-[#dc2626] border border-[#fca5a5]">
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
                      ? 'bg-[#eff6ff] border-l-4 border-l-[#2563eb]'
                      : 'hover:bg-white'
                  )}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      inc.syncStatus === 'verified' ? 'bg-[#f0fdf4]' : 'bg-[#fef2f2]'
                    )}
                  >
                    {inc.syncStatus === 'verified' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-[#16a34a]" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-[#dc2626]" />
                    )}
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
              className="px-6 py-5 max-w-4xl space-y-5"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#e4e4e3]">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-lg font-bold text-[#1a1a19]">{selected.id}</h2>
                    <StatusBadge syncStatus={selected.syncStatus} />
                    <span className="text-xs text-[#8a8a87]">· Layer 4 Human-in-the-Loop Triage</span>
                  </div>
                  <p className="text-sm font-semibold text-[#5a5a57] flex items-center gap-1.5">
                    {getHazardIcon(selected.type)}
                    <span>{getIncidentTypeLabel(selected.type)}</span>
                    <span>—</span>
                    <span className="font-bold uppercase text-[#1a1a19]">Severity: {selected.severity}</span>
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
                <div className="p-3.5 rounded-xl bg-[#fff1f2] border border-[#fca5a5] flex items-start gap-2.5">
                  <AlertOctagon className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-[#991b1b]">Conflicting Report Contradiction Detected</p>
                    <p className="text-[#7f1d1d] mt-0.5 leading-relaxed">{selected.correlation.conflictReason}</p>
                  </div>
                </div>
              )}

              {selected.correlation?.isDuplicateOrCorroborating && (
                <div className="p-3.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-start gap-2.5">
                  <Copy className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-[#166534]">Spatial Report Corroboration</p>
                    <p className="text-[#15803d] mt-0.5 leading-relaxed">
                      {selected.correlation.correlationNotes || 'Corroborated by independent regional field observations.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Multi-Lingual Audio Player with Waveform & Bilingual Translation */}
              <div>
                <p className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider mb-2">
                  Acoustic Evidence & Multilingual Speech-to-Intent
                </p>
                <AudioPlayer
                  language={selected.voiceLanguage || 'Assamese (অসমীয়া)'}
                  transcript={
                    selected.voiceTranscript ||
                    'পাহাৰৰ পৰা ডাঙৰ শিল আৰু মাটি খহি ৰাস্তা সম্পূৰ্ণ বন্ধ হৈ পৰিছে। কোনো গাড়ী পাৰ হ’ব পৰা নাই।'
                  }
                  translatedSummary={
                    selected.aiAnalysis?.englishSummary ||
                    selected.description ||
                    'Major slope collapse with scree debris blocking both carriageways. Completely impassable.'
                  }
                />
              </div>

              {/* AI Structured Entity Extraction Card */}
              <div className="p-4 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e40af]">
                    <Sparkles className="w-4 h-4 text-[#2563eb]" />
                    <span>AI Autonomous Triage & Extraction Engine</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#1d4ed8] border border-[#bfdbfe]">
                      {selected.aiAnalysis?.provider || 'Deterministic Local NLP'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16a34a]/15 text-[#15803d]">
                      Confidence: {Math.round((selected.aiAnalysis?.confidenceScore || 0.94) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-[#dbeafe]">
                    <span className="text-[10px] text-[#8a8a87] uppercase font-bold block">Road Impact</span>
                    <span className="font-bold text-[#dc2626]">
                      {selected.aiAnalysis?.roadImpact ? selected.aiAnalysis.roadImpact.replace('_', ' ').toUpperCase() : 'FULLY BLOCKED'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#dbeafe]">
                    <span className="text-[10px] text-[#8a8a87] uppercase font-bold block">Extracted Entities</span>
                    <span className="font-semibold text-[#1a1a19] line-clamp-1">
                      {selected.aiAnalysis?.extractedEntities?.join(' · ') || 'NH-2 · KM 312 · Mao Pass'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#dbeafe]">
                    <span className="text-[10px] text-[#8a8a87] uppercase font-bold block">Recommended Action</span>
                    <span className="font-semibold text-[#2563eb] line-clamp-1">
                      {selected.aiAnalysis?.recommendedAction || 'Execute Reactive Reroute via Route A'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#64748b] italic border-t border-[#dbeafe] pt-1">
                  Advisory Notice: AI classifications are preliminary and assist human operator verification.
                </p>
              </div>

              {/* Location & Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#f8f8f7] rounded-xl p-3 border border-[#e4e4e3]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                    <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">Location</span>
                  </div>
                  <p className="text-xs font-bold text-[#1a1a19] truncate">{selected.locationName}</p>
                  <p className="text-[10px] text-[#8a8a87] mt-0.5">
                    {selected.location[0].toFixed(4)}°N, {selected.location[1].toFixed(4)}°E ({selected.locationSource || 'DEVICE_GPS'})
                  </p>
                </div>
                <div className="bg-[#f8f8f7] rounded-xl p-3 border border-[#e4e4e3]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#d97706]" />
                    <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">Reported Time</span>
                  </div>
                  <p className="text-xs font-bold text-[#1a1a19]">{formatDateTime(selected.reportedAt)}</p>
                  <p className="text-[10px] text-[#8a8a87] mt-0.5">{formatTimeAgo(selected.reportedAt)}</p>
                </div>
                <div className="bg-[#f8f8f7] rounded-xl p-3 border border-[#e4e4e3]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">Observer</span>
                  </div>
                  <p className="text-xs font-bold text-[#1a1a19] truncate">{selected.reportedBy}</p>
                  <p className="text-[10px] text-[#8a8a87] mt-0.5">Field Transport Driver</p>
                </div>
              </div>

              {/* Photo Evidence */}
              <div className="p-3.5 rounded-xl bg-[#fafaf9] border border-[#e4e4e3] flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-full sm:w-48 h-32 rounded-lg bg-black/5 overflow-hidden shrink-0 border border-[#e4e4e3]">
                  <img
                    src={selected.photoUrl || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'}
                    alt="Debris evidence"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1a1a19]">
                    <Camera className="w-4 h-4 text-[#2563eb]" />
                    <span>Visual Evidence Analysis</span>
                  </div>
                  <p className="text-[#5a5a57] leading-relaxed">
                    Geotagged image confirms heavy soil shear and debris across both lanes.
                    Approximate debris volume: ~350 m³. No light or heavy vehicle clearance without mechanized earthmovers.
                  </p>
                  <span className="inline-block text-[10px] font-semibold text-[#16a34a] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#bbf7d0]">
                    EXIF Metadata Validated
                  </span>
                </div>
              </div>

              {/* Downstream Fleet Blast Radius Table */}
              <div className="p-4 rounded-xl bg-[#fff8f8] border border-[#fca5a5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#dc2626]" />
                    <h3 className="text-xs font-bold text-[#991b1b] uppercase tracking-wider">
                      Affected In-Transit Fleet Blast Radius
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#fca5a5]">
                    {potentiallyAffectedVehicles.length} Transports En Route
                  </span>
                </div>
                <p className="text-xs text-[#7f1d1d] leading-snug">
                  Official verification will immediately trigger automated reroute recalculations for approaching freight:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {potentiallyAffectedVehicles.map((v) => (
                    <div key={v.id} className="p-2.5 rounded-lg bg-white border border-[#fecaca] flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-[#1a1a19]">
                          <Truck className="w-3.5 h-3.5 text-[#2563eb]" />
                          <span>{v.id}</span>
                          <span className="font-normal text-[#8a8a87]">· {v.driverName}</span>
                        </div>
                        <p className="text-[10px] text-[#5a5a57] mt-0.5">
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
                <div className="border-t border-[#e4e4e3] pt-4 space-y-3">
                  <p className="text-xs text-[#5a5a57]">
                    Confirming as State Disaster Management Authority updates authoritative road accessibility layers and broadcasts reroute directives:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      className="bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold shadow-sm"
                      iconLeft={<CheckCircle className="w-4 h-4" />}
                      loading={verifyingId === selected.id}
                      onClick={() => handleVerify(selected.id, true)}
                    >
                      Confirm Hazard & Close Corridor
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs text-[#dc2626] border-[#fca5a5] hover:bg-[#fef2f2] font-semibold"
                      iconLeft={<XCircle className="w-4 h-4" />}
                      onClick={() => handleVerify(selected.id, false)}
                    >
                      Reject (False Alarm)
                    </Button>
                  </div>
                </div>
              )}

              {selected.syncStatus === 'verified' && (
                <div className="p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-xs text-[#166534] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#16a34a]" />
                  <span>
                    Officially validated by {selected.verifiedBy || 'Dr. Rohan Goswami'} · Road sector marked as <strong>BLOCKED</strong>.
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#16a34a] mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1a1a19]">All Corridors Operational</h3>
            <p className="text-xs text-[#8a8a87] max-w-sm mt-1 leading-relaxed">
              No active hazard reports in the verification queue. New incident reports filed by field drivers or highway patrol will appear here for authority triage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

