import { cn } from '@/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <Loader2 className="w-6 h-6 text-[#2563eb] animate-spin" />
      <p className="text-sm text-[#8a8a87]">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      {icon && (
        <div className="text-[#c4c4c2] mb-1">{icon}</div>
      )}
      <div>
        <p className="text-sm font-medium text-[#5a5a57]">{title}</p>
        {description && (
          <p className="text-xs text-[#8a8a87] mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center">
        <span className="text-[#dc2626] text-lg">!</span>
      </div>
      <div>
        <p className="text-sm font-medium text-[#1a1a19]">{title}</p>
        {description && (
          <p className="text-xs text-[#8a8a87] mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-[#2563eb] hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
