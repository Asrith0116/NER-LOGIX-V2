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
        low: 'text-[#16a34a]',
        moderate: 'text-[#d97706]',
        high: 'text-[#dc2626]',
        blocked: 'text-[#7f1d1d]',
      }[riskLevel]
    : 'text-[#1a1a19]';

  return (
    <div
      className={cn(
        'bg-white border border-[#e4e4e3] rounded-lg px-4 py-3.5',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-[#8a8a87] font-medium uppercase tracking-wide leading-none mb-2">
            {label}
          </p>
          <p className={cn('text-2xl font-semibold leading-none tabular-nums', valueColor)}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-[#8a8a87] mt-1.5 leading-none">{subtext}</p>
          )}
        </div>
        {icon && (
          <div className="text-[#8a8a87] shrink-0 mt-0.5">{icon}</div>
        )}
      </div>
    </div>
  );
}
