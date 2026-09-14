import type { RiskFactorBreakdown } from '@/types';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { CloudRain, Mountain, History, AlertTriangle, Truck, Info, Cpu } from 'lucide-react';

interface RiskBreakdownCardProps {
  breakdown: RiskFactorBreakdown;
  routeLabel?: string;
  className?: string;
}

export function RiskBreakdownCard({ breakdown, routeLabel, className = '' }: RiskBreakdownCardProps) {
  const { totalScore, riskCategory, factors, plainLanguageExplanation, recommendation, predictiveIntelligence } = breakdown;

  const factorList = [
    {
      key: 'rainfall',
      icon: <CloudRain className="w-3.5 h-3.5 text-[#2563eb]" />,
      data: factors.rainfall,
      color: 'bg-[#2563eb]',
    },
    {
      key: 'slope',
      icon: <Mountain className="w-3.5 h-3.5 text-[#d97706]" />,
      data: factors.slopeTerrain,
      color: 'bg-[#d97706]',
    },
    {
      key: 'historical',
      icon: <History className="w-3.5 h-3.5 text-[#7c3aed]" />,
      data: factors.historicalDisruptions,
      color: 'bg-[#7c3aed]',
    },
    {
      key: 'hazards',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />,
      data: factors.activeHazards,
      color: 'bg-[#dc2626]',
    },
    {
      key: 'vehicle',
      icon: <Truck className="w-3.5 h-3.5 text-[#059669]" />,
      data: factors.vehicleWeightModifier,
      color: 'bg-[#059669]',
    },
  ];

  if (factors.predictiveML) {
    factorList.push({
      key: 'predictiveML',
      icon: <Cpu className="w-3.5 h-3.5 text-[#0284c7]" />,
      data: factors.predictiveML,
      color: 'bg-[#0284c7]',
    });
  }

  return (
    <div className={`p-4 rounded-xl bg-white border border-[#e4e4e3] shadow-xs ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0ef]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a8a87]">
            Accessibility & Predictive Intelligence
          </span>
          <h3 className="text-sm font-bold text-[#1a1a19]">
            {routeLabel ? `${routeLabel} Risk Breakdown` : 'Explainable Risk Assessment'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-lg font-bold text-[#1a1a19] tabular-nums">{totalScore}</span>
            <span className="text-xs text-[#8a8a87]">/100</span>
          </div>
          <RiskBadge level={riskCategory} />
        </div>
      </div>

      {/* Phase 3 Predictive Intelligence ML Badge Panel */}
      {predictiveIntelligence && (
        <div className="my-3 p-3 rounded-xl bg-[#f0f9ff] border border-[#bae6fd] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[#0369a1]">
              <Cpu className="w-4 h-4 text-[#0284c7]" />
              <span>GradientBoosting Disruption Probability</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white text-[#0369a1] border border-[#7dd3fc] text-[10px] font-bold">
              {predictiveIntelligence.algorithm}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-[#0e7490] font-medium">Predicted Segment Risk:</span>
            <span className="text-sm font-extrabold text-[#0369a1]">
              {Math.round(predictiveIntelligence.probability * 100)}% ({predictiveIntelligence.riskLevel})
            </span>
          </div>
          <div className="p-2 bg-white/80 rounded-lg text-[11px] text-[#334155] leading-relaxed">
            <strong>Key Explanatory Factors:</strong> {predictiveIntelligence.explanation}
          </div>
        </div>
      )}

      {/* Factor Breakdown Bars */}
      <div className="py-3 space-y-2.5">
        {factorList.map((item) => {
          if (!item.data) return null;
          const pct = Math.min(100, Math.round((item.data.score / item.data.max) * 100));
          return (
            <div key={item.key} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-[#1a1a19]">
                  {item.icon}
                  <span>{item.data.label}</span>
                </div>
                <div className="font-bold text-[#1a1a19] tabular-nums">
                  +{item.data.score}{' '}
                  <span className="font-normal text-[#8a8a87] text-[10px]">
                    / {item.data.max} max
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-[#f4f4f3] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-[#71717a]">{item.data.value}</p>
            </div>
          );
        })}
      </div>

      {/* Plain Language AI Explanation */}
      <div className="pt-3 border-t border-[#f0f0ef] space-y-2">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#fafaf9] border border-[#e4e4e3]">
          <Info className="w-3.5 h-3.5 text-[#2563eb] shrink-0 mt-0.5" />
          <div className="text-xs text-[#4b5563] leading-relaxed">
            <strong className="text-[#1a1a19]">Decision Rationale:</strong> {plainLanguageExplanation}
          </div>
        </div>

        {recommendation && (
          <div className="px-2.5 py-2 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-xs text-[#166534] font-medium leading-snug">
            <strong>Operational Advisory:</strong> {recommendation}
          </div>
        )}
      </div>
    </div>
  );
}
