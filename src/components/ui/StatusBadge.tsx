import { cn } from '@/utils';
import type { IncidentSyncStatus } from '@/types';
import { getSyncStatusLabel } from '@/utils';

type StatusVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface StatusBadgeProps {
  label?: string;
  variant?: StatusVariant;
  syncStatus?: IncidentSyncStatus;
  className?: string;
  pulse?: boolean;
}

const variantConfig: Record<StatusVariant, string> = {
  default: 'bg-blue-50/90 text-blue-700 border-blue-200/80',
  success: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50/90 text-amber-700 border-amber-200/80',
  danger: 'bg-rose-50/90 text-rose-700 border-rose-200/80',
  info: 'bg-cyan-50/90 text-cyan-800 border-cyan-200/80',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const syncVariantMap: Record<IncidentSyncStatus, StatusVariant> = {
  local_pending: 'warning',
  synced: 'info',
  pending_verification: 'warning',
  verified: 'success',
  rejected: 'danger',
};

export function StatusBadge({
  label,
  variant = 'default',
  syncStatus,
  className,
  pulse = false,
}: StatusBadgeProps) {
  const resolvedVariant = syncStatus ? syncVariantMap[syncStatus] : variant;
  const resolvedLabel = label ?? (syncStatus ? getSyncStatusLabel(syncStatus) : '');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight shadow-2xs',
        variantConfig[resolvedVariant],
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {resolvedLabel}
    </span>
  );
}
