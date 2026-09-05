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
  default: 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]',
  success: 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]',
  warning: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
  danger: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
  info: 'bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]',
  neutral: 'bg-[#f5f5f4] text-[#57534e] border-[#d6d3d1]',
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
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium',
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
