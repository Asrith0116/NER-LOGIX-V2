import { cn } from '@/utils';
import type { Route, RouteCandidate } from '@/types';
import { RiskBadge } from './RiskBadge';
import { formatEta } from '@/utils';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Route as RouteIcon,
  ShieldAlert,
  Sparkles,
  Check,
} from 'lucide-react';

interface RouteCardProps {
  route: Route | RouteCandidate;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

function isCandidate(r: Route | RouteCandidate): r is RouteCandidate {
  return 'operationalScore' in r;
}

export function RouteCard({ route, selected, onSelect, className }: RouteCardProps) {
  const candidate = isCandidate(route) ? route : null;
  const isBlocked = candidate?.isBlocked || route.riskLevel === 'blocked';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-white border rounded-xl p-4 cursor-pointer transition-all duration-150 relative text-left',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]',
        isBlocked
          ? 'border-[#fca5a5] bg-[#fffbfb] opacity-90'
          : selected
            ? 'border-[#2563eb] ring-2 ring-[#2563eb]/20 shadow-sm'
            : 'border-[#e4e4e3] hover:border-[#c4c4c2] hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.06)]',
        className
      )}
    >
      {/* Top Badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {candidate?.recommendationRank === 1 && !isBlocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] text-[11px] font-bold shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#2563eb]" />
              #1 Recommended
            </span>
          )}
          {candidate?.recommendationRank === 2 && !isBlocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] text-[11px] font-semibold">
              #2 Primary Alternative
            </span>
          )}
          {candidate && candidate.recommendationRank > 2 && !isBlocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fafaf9] text-[#71717a] border border-[#e4e4e7] text-[11px] font-medium">
              #{candidate.recommendationRank} Standby Corridor
            </span>
          )}
          {isBlocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#fca5a5] text-[11px] font-bold">
              <ShieldAlert className="w-3 h-3" />
              Impassable / Blocked
            </span>
          )}
          {candidate && !isBlocked && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                candidate.suitability === 'High'
                  ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                  : candidate.suitability === 'Moderate'
                    ? 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'
                    : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
              )}
            >
              {candidate.suitability} Match
            </span>
          )}
        </div>

        <RiskBadge level={route.riskLevel} size="sm" />
      </div>

      {/* Corridor Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-[#8a8a87] shrink-0" />
          <h4 className="text-sm font-bold text-[#1a1a19] tracking-tight">{route.label}</h4>
        </div>
        <p className="text-xs text-[#71717a] mt-0.5 line-clamp-1">{route.description}</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 py-2.5 px-3 bg-[#f8f8f7] rounded-lg border border-[#ececeb] mb-3">
        <div>
          <p className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-semibold mb-0.5">Risk</p>
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-base font-bold tabular-nums leading-none"
              style={{
                color:
                  route.riskScore < 35
                    ? '#16a34a'
                    : route.riskScore < 70
                      ? '#d97706'
                      : '#dc2626',
              }}
            >
              {route.riskScore}
            </span>
            <span className="text-[9px] text-[#8a8a87]">/100</span>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-semibold mb-0.5">ETA</p>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#8a8a87]" />
            <span className="text-xs font-bold text-[#1a1a19] tabular-nums">
              {formatEta(route.etaMinutes)}
            </span>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-semibold mb-0.5">Distance</p>
          <span className="text-xs font-bold text-[#1a1a19] tabular-nums">
            {route.distanceKm} km
          </span>
        </div>

        <div>
          <p className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-semibold mb-0.5">Match</p>
          <span
            className={cn(
              'text-xs font-bold tabular-nums',
              candidate && candidate.operationalScore >= 70
                ? 'text-[#16a34a]'
                : candidate && candidate.operationalScore >= 40
                  ? 'text-[#d97706]'
                  : 'text-[#dc2626]'
            )}
          >
            {candidate ? `${candidate.operationalScore}%` : 'Standard'}
          </span>
        </div>
      </div>

      {/* Recommendation Explanation Text */}
      {candidate?.recommendationReason && (
        <div
          className={cn(
            'p-2.5 rounded-lg text-xs leading-relaxed mb-3 border',
            isBlocked
              ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b] font-medium'
              : candidate.recommendationRank === 1
                ? 'bg-[#eff6ff]/70 border-[#bfdbfe] text-[#1e40af]'
                : 'bg-[#fafaf9] border-[#e4e4e3] text-[#52525b]'
          )}
        >
          {candidate.recommendationReason}
        </div>
      )}

      {/* Advantages / Disadvantages */}
      {candidate && (candidate.advantages.length > 0 || candidate.disadvantages.length > 0) && (
        <div className="space-y-1.5 text-[11px] mb-2">
          {candidate.advantages.slice(0, 2).map((adv, idx) => (
            <div key={`adv-${idx}`} className="flex items-start gap-1.5 text-[#166534]">
              <Check className="w-3 h-3 mt-0.5 shrink-0 text-[#16a34a]" />
              <span>{adv}</span>
            </div>
          ))}
          {candidate.disadvantages.slice(0, 1).map((dis, idx) => (
            <div key={`dis-${idx}`} className="flex items-start gap-1.5 text-[#854d0e]">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-[#ca8a04]" />
              <span>{dis}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selection prompt / radio */}
      <div className="pt-2 border-t border-[#f0f0ef] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#71717a]">
          {selected ? (
            <span className="text-[#2563eb] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Selected Route
            </span>
          ) : isBlocked ? (
            'Not recommended for travel'
          ) : (
            'Click to choose corridor'
          )}
        </span>
        <div
          className={cn(
            'w-4 h-4 rounded-full border flex items-center justify-center transition-all',
            selected ? 'border-[#2563eb] bg-[#2563eb]' : 'border-[#d4d4d8] bg-white'
          )}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
    </div>
  );
}
