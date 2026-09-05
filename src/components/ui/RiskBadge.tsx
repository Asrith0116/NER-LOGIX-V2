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
    bg: 'bg-[#f0fdf4]',
    text: 'text-[#16a34a]',
    border: 'border-[#bbf7d0]',
    dot: 'bg-[#16a34a]',
  },
  moderate: {
    bg: 'bg-[#fffbeb]',
    text: 'text-[#d97706]',
    border: 'border-[#fde68a]',
    dot: 'bg-[#d97706]',
  },
  high: {
    bg: 'bg-[#fef2f2]',
    text: 'text-[#dc2626]',
    border: 'border-[#fecaca]',
    dot: 'bg-[#dc2626]',
  },
  blocked: {
    bg: 'bg-[#fef2f2]',
    text: 'text-[#7f1d1d]',
    border: 'border-[#fca5a5]',
    dot: 'bg-[#7f1d1d]',
  },
};

export function RiskBadge({ level, score, className, size = 'md' }: RiskBadgeProps) {
  const cfg = riskConfig[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        cfg.bg,
        cfg.text,
        cfg.border,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <span className={cn('rounded-full', cfg.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {getRiskLabel(level)}
      {score !== undefined && (
        <span className="opacity-70 font-normal">{score}/100</span>
      )}
    </span>
  );
}
