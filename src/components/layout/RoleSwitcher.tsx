import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  const { role, setRole } = useAppStore();
  const navigate = useNavigate();

  const handleRoleChange = (r: UserRole, to: string) => {
    setRole(r);
    navigate(to);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">Role Workspace</span>
        <span className="text-[10px] text-[#8a8a87] font-medium">Switch anytime</span>
      </div>
      {roles.map((r) => {
        const isActive = role === r.id;
        const style = roleStyles[r.id];
        return (
          <motion.button
            key={r.id}
            onClick={() => handleRoleChange(r.id, r.to)}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all duration-150 cursor-pointer',
              isActive
                ? `${style.activeBg} ${style.activeBorder} shadow-sm`
                : 'bg-white border-[#e4e4e3] hover:bg-[#f8f8f7] text-[#5a5a57]'
            )}
          >
            <span className={cn('p-1.5 rounded-md shrink-0', isActive ? `${style.activeBg} ${style.text}` : 'bg-[#f4f4f3] text-[#8a8a87]')}>
              {r.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-xs font-semibold leading-tight', isActive ? style.text : 'text-[#1a1a19]')}>
                {r.title}
              </p>
              <p className="text-[10px] text-[#8a8a87] truncate mt-0.5">{r.objective}</p>
            </div>
            {isActive && (
              <motion.div
                layoutId="activeRoleIndicator"
                className={cn('w-2 h-2 rounded-full shrink-0', style.dot)}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
