import { cn } from '@/utils';
import type { RiskLevel } from '@/types';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  riskLevel?: RiskLevel;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ label, value, subtext, riskLevel, icon, className }: MetricCardProps) {
  const valueColor = riskLevel
    ? {
        low: 'text-emerald-600',
        moderate: 'text-amber-600',
        high: 'text-rose-600',
        blocked: 'text-red-800',
      }[riskLevel]
    : 'text-slate-900';

  const iconBgColor = riskLevel
    ? {
        low: 'bg-emerald-50/80 text-emerald-600 border-emerald-100',
        moderate: 'bg-amber-50/80 text-amber-600 border-amber-100',
        high: 'bg-rose-50/80 text-rose-600 border-rose-100',
        blocked: 'bg-red-50 text-red-700 border-red-200',
      }[riskLevel]
    : 'bg-slate-50 text-slate-600 border-slate-100';

  return (
    <div
      className={cn(
        'group bg-white/95 backdrop-blur-[2px] border border-slate-200/80 rounded-2xl p-4 sm:p-4.5',
        'shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05),0_1px_3px_0_rgba(15,23,42,0.03)]',
        'hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:border-slate-300 transition-all duration-200',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-2.5">
            {label}
          </p>
          <p className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight leading-none tabular-nums', valueColor)}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-slate-500 mt-2 leading-relaxed flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
              <span>{subtext}</span>
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105', iconBgColor)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
