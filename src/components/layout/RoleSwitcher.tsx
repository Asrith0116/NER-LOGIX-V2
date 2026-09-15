import { useAppStore } from '@/store/appStore';
import { cn } from '@/utils';
import type { UserRole } from '@/types';
import { Truck, Activity, ShieldCheck, Warehouse } from 'lucide-react';

interface RoleSwitcherProps {
  className?: string;
}

const roles: { id: UserRole; title: string; objective: string; icon: React.ReactNode; to: string }[] = [
  {
    id: 'driver',
    title: 'Driver Cockpit',
    objective: 'Journey safety & field report',
    icon: <Truck className="w-4 h-4" />,
    to: '/driver',
  },
  {
    id: 'dispatcher',
    title: 'Dispatcher Center',
    objective: 'Fleet monitoring & rerouting',
    icon: <Activity className="w-4 h-4" />,
    to: '/dispatcher',
  },
  {
    id: 'sdma',
    title: 'Govt / SDMA Intel',
    objective: 'Road closures & verification',
    icon: <ShieldCheck className="w-4 h-4" />,
    to: '/sdma',
  },
  {
    id: 'contractor',
    title: 'Supply Contractor',
    objective: 'Emergency buffer & relief storage',
    icon: <Warehouse className="w-4 h-4" />,
    to: '/contractor',
  },
];

const roleStyles: Record<UserRole, { activeBorder: string; activeBg: string; text: string; dot: string }> = {
  driver: {
    activeBorder: 'border-[#2563eb]',
    activeBg: 'bg-[#eff6ff]',
    text: 'text-[#1e40af]',
    dot: 'bg-[#2563eb]',
  },
  dispatcher: {
    activeBorder: 'border-[#c2410c]',
    activeBg: 'bg-[#fff7ed]',
    text: 'text-[#9a3412]',
    dot: 'bg-[#c2410c]',
  },
  sdma: {
    activeBorder: 'border-[#16a34a]',
    activeBg: 'bg-[#f0fdf4]',
    text: 'text-[#166534]',
    dot: 'bg-[#16a34a]',
  },
  contractor: {
    activeBorder: 'border-[#86198f]',
    activeBg: 'bg-[#fdf4ff]',
    text: 'text-[#86198f]',
    dot: 'bg-[#86198f]',
  },
};

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const { role } = useAppStore();

  const currentRole = roles.find((r) => r.id === role) || roles[0];
  const style = roleStyles[currentRole.id];

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Workspace</span>
        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Session
        </span>
      </div>
      <div
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left shadow-2xs',
          style.activeBg,
          style.activeBorder
        )}
      >
        <span className={cn('p-1.5 rounded-lg shrink-0', style.activeBg, style.text)}>
          {currentRole.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-bold leading-tight', style.text)}>
            {currentRole.title}
          </p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{currentRole.objective}</p>
        </div>
        <div className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />
      </div>
    </div>
  );
}
