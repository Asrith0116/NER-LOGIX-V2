import { cn } from '@/utils';
import type { Route } from '@/types';
import { RiskBadge } from './RiskBadge';
import { formatEta } from '@/utils';
import { CheckCircle, AlertTriangle, Clock, Route as RouteIcon } from 'lucide-react';

interface RouteCardProps {
  route: Route;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function RouteCard({ route, selected, onSelect, className }: RouteCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-white border rounded-lg p-4 cursor-pointer transition-all duration-150',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]',
        selected
          ? 'border-[#2563eb] ring-1 ring-[#2563eb]'
          : 'border-[#e4e4e3] hover:border-[#c4c4c2] hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.07)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <RouteIcon className="w-3.5 h-3.5 text-[#8a8a87]" />
            <span className="text-sm font-semibold text-[#1a1a19]">{route.label}</span>
            {route.recommended && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] text-[10px] font-semibold">
                <CheckCircle className="w-2.5 h-2.5" />
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs text-[#8a8a87]">{route.description}</p>
        </div>
        <RiskBadge level={route.riskLevel} size="sm" />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-[#8a8a87] uppercase tracking-wide mb-1">Risk Score</p>
          <div className="flex items-baseline gap-1">
            <span
              className="text-xl font-semibold tabular-nums leading-none"
              style={{
                color: route.riskScore < 30 ? '#16a34a' : route.riskScore < 60 ? '#d97706' : '#dc2626',
              }}
            >
              {route.riskScore}
            </span>
            <span className="text-[10px] text-[#8a8a87]">/100</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#8a8a87] uppercase tracking-wide mb-1">ETA</p>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#8a8a87]" />
            <span className="text-sm font-semibold text-[#1a1a19] tabular-nums">
              {formatEta(route.etaMinutes)}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#8a8a87] uppercase tracking-wide mb-1">Distance</p>
          <span className="text-sm font-semibold text-[#1a1a19] tabular-nums">
            {route.distanceKm} km
          </span>
        </div>
      </div>

      {/* Risk segments */}
      {route.riskSegments && route.riskSegments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#e4e4e3]">
          {route.riskSegments.map((seg, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626] mt-0.5 shrink-0" />
              <p className="text-xs text-[#dc2626]">{seg.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
