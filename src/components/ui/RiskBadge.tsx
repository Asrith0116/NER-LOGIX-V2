import { cn } from '@/utils';
import type { RiskLevel } from '@/types';
import { getRiskLabel } from '@/utils';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  className?: string;
  size?: 'sm' | 'md';
}

const riskConfig = {
  low: {
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  moderate: {
    bg: 'bg-amber-50/90',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    dot: 'bg-amber-500',
  },
  high: {
    bg: 'bg-rose-50/90',
    text: 'text-rose-700',
    border: 'border-rose-200/80',
    dot: 'bg-rose-500',
  },
  blocked: {
    bg: 'bg-red-950 text-white',
    text: 'text-red-100',
    border: 'border-red-900',
    dot: 'bg-red-400',
  },
};

export function RiskBadge({ level, score, className, size = 'md' }: RiskBadgeProps) {
  const cfg = riskConfig[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold shadow-2xs',
        cfg.bg,
        cfg.text,
        cfg.border,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <span className={cn('rounded-full shrink-0', cfg.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      <span>{getRiskLabel(level)}</span>
      {score !== undefined && (
        <span className="opacity-75 font-normal tabular-nums">{score}/100</span>
      )}
    </span>
  );
}
