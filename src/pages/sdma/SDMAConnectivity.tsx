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
    color: 'text-[#dc2626]',
    bg: 'bg-[#fef2f2]',
    border: 'border-[#fecaca]',
    dot: 'bg-[#dc2626]',
  },
  Medium: {
    label: 'Medium',
    color: 'text-[#d97706]',
    bg: 'bg-[#fffbeb]',
    border: 'border-[#fde68a]',
    dot: 'bg-[#d97706]',
  },
  Low: {
    label: 'Low',
    color: 'text-[#16a34a]',
    bg: 'bg-[#f0fdf4]',
    border: 'border-[#bbf7d0]',
    dot: 'bg-[#16a34a]',
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-[#e4e4e3] shrink-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563eb]" />
              <h1 className="text-base font-semibold text-[#1a1a19]">
                Connectivity Intelligence
              </h1>
            </div>
            <p className="text-xs text-[#8a8a87] mt-0.5">
              MDoNER / SDMA — Infrastructure Priority Analysis · North Eastern Region
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#fffbeb] text-[#92400e] border border-[#fde68a] shrink-0 ml-4">
            Synthetic demo insight
          </span>
        </div>

        {/* Disclaimer banner */}
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3]">
          <Info className="w-3.5 h-3.5 text-[#8a8a87] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#5a5a57] leading-relaxed">
            All figures below are derived from synthetic demo/prototype data only. This is{' '}
            <strong>not</strong> real government intelligence, satellite measurement, or actual
            infrastructure recommendation. For illustration of the NER-LOGIX concept only.
          </p>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            {
              label: 'High-Priority Segments',
              value: highPriorityCount,
              color: 'text-[#dc2626]',
              bg: 'bg-[#fef2f2]',
            },
            {
              label: 'Disruption Events',
              value: totalDisruptions,
              color: 'text-[#d97706]',
              bg: 'bg-[#fffbeb]',
            },
            {
              label: 'Affected Shipments',
              value: totalAffectedShipments,
              color: 'text-[#7c3aed]',
              bg: 'bg-[#f5f3ff]',
            },
            {
              label: 'Reroutes / Delays',
              value: totalReroutes,
              color: 'text-[#0369a1]',
              bg: 'bg-[#f0f9ff]',
            },
          ].map((m) => (
            <div
              key={m.label}
              className={`${m.bg} rounded-lg px-3 py-2.5 border border-[#e4e4e3]`}
            >
              <p className={`text-xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-[#5a5a57] mt-0.5 leading-tight">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

        {/* Concept explanation */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#eff6ff] border border-[#bfdbfe]">
          <Zap className="w-3.5 h-3.5 text-[#2563eb] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#1e3a5f] leading-relaxed">
            Repeated disruptions + shipment impact indicate where connectivity improvement may have
            the highest operational value. Segments with frequent blockages, multiple affected
            shipments, and forced reroutes are ranked highest.
          </p>
        </div>

        {/* Score methodology */}
        <div>
          <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-2">
            Priority Score Methodology
          </h2>
          <div className="rounded-lg border border-[#e4e4e3] bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#f8f8f7] border-b border-[#e4e4e3]">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#8a8a87] uppercase tracking-wide">
                    Factor
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#8a8a87] uppercase tracking-wide">
                    Weight
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#8a8a87] uppercase tracking-wide">
                    Cap
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f3]">
                {[
                  { factor: 'Disruption events on segment', weight: '×30 pts each', cap: 'Max 3 events' },
                  { factor: 'Affected shipments / vehicles', weight: '×20 pts each', cap: 'Max 3 shipments' },
                  { factor: 'Reroutes triggered', weight: '×12 pts each', cap: 'Max 2 reroutes' },
                  { factor: 'Current road status (blocked / caution)', weight: '+25 / +12 pts', cap: 'Fixed penalty' },
                ].map((r) => (
                  <tr key={r.factor}>
                    <td className="px-3 py-2 text-[#1a1a19]">{r.factor}</td>
                    <td className="px-3 py-2 text-[#5a5a57] font-medium">{r.weight}</td>
                    <td className="px-3 py-2 text-[#8a8a87]">{r.cap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top-segment "why" card */}
        {topSegment && whyLines.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-2">
              Why This Segment Is Prioritised
            </h2>
            <div className="rounded-lg border border-[#fecaca] bg-[#fff8f8] px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
                <span className="text-xs font-semibold text-[#1a1a19]">
                  {topSegment.name}
                </span>
                <span className="text-[10px] text-[#8a8a87]">
                  ({topSegment.fromLocation} → {topSegment.toLocation})
                </span>
                <span className="ml-auto text-xs font-bold text-[#dc2626] tabular-nums">
                  Score {topSegment.score}
                </span>
              </div>
              <ul className="space-y-1">
                {whyLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#dc2626] mt-0.5 leading-none">›</span>
                    <span className="text-[11px] text-[#3a3a38] leading-snug">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Ranked segments table */}
        <div>
          <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-2">
            Segment Priority Ranking
          </h2>
          <div className="rounded-lg border border-[#e4e4e3] bg-white overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 items-center bg-[#f8f8f7] border-b border-[#e4e4e3] px-3 py-2">
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
                  className={`text-[10px] font-semibold text-[#8a8a87] uppercase tracking-wide ${h.align}`}
                >
                  {h.label}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#f4f4f3]">
              {insights.map((seg, idx) => {
                const pc = priorityConfig[seg.priority];
                return (
                  <div
                    key={seg.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5 hover:bg-[#fafaf9] transition-colors"
                  >
                    {/* Segment name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-[#c4c4c2] tabular-nums w-4">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-[#1a1a19] truncate">
                            {seg.name}
                          </p>
                          <p className="text-[10px] text-[#8a8a87]">
                            {seg.fromLocation} → {seg.toLocation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Disruptions */}
                    <span className="text-xs font-semibold text-[#1a1a19] text-center w-16">
                      {seg.disruptions}
                    </span>

                    {/* Affected shipments */}
                    <span className="text-xs font-semibold text-[#1a1a19] text-center w-16">
                      {seg.affectedShipments}
                    </span>

                    {/* Reroutes */}
                    <span className="text-xs font-semibold text-[#1a1a19] text-center w-14">
                      {seg.rerouteImpact}
                    </span>

                    {/* Score bar + number */}
                    <div className="flex items-center gap-1.5 w-20">
                      <div className="flex-1 h-1.5 rounded-full bg-[#f4f4f3] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pc.dot}`}
                          style={{ width: `${seg.score}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#1a1a19] tabular-nums w-6 text-right">
                        {seg.score}
                      </span>
                    </div>

                    {/* Priority badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${pc.color} ${pc.bg} border ${pc.border} text-right whitespace-nowrap`}
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
        <div className="pb-2">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#166534] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#5a5a57] leading-relaxed">
              <strong className="text-[#1a1a19]">Demo / synthetic data.</strong> Priority scores
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
