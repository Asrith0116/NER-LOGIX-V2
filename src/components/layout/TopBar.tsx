import { cn } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore } from '@/store/networkStore';
import { useAuthStore } from '@/store/authStore';
import { useCurrentDriver } from '@/hooks/useCurrentDriver';
import { useNavigate } from 'react-router-dom';
import { DriverVehicleSelector } from '@/components/ui/DriverVehicleSelector';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  Truck,
  Activity,
  ShieldCheck,
  Warehouse,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import type { NetworkStatus, UserRole } from '@/types';

function NetworkIndicator({
  status,
  onToggle,
}: {
  status: NetworkStatus;
  onToggle: () => void;
}) {
  const config = {
    online: { icon: <Wifi className="w-3.5 h-3.5" />, label: 'Network Connected', color: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/80' },
    offline: { icon: <WifiOff className="w-3.5 h-3.5" />, label: 'Offline Mode (Local IDB)', color: 'text-rose-700 bg-rose-50/90 border-rose-200/80' },
    syncing: { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: 'Syncing Queue...', color: 'text-amber-700 bg-amber-50/90 border-amber-200/80' },
  };
  const cfg = config[status];

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shadow-2xs hover:opacity-90 active:scale-[0.98]',
        cfg.color
      )}
      title="Toggle Network Simulation (Online / Offline IDB cache)"
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </button>
  );
}

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const role = useAppStore((state) => state.role);
  const networkStatus = useAppStore((state) => state.networkStatus);
  const setNetworkStatus = useAppStore((state) => state.setNetworkStatus);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const backendStatus = useAppStore((state) => state.backendStatus);
  const checkBackendConnection = useAppStore((state) => state.checkBackendConnection);

  const { user, logout } = useAuthStore();
  const currentDriver = useCurrentDriver();

  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const navigate = useNavigate();

  const roleConfigs: Record<UserRole, {
    title: string;
    roleName: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    badgeBg: string;
    path: string;
  }> = {
    driver: {
      title: 'Driver Cockpit',
      roleName: 'Driver / Field Operator',
      subtitle: 'Field Operations',
      description: 'Journey safety & field reporting',
      icon: <Truck className="w-3.5 h-3.5 text-blue-600" />,
      badgeBg: 'bg-blue-50/90 text-blue-700 border-blue-200/80 shadow-2xs',
      path: '/driver',
    },
    dispatcher: {
      title: 'Operations Control',
      roleName: 'Fleet Dispatcher',
      subtitle: `${activeVehicles.length} Transports Active`,
      description: 'Fleet monitoring & response',
      icon: <Activity className="w-3.5 h-3.5 text-emerald-600" />,
      badgeBg: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 shadow-2xs',
      path: '/dispatcher',
    },
    sdma: {
      title: 'SDMA Authority',
      roleName: 'SDMA / Govt Authority',
      subtitle: 'Disaster Management Authority',
      description: 'Verification & road status',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />,
      badgeBg: 'bg-purple-50/90 text-purple-700 border-purple-200/80 shadow-2xs',
      path: '/sdma',
    },
    contractor: {
      title: 'Supply Operations',
      roleName: 'Contractor / Supply Operator',
      subtitle: 'Godown & Relief Buffer',
      description: 'Emergency supply operations',
      icon: <Warehouse className="w-3.5 h-3.5 text-amber-600" />,
      badgeBg: 'bg-amber-50/90 text-amber-700 border-amber-200/80 shadow-2xs',
      path: '/contractor',
    },
  };

  const currentWorkspace = roleConfigs[role] || roleConfigs.driver;

  const affectedCount = activeVehicles.filter(
    (v) => Boolean(v.affectedByDisruptionId) && v.rerouteStatus !== 'active' && v.status !== 'emergency_pickup'
  ).length;

  const handleNetworkToggle = () => {
    if (networkStatus === 'online') {
      setNetworkStatus('offline');
    } else if (networkStatus === 'offline') {
      setNetworkStatus('syncing');
      setTimeout(() => {
        setNetworkStatus('online');
      }, 1200);
    } else {
      setNetworkStatus('online');
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'relative z-50 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center px-4 sm:px-5 gap-3 shrink-0 select-none',
        'shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]',
        className
      )}
    >
      {/* Hamburger */}
      <button
        onClick={toggleSidebar}
        className="text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {/* Brand Identity */}
      <BrandLogo size="md" onClick={() => navigate('/')} className="cursor-pointer" />

      <div className="hidden sm:flex items-center text-slate-300">
        <ChevronRight className="w-3.5 h-3.5" />
      </div>

      {/* Role Context Display (Static Role Indicator) */}
      <div className="shrink-0">
        <div
          className={cn(
            'flex items-center gap-2 h-8.5 px-3 rounded-xl border text-xs font-semibold whitespace-nowrap shadow-2xs',
            currentWorkspace.badgeBg
          )}
        >
          {currentWorkspace.icon}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold">{currentWorkspace.title}</span>
            <span className="hidden md:inline font-normal opacity-75 truncate max-w-[140px] lg:max-w-[200px]">
              · {currentWorkspace.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Driver Workspace Single Vehicle Identity Selector */}
      {role === 'driver' && (
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center text-slate-300">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
          <DriverVehicleSelector id="topbar-driver-vehicle-selector" compact />
        </div>
      )}

      <div className="flex-1" />

      {/* Global Status Bar */}
      <div className="flex items-center gap-2.5">
        {affectedCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 h-8.5 px-3 rounded-xl bg-rose-50/90 border border-rose-200/80 text-rose-700 text-xs font-semibold whitespace-nowrap shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>{affectedCount} Disruption Impact{affectedCount > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Backend Connectivity Status (Subtle) */}
        <button
          onClick={() => checkBackendConnection()}
          className={cn(
            'hidden lg:flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-[11px] font-medium border transition-all cursor-pointer shadow-2xs whitespace-nowrap',
            backendStatus === 'connected'
              ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80'
              : backendStatus === 'checking'
              ? 'bg-amber-50/90 text-amber-800 border-amber-200/80'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          )}
          title="FastAPI Backend Status (Click to test connectivity)"
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              backendStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : backendStatus === 'checking'
                ? 'bg-amber-500 animate-spin'
                : 'bg-slate-400'
            )}
          />
          <span>
            {backendStatus === 'connected'
              ? 'Backend: Connected'
              : backendStatus === 'checking'
              ? 'Probing API...'
              : 'Local Engine (Active)'}
          </span>
        </button>

        {/* Network Toggle */}
        <AnimatePresence mode="wait">
          <motion.div
            key={networkStatus}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <NetworkIndicator status={networkStatus} onToggle={handleNetworkToggle} />
          </motion.div>
        </AnimatePresence>

        {/* User Authenticated Profile & Logout */}
        {(user || role === 'driver') && (
          <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {role === 'driver' ? currentDriver.driverName : user?.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono leading-tight">
                {role === 'driver' ? `DRIVER · ${currentDriver.vehicleId}` : user?.role.toUpperCase()}
              </span>
            </div>
            {user && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:text-rose-700 hover:bg-rose-50/80 border border-slate-200/80 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="Sign Out of Session"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
