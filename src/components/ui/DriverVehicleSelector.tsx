import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore } from '@/store/networkStore';
import type { Vehicle } from '@/types';
import {
  Truck,
  ChevronDown,
  AlertTriangle,
  Check,
  Navigation,
} from 'lucide-react';
import { cn } from '@/utils';

interface DriverVehicleSelectorProps {
  id?: string;
  className?: string;
  compact?: boolean;
}

export function DriverVehicleSelector({
  id = 'driver-vehicle-selector',
  className,
  compact = false,
}: DriverVehicleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDriverVehicleId = useAppStore((state) => state.selectedDriverVehicleId);
  const setSelectedDriverVehicleId = useAppStore((state) => state.setSelectedDriverVehicleId);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);

  // Fallback safely to existing vehicle if selected is invalid
  const currentVehicle: Vehicle =
    activeVehicles.find((v) => v.id === selectedDriverVehicleId) ||
    activeVehicles.find((v) => v.id === 'AS-01-J-4422') ||
    activeVehicles[0];

  // Check if any vehicle in fleet is affected
  const affectedVehicles = activeVehicles.filter(
    (v) => Boolean(v.affectedByDisruptionId) || v.riskLevel === 'high' || v.status === 'disrupted'
  );

  const isCurrentAffected =
    Boolean(currentVehicle?.affectedByDisruptionId) ||
    currentVehicle?.riskLevel === 'high' ||
    currentVehicle?.status === 'disrupted';

  const otherAffectedCount = affectedVehicles.filter((v) => v.id !== currentVehicle?.id).length;

  // Handle outside click & escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleSelect = (vehicleId: string) => {
    setSelectedDriverVehicleId(vehicleId);
    setIsOpen(false);
  };

  const getStatusDisplay = (v: Vehicle) => {
    if (v.rerouteStatus === 'active') {
      return { label: 'Rerouted (Detour Active)', color: 'text-[#1e40af] bg-[#eff6ff] border-[#bfdbfe]' };
    }
    if (v.status === 'emergency_pickup') {
      return { label: 'Emergency Godown', color: 'text-[#166534] bg-[#f0fdf4] border-[#bbf7d0]' };
    }
    if (v.rerouteStatus === 'no_alternative') {
      return { label: 'No Alternative', color: 'text-[#9a3412] bg-[#fff7ed] border-[#fed7aa]' };
    }
    if (Boolean(v.affectedByDisruptionId) || v.status === 'disrupted' || v.riskLevel === 'high') {
      return { label: 'Disrupted Ahead', color: 'text-[#991b1b] bg-[#fef2f2] border-[#fca5a5]' };
    }
    if (v.status === 'on_route') {
      return { label: 'On Route', color: 'text-[#166534] bg-[#f0fdf4] border-[#bbf7d0]' };
    }
    return { label: 'Idle / Staged', color: 'text-[#5a5a57] bg-[#f4f4f3] border-[#e4e4e3]' };
  };

  if (!currentVehicle) return null;

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        id={`${id}-button`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select Driver Vehicle. Currently selected: ${currentVehicle.id} driven by ${currentVehicle.driverName}`}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all cursor-pointer shadow-2xs select-none',
          isCurrentAffected
            ? 'bg-[#fef2f2] border-[#fca5a5] text-[#991b1b] hover:bg-[#fee2e2]'
            : 'bg-white border-[#e4e4e3] text-[#1a1a19] hover:bg-[#fafaf9] hover:border-[#d4d4d2]'
        )}
      >
        <div
          className={cn(
            'w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-white shadow-2xs',
            isCurrentAffected ? 'bg-[#dc2626]' : 'bg-[#2563eb]'
          )}
        >
          {isCurrentAffected ? <AlertTriangle className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
        </div>

        <div className="flex items-center gap-1.5 text-left min-w-0">
          {!compact && (
            <span className="text-[10px] uppercase font-bold text-[#8a8a87] tracking-wider hidden sm:inline">
              Vehicle:
            </span>
          )}
          <span className="font-bold text-xs tracking-tight font-mono text-[#1a1a19]">
            {currentVehicle.id}
          </span>
          <span className="text-[#8a8a87] hidden md:inline">·</span>
          <span className="text-xs font-semibold text-[#5a5a57] truncate max-w-[110px] hidden md:inline">
            {currentVehicle.driverName}
          </span>
        </div>

        {/* Highlight badge for affected status */}
        {isCurrentAffected && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#dc2626] text-white tracking-wide uppercase shrink-0">
            Affected
          </span>
        )}

        {/* Highlight notification if another vehicle is disrupted */}
        {!isCurrentAffected && otherAffectedCount > 0 && (
          <span
            className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] tracking-wide shrink-0 animate-pulse"
            title={`${otherAffectedCount} other vehicle affected by road disruption`}
          >
            {otherAffectedCount} disrupted
          </span>
        )}

        <ChevronDown className={cn('w-3.5 h-3.5 text-[#8a8a87] transition-transform ml-0.5 shrink-0', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            id={`${id}-menu`}
            role="listbox"
            aria-label="Available Driver Vehicles"
            className="absolute left-0 sm:right-auto sm:left-0 top-full mt-1.5 w-84 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-[#e4e4e3] shadow-xl py-1.5 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-3.5 py-2 bg-[#fafaf9] border-b border-[#f4f4f3] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
                  Active Driver Vehicle
                </p>
                <p className="text-[11px] text-[#5a5a57]">
                  Select vehicle to operate in Driver Cockpit & Navigation
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#8a8a87] bg-white px-1.5 py-0.5 rounded border border-[#e4e4e3]">
                {activeVehicles.length} transports
              </span>
            </div>

            {/* List */}
            <div className="py-1 max-h-80 overflow-y-auto divide-y divide-[#f4f4f3]">
              {activeVehicles.map((v) => {
                const isSelected = v.id === currentVehicle.id;
                const isAffected =
                  Boolean(v.affectedByDisruptionId) || v.riskLevel === 'high' || v.status === 'disrupted';
                const isRerouted = v.rerouteStatus === 'active';
                const statusInfo = getStatusDisplay(v);

                return (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(v.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer',
                      isSelected ? 'bg-[#f0f7ff]' : 'hover:bg-[#fafaf9]',
                      isAffected && !isSelected && 'bg-[#fff8f8] hover:bg-[#fee2e2]/60'
                    )}
                  >
                    {/* Left Icon */}
                    <div
                      className={cn(
                        'mt-0.5 shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center shadow-2xs',
                        isAffected
                          ? 'bg-[#fef2f2] border-[#fca5a5] text-[#dc2626]'
                          : isRerouted
                            ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]'
                            : isSelected
                              ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]'
                              : 'bg-[#fafaf9] border-[#e4e4e3] text-[#5a5a57]'
                      )}
                    >
                      {isAffected ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : isRerouted ? (
                        <Navigation className="w-3.5 h-3.5" />
                      ) : (
                        <Truck className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs font-mono text-[#1a1a19]">{v.id}</span>
                          <span className="text-[#8a8a87]">·</span>
                          <span className="text-xs font-semibold text-[#1a1a19]">{v.driverName}</span>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-[#2563eb] shrink-0" />}
                      </div>

                      {/* Status Badges Row */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.2 rounded border',
                            statusInfo.color
                          )}
                        >
                          {statusInfo.label}
                        </span>

                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.2 rounded border',
                            v.riskLevel === 'high' || v.riskLevel === 'blocked'
                              ? 'bg-[#fef2f2] text-[#991b1b] border-[#fca5a5]'
                              : v.riskLevel === 'moderate'
                                ? 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
                                : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                          )}
                        >
                          {v.riskLevel === 'high' ? 'High Risk' : v.riskLevel === 'moderate' ? 'Moderate' : 'Low Risk'}
                        </span>

                        {isAffected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#dc2626] text-white">
                            AFFECTED
                          </span>
                        )}
                      </div>

                      {/* Corridor / Cargo info */}
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[#5a5a57]">
                        <span className="truncate">
                          {v.origin || 'Guwahati'} → {v.destination || 'Imphal'}
                        </span>
                        <span className="text-[10px] text-[#8a8a87] shrink-0 font-medium ml-2">
                          {v.cargoType ? v.cargoType.slice(0, 24) : v.type}
                        </span>
                      </div>

                      {/* Specific Disruption reason note */}
                      {isAffected && v.impactReason && (
                        <p className="mt-1 text-[10px] font-medium text-[#991b1b] bg-[#fee2e2]/70 px-1.5 py-0.5 rounded border border-[#fca5a5]">
                          ⚠ {v.impactReason}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Presentation Tip */}
            <div className="px-3.5 py-1.5 bg-[#fafaf9] border-t border-[#f4f4f3] text-[10px] text-[#8a8a87] flex items-center justify-between">
              <span>Driver identity switches dynamically</span>
              <span className="font-semibold text-[#2563eb]">Presentation Mode</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
