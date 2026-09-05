import { cn } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationProps {
  type?: NotificationType;
  title: string;
  message?: string;
  onClose?: () => void;
  className?: string;
  visible?: boolean;
}

const notifConfig: Record<NotificationType, { bg: string; border: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-[#eff6ff]',
    border: 'border-[#bfdbfe]',
    icon: <Info className="w-4 h-4 text-[#2563eb]" />,
  },
  success: {
    bg: 'bg-[#f0fdf4]',
    border: 'border-[#bbf7d0]',
    icon: <CheckCircle className="w-4 h-4 text-[#16a34a]" />,
  },
  warning: {
    bg: 'bg-[#fffbeb]',
    border: 'border-[#fde68a]',
    icon: <AlertTriangle className="w-4 h-4 text-[#d97706]" />,
  },
  error: {
    bg: 'bg-[#fef2f2]',
    border: 'border-[#fecaca]',
    icon: <XCircle className="w-4 h-4 text-[#dc2626]" />,
  },
};

export function Notification({
  type = 'info',
  title,
  message,
  onClose,
  className,
  visible = true,
}: NotificationProps) {
  const cfg = notifConfig[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'flex items-start gap-3 px-3.5 py-3 rounded-lg border',
            cfg.bg,
            cfg.border,
            className,
          )}
        >
          <div className="shrink-0 mt-0.5">{cfg.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1a1a19] leading-snug">{title}</p>
            {message && (
              <p className="text-xs text-[#5a5a57] mt-0.5 leading-snug">{message}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 text-[#8a8a87] hover:text-[#1a1a19] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
