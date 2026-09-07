import { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore } from '@/store/networkStore';
import { useNavigate } from 'react-router-dom';
import { DriverVehicleSelector } from '@/components/ui/DriverVehicleSelector';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Truck,
  Activity,
  ShieldCheck,
  Warehouse,
  AlertTriangle,
  Check,
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
    online: { icon: <Wifi className="w-3.5 h-3.5" />, label: 'Network Connected', color: 'text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]' },
    offline: { icon: <WifiOff className="w-3.5 h-3.5" />, label: 'Offline Mode (Local IDB)', color: 'text-[#dc2626] bg-[#fef2f2] border-[#fecaca]' },
    syncing: { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: 'Syncing Queue...', color: 'text-[#d97706] bg-[#fffbeb] border-[#fde68a]' },
  };
  const cfg = config[status];

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-xs',
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
  const { role, setRole, networkStatus, setNetworkStatus, toggleSidebar, selectedDriverVehicleId } = useAppStore();
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const currentDriverVehicle =
    activeVehicles.find((v) => v.id === selectedDriverVehicleId) ||
    activeVehicles.find((v) => v.id === 'AS-01-J-4422') ||
    activeVehicles[0];
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [menuOpen]);

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
      title: 'Driver Journey Cockpit',
      roleName: 'Driver / Field Operator',
      subtitle: currentDriverVehicle
        ? `${currentDriverVehicle.driverName} · ${currentDriverVehicle.id}`
        : 'Arjun Baruah · AS-01-J-4422',
      description: 'Journey safety & field reporting',
      icon: <Truck className="w-3.5 h-3.5 text-[#2563eb]" />,
      badgeBg: 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]',
      path: '/driver',
    },
    dispatcher: {
      title: 'Operations Control Center',
      roleName: 'Fleet Dispatcher',
      subtitle: `${activeVehicles.length} Active Transports · Regional Grid`,
      description: 'Fleet monitoring & response',
      icon: <Activity className="w-3.5 h-3.5 text-[#c2410c]" />,
      badgeBg: 'bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]',
      path: '/dispatcher',
    },
    sdma: {
      title: 'Regional Accessibility & Disaster Intel',
      roleName: 'SDMA / Govt Authority',
      subtitle: 'State Disaster Management Authority',
      description: 'Verification & road status',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a]" />,
      badgeBg: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
      path: '/sdma',
    },
    contractor: {
      title: 'Emergency Supply Operations',
      roleName: 'Contractor / Supply Operator',
      subtitle: 'Regional Buffer & Godown Network',
      description: 'Emergency supply operations',
      icon: <Warehouse className="w-3.5 h-3.5 text-[#86198f]" />,
      badgeBg: 'bg-[#fdf4ff] text-[#86198f] border-[#f5d0fe]',
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

  const handleSelectRole = (r: UserRole, targetPath: string) => {
    setRole(r);
    setMenuOpen(false);
    navigate(targetPath);
  };

  return (
    <header
      className={cn(
        'relative z-50 h-13 bg-white border-b border-[#e4e4e3] flex items-center px-4 gap-3 shrink-0 select-none',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]',
        className
      )}
    >
      {/* Hamburger */}
      <button
        onClick={toggleSidebar}
        className="text-[#8a8a87] hover:text-[#1a1a19] transition-colors p-1.5 rounded-md hover:bg-[#f4f4f3]"
        aria-label="Toggle navigation menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {/* Brand Identity */}
      <div className="flex items-center gap-2">
        <div className="w-6.5 h-6.5 bg-[#1a1a19] rounded-md flex items-center justify-center shadow-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="text-sm font-bold text-[#1a1a19] tracking-tight">NER-LOGIX</span>
      </div>

      <div className="hidden sm:flex items-center text-[#c4c4c2]">
        <ChevronRight className="w-3.5 h-3.5" />
      </div>

      {/* Role Context & Secondary Workspace Switcher */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
            currentWorkspace.badgeBg,
            'hover:opacity-90 hover:shadow-xs'
          )}
          title="Switch operational workspace"
        >
          {currentWorkspace.icon}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">{currentWorkspace.title}</span>
            <span className="hidden md:inline font-normal opacity-70">· {currentWorkspace.subtitle}</span>
          </div>
          <ChevronDown className={cn('w-3.5 h-3.5 opacity-60 transition-transform ml-0.5', menuOpen && 'rotate-180')} />
        </button>

        {/* Floating Switcher Dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              role="menu"
              aria-label="Workspace Switcher"
              className="absolute left-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-[#e4e4e3] shadow-lg py-1 z-50 overflow-hidden"
            >
              <div className="px-3.5 py-2 bg-[#fafaf9] border-b border-[#f4f4f3]">
                <p className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
                  Operational Workspace
                </p>
              </div>

              <div className="py-1">
                {(Object.keys(roleConfigs) as UserRole[]).map((roleKey) => {
                  const item = roleConfigs[roleKey];
                  const isSelected = role === roleKey;
                  return (
                    <button
                      key={roleKey}
                      role="menuitem"
                      onClick={() => handleSelectRole(roleKey, item.path)}
                      className={cn(
                        'w-full flex items-start gap-2.5 px-3.5 py-2 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-[#f4f4f3]' : 'hover:bg-[#fafaf9]'
                      )}
                    >
                      <div className={cn(
                        'mt-0.5 shrink-0 p-1.5 rounded-md border shadow-2xs',
                        isSelected ? 'bg-white border-[#d4d4d2]' : 'bg-[#fafaf9] border-[#e4e4e3]'
                      )}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn('text-xs font-semibold', isSelected ? 'text-[#1a1a19]' : 'text-[#2a2a28]')}>
                            {item.roleName}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[#71717a] leading-tight mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Driver Workspace Vehicle Selector */}
      {role === 'driver' && (
        <div className="flex items-center gap-2">
          <div className="hidden sm:block h-4 w-px bg-[#e4e4e3]" />
          <DriverVehicleSelector id="topbar-driver-vehicle-selector" />
        </div>
      )}

      <div className="flex-1" />

      {/* Global Status Bar */}
      <div className="flex items-center gap-2.5">
        {affectedCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{affectedCount} Disruption Impact{affectedCount > 1 ? 's' : ''}</span>
          </div>
        )}

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

        {/* Region */}
        <div className="hidden xl:block text-xs text-[#8a8a87] pl-2.5 border-l border-[#e4e4e3]">
          North Eastern Corridor
        </div>
      </div>
    </header>
  );
}
