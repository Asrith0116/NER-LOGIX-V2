import { useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { ShieldCheck, TrendingUp, Zap, AlertTriangle, Info } from 'lucide-react';

// ─── Priority score calculation ───────────────────────────────────────────────
// Transparent, deterministic. No ML. Inputs are all from the existing demo data.
//
// Score = (disruption_events × 30) + (affected_shipments × 20) + (reroute_impact × 25) + (status_penalty × 25)
// Max possible raw = 100 → clamped to 100.
//
// status_penalty:
//   blocked  → 25
//   caution  → 12
//   open     → 0

interface SegmentInsight {
  id: string;
  name: string;
  fromLocation: string;
  toLocation: string;
  disruptions: number;
  affectedShipments: number;
  rerouteImpact: number; // number of vehicles that needed reroute due to this segment
  statusPenalty: number;
  score: number;
  priority: 'High' | 'Medium' | 'Low';
  currentStatus: string;
  linkedIncidentIds: string[];
}

function priorityLabel(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 65) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

function statusPenaltyValue(status: string): number {
  if (status === 'blocked') return 25;
  if (status === 'caution') return 12;
  return 0;
}

const priorityConfig = {
  High: {
    label: 'High',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-600',
  },
  Medium: {
    label: 'Medium',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  Low: {
    label: 'Low',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export function SDMAConnectivity() {
  const roadSegments = useNetworkStore((s) => s.roadSegments);
  const disruptions = useNetworkStore((s) => s.disruptions);
  const activeVehicles = useNetworkStore((s) => s.activeVehicles);
  const activeIncidents = useNetworkStore((s) => s.activeIncidents);

  const insights = useMemo<SegmentInsight[]>(() => {
    return roadSegments
      .map((seg) => {
        // Count disruptions linked to this segment
        const segDisruptions = disruptions.filter(
          (d) => d.affectedSegmentId === seg.id
        );
        const disruptionCount = segDisruptions.length;

        // Count vehicles directly affected by disruptions on this segment
        const affectedVehicleIds = new Set<string>();
        segDisruptions.forEach((d) => {
          (d.affectedVehicleIds ?? []).forEach((vid) => affectedVehicleIds.add(vid));
        });
        // Also count vehicles whose impactReason mentions this segment
        activeVehicles.forEach((v) => {
          if (
            v.impactReason?.toLowerCase().includes(seg.name.toLowerCase()) ||
            v.plannedSegmentIds?.includes(seg.id)
          ) {
            if (v.status === 'disrupted' || v.affectedByDisruptionId) {
              affectedVehicleIds.add(v.id);
            }
          }
        });
        const affectedShipments = affectedVehicleIds.size;

        // Reroute impact: vehicles that rerouted away from this segment
        const rerouteImpact = activeVehicles.filter(
          (v) =>
            v.rerouteStatus === 'active' &&
            (v.previousRouteId === 'route-b' ||
              (v.plannedSegmentIds ?? []).includes(seg.id))
        ).length;

        const statusPenalty = statusPenaltyValue(seg.status);

        // Score formula (transparent)
        const rawScore =
          Math.min(disruptionCount, 3) * 30 +
          Math.min(affectedShipments, 3) * 20 +
          Math.min(rerouteImpact, 2) * 12 +
          statusPenalty; // already 0–25

        const score = Math.min(100, rawScore);

        // Collect linked incident IDs
        const linkedIncidentIds = [
          ...new Set([
            ...segDisruptions.map((d) => d.incidentId),
            ...(seg.affectedByIncidentId ? [seg.affectedByIncidentId] : []),
          ]),
        ];

        return {
          id: seg.id,
          name: seg.name,
          fromLocation: seg.fromLocation,
          toLocation: seg.toLocation,
          disruptions: disruptionCount,
          affectedShipments,
          rerouteImpact,
          statusPenalty,
          score,
          priority: priorityLabel(score),
          currentStatus: seg.status,
          linkedIncidentIds,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [roadSegments, disruptions, activeVehicles]);

  // Summary metrics
  const highPriorityCount = insights.filter((i) => i.priority === 'High').length;
  const totalDisruptions = disruptions.length;
  const totalAffectedShipments = useMemo(
    () =>
      activeVehicles.filter(
        (v) => v.status === 'disrupted' || Boolean(v.affectedByDisruptionId)
      ).length,
    [activeVehicles]
  );
  const totalReroutes = useMemo(
    () => activeVehicles.filter((v) => v.rerouteStatus === 'active').length,
    [activeVehicles]
  );

  const topSegment = insights[0];

  // Build "Why prioritized" explanation for the top segment
  const whyLines: string[] = useMemo(() => {
    if (!topSegment) return [];
    const lines: string[] = [];
    if (topSegment.disruptions > 0) {
      lines.push(
        `${topSegment.disruptions} disruption event${topSegment.disruptions > 1 ? 's' : ''} recorded on this segment (score +${Math.min(topSegment.disruptions, 3) * 30})`
      );
    }
    if (topSegment.affectedShipments > 0) {
      lines.push(
        `${topSegment.affectedShipments} shipment${topSegment.affectedShipments > 1 ? 's' : ''} directly impacted (score +${Math.min(topSegment.affectedShipments, 3) * 20})`
      );
    }
    if (topSegment.rerouteImpact > 0) {
      lines.push(
        `${topSegment.rerouteImpact} vehicle${topSegment.rerouteImpact > 1 ? 's' : ''} required reroute away from this corridor (score +${Math.min(topSegment.rerouteImpact, 2) * 12})`
      );
    }
    if (topSegment.statusPenalty > 0) {
      lines.push(
        `Current road status is "${topSegment.currentStatus}" — indicating active or recent blockage (score +${topSegment.statusPenalty})`
      );
    }
    const linkedInc = topSegment.linkedIncidentIds
      .map((id) => activeIncidents.find((i) => i.id === id))
      .filter(Boolean);
    if (linkedInc.length > 0) {
      lines.push(
        `Linked incident${linkedInc.length > 1 ? 's' : ''}: ${linkedInc.map((i) => i!.id).join(', ')}`
      );
    }
    return lines;
  }, [topSegment, activeIncidents]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f4f6f8]">
      {/* Header */}
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Connectivity Intelligence
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              MDoNER / SDMA — Infrastructure Priority Analysis · North Eastern Region
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0 ml-4 shadow-2xs">
            Synthetic demo insight
          </span>
        </div>

        {/* Disclaimer banner */}
        <div className="mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            All figures below are derived from synthetic demo/prototype data only. This is{' '}
            <strong className="text-slate-800">not</strong> real government intelligence, satellite measurement, or actual
            infrastructure recommendation. For illustration of the NER-LOGIX concept only.
          </p>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5">
          {[
            {
              label: 'High-Priority Segments',
              value: highPriorityCount,
              color: 'text-rose-700',
              bg: 'bg-rose-50/50',
              border: 'border-rose-100',
            },
            {
              label: 'Disruption Events',
              value: totalDisruptions,
              color: 'text-amber-700',
              bg: 'bg-amber-50/50',
              border: 'border-amber-100',
            },
            {
              label: 'Affected Shipments',
              value: totalAffectedShipments,
              color: 'text-purple-700',
              bg: 'bg-purple-50/50',
              border: 'border-purple-100',
            },
            {
              label: 'Reroutes / Delays',
              value: totalReroutes,
              color: 'text-blue-700',
              bg: 'bg-blue-50/50',
              border: 'border-blue-100',
            },
          ].map((m) => (
            <div
              key={m.label}
              className={`${m.bg} ${m.border} rounded-2xl px-4 py-3 border shadow-2xs`}
            >
              <p className={`text-2xl font-bold tabular-nums tracking-tight ${m.color}`}>{m.value}</p>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5 leading-tight">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Concept explanation */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-2xs">
          <Zap className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-900 font-medium leading-relaxed">
            Repeated disruptions + shipment impact indicate where connectivity improvement may have
            the highest operational value. Segments with frequent blockages, multiple affected
            shipments, and forced reroutes are ranked highest.
          </p>
        </div>

        {/* Score methodology */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
            Priority Score Methodology
          </h2>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Factor
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Cap
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {[
                  { factor: 'Disruption events on segment', weight: '×30 pts each', cap: 'Max 3 events' },
                  { factor: 'Affected shipments / vehicles', weight: '×20 pts each', cap: 'Max 3 shipments' },
                  { factor: 'Reroutes triggered', weight: '×12 pts each', cap: 'Max 2 reroutes' },
                  { factor: 'Current road status (blocked / caution)', weight: '+25 / +12 pts', cap: 'Fixed penalty' },
                ].map((r) => (
                  <tr key={r.factor} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-900 font-semibold">{r.factor}</td>
                    <td className="px-4 py-2.5 text-slate-600 font-bold">{r.weight}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.cap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top-segment "why" card */}
        {topSegment && whyLines.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Why This Segment Is Prioritised
            </h2>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900">
                  {topSegment.name}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({topSegment.fromLocation} → {topSegment.toLocation})
                </span>
                <span className="ml-auto text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-200 tabular-nums">
                  Score {topSegment.score}
                </span>
              </div>
              <ul className="space-y-1.5 pt-1">
                {whyLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-600 mt-0.5 leading-none font-bold">›</span>
                    <span className="text-xs text-slate-700 font-medium leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Ranked segments table */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
            Segment Priority Ranking
          </h2>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center bg-slate-50 border-b border-slate-200/80 px-4 py-2.5">
              {[
                { label: 'Segment', align: 'text-left' },
                { label: 'Disruptions', align: 'text-center' },
                { label: 'Shipments', align: 'text-center' },
                { label: 'Reroutes', align: 'text-center' },
                { label: 'Score', align: 'text-center' },
                { label: 'Priority', align: 'text-right' },
              ].map((h) => (
                <span
                  key={h.label}
                  className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${h.align}`}
                >
                  {h.label}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {insights.map((seg, idx) => {
                const pc = priorityConfig[seg.priority];
                return (
                  <div
                    key={seg.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Segment name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums w-4">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {seg.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {seg.fromLocation} → {seg.toLocation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Disruptions */}
                    <span className="text-xs font-bold text-slate-800 text-center w-16">
                      {seg.disruptions}
                    </span>

                    {/* Affected shipments */}
                    <span className="text-xs font-bold text-slate-800 text-center w-16">
                      {seg.affectedShipments}
                    </span>

                    {/* Reroutes */}
                    <span className="text-xs font-bold text-slate-800 text-center w-14">
                      {seg.rerouteImpact}
                    </span>

                    {/* Score bar + number */}
                    <div className="flex items-center gap-2 w-24">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pc.dot}`}
                          style={{ width: `${seg.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900 tabular-nums w-6 text-right">
                        {seg.score}
                      </span>
                    </div>

                    {/* Priority badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${pc.color} ${pc.bg} border ${pc.border} text-right whitespace-nowrap shadow-2xs`}
                    >
                      {pc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="pb-3">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              <strong className="text-slate-900">Demo / synthetic data.</strong> Priority scores
              are computed deterministically from the NER-LOGIX prototype's seeded disruption,
              vehicle, and road-segment records. They do not represent measured infrastructure
              conditions, government-verified data, or actual MDoNER / SDMA recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
