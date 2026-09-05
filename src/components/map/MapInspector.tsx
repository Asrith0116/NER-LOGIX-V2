import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Truck, Navigation, Warehouse, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Incident, Vehicle, RoadSegment, Godown, Route, UserRole } from '@/types';
import { formatEta, formatTimeAgo, getIncidentTypeLabel } from '@/utils';

export type SelectedMapEntity =
  | { type: 'incident'; data: Incident }
  | { type: 'vehicle'; data: Vehicle }
  | { type: 'road'; data: RoadSegment }
  | { type: 'godown'; data: Godown }
  | { type: 'route'; data: Route };

interface MapInspectorProps {
  entity: SelectedMapEntity | null;
  onClose: () => void;
  onRerouteVehicle?: (vehicleId: string) => void;
  onRequestEmergencyPickup?: (vehicleId: string) => void;
  onVerifyIncident?: (incidentId: string, approved: boolean) => void;
  userRole?: UserRole;
}

export function MapInspector({
  entity,
  onClose,
  onRerouteVehicle,
  onRequestEmergencyPickup,
  onVerifyIncident,
  userRole = 'dispatcher',
}: MapInspectorProps) {
  if (!entity) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white/95 backdrop-blur-md rounded-xl border border-[#d4d4d2] shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 z-[1000] text-[#1a1a19]"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#e4e4e3]">
          <div className="flex items-center gap-2.5">
            {entity.type === 'incident' && (
              <div className="w-8 h-8 rounded-lg bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center text-[#dc2626]">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            {entity.type === 'vehicle' && (
              <div className="w-8 h-8 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center text-[#2563eb]">
                <Truck className="w-4 h-4" />
              </div>
            )}
            {entity.type === 'road' && (
              <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#16a34a]">
                <Navigation className="w-4 h-4" />
              </div>
            )}
            {entity.type === 'godown' && (
              <div className="w-8 h-8 rounded-lg bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center text-[#ea580c]">
                <Warehouse className="w-4 h-4" />
              </div>
            )}
            {entity.type === 'route' && (
              <div className="w-8 h-8 rounded-lg bg-[#faf5ff] border border-[#e9d5ff] flex items-center justify-center text-[#9333ea]">
                <Navigation className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#8a8a87]">
                  {entity.type === 'road' ? 'Road Corridor Segment' : entity.type.toUpperCase()}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#1a1a19]">
                {entity.type === 'incident' && getIncidentTypeLabel(entity.data.type)}
                {entity.type === 'vehicle' && `${entity.data.id} · ${entity.data.driverName}`}
                {entity.type === 'road' && entity.data.name}
                {entity.type === 'godown' && entity.data.name}
                {entity.type === 'route' && entity.data.label}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#8a8a87] hover:text-[#1a1a19] hover:bg-[#f4f4f3] transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-3 text-xs space-y-2.5">
          {/* INCIDENT DETAILS */}
          {entity.type === 'incident' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Verification Status:</span>
                <StatusBadge syncStatus={entity.data.syncStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Location:</span>
                <span className="font-medium text-[#1a1a19]">{entity.data.locationName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Severity Level:</span>
                <RiskBadge level={entity.data.severity === 'critical' ? 'blocked' : entity.data.severity} size="sm" />
              </div>
              {entity.data.description && (
                <div className="p-2.5 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3] text-[#5a5a57] text-[11px] leading-relaxed">
                  {entity.data.description}
                </div>
              )}
              <div className="text-[11px] text-[#8a8a87] flex items-center justify-between">
                <span>Reported: {formatTimeAgo(entity.data.reportedAt)}</span>
                <span>By: {entity.data.reportedBy}</span>
              </div>

              {userRole === 'sdma' && entity.data.syncStatus !== 'verified' && onVerifyIncident && (
                <div className="pt-2 flex gap-2 border-t border-[#e4e4e3]">
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1 text-xs"
                    onClick={() => onVerifyIncident(entity.data.id, true)}
                    iconLeft={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Verify & Enforce Closure
                  </Button>
                </div>
              )}
            </>
          )}

          {/* VEHICLE DETAILS */}
          {entity.type === 'vehicle' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Operational Status:</span>
                <StatusBadge
                  label={
                    entity.data.status === 'emergency_pickup'
                      ? 'Emergency Storage Secured'
                      : entity.data.rerouteStatus === 'active'
                        ? 'Rerouted'
                        : entity.data.affectedByDisruptionId
                          ? 'Disrupted Ahead'
                          : 'On Journey'
                  }
                  variant={
                    entity.data.status === 'emergency_pickup'
                      ? 'success'
                      : entity.data.rerouteStatus === 'active'
                        ? 'info'
                        : entity.data.affectedByDisruptionId
                          ? 'danger'
                          : 'success'
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Corridor Journey:</span>
                <span className="font-medium text-[#1a1a19] flex items-center gap-1">
                  {entity.data.origin} <ArrowRight className="w-3 h-3 text-[#8a8a87]" /> {entity.data.destination}
                </span>
              </div>
              {entity.data.cargoType && (
                <div className="flex items-center justify-between">
                  <span className="text-[#8a8a87]">Consignment Cargo:</span>
                  <span className="font-medium text-[#1a1a19]">📦 {entity.data.cargoType}</span>
                </div>
              )}
              {entity.data.etaMinutes && (
                <div className="flex items-center justify-between">
                  <span className="text-[#8a8a87]">Current ETA:</span>
                  <span className="font-semibold text-[#1a1a19]">{formatEta(entity.data.etaMinutes)}</span>
                </div>
              )}
              {entity.data.impactReason && (
                <div className="p-2.5 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-[11px] leading-relaxed flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{entity.data.impactReason}</span>
                </div>
              )}

              {/* Action Buttons for vehicle */}
              {entity.data.affectedByDisruptionId && entity.data.rerouteStatus !== 'active' && onRerouteVehicle && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs"
                    onClick={() => onRerouteVehicle(entity.data.id)}
                    iconLeft={<Navigation className="w-3.5 h-3.5" />}
                  >
                    Calculate & Start Reroute
                  </Button>
                </div>
              )}
              {entity.data.rerouteStatus === 'no_alternative' && onRequestEmergencyPickup && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="danger"
                    className="w-full text-xs"
                    onClick={() => onRequestEmergencyPickup(entity.data.id)}
                    iconLeft={<Warehouse className="w-3.5 h-3.5" />}
                  >
                    Request Emergency Godown Fallback
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ROAD SEGMENT DETAILS */}
          {entity.type === 'road' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Highway Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    entity.data.status === 'blocked'
                      ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                      : entity.data.status === 'caution'
                        ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'
                        : 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]'
                  }`}
                >
                  {entity.data.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Corridor Span:</span>
                <span className="font-medium text-[#1a1a19]">
                  {entity.data.fromLocation} → {entity.data.toLocation}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Segment Classification:</span>
                <span className="font-medium text-[#1a1a19]">Regional Mountain Corridor</span>
              </div>
              {entity.data.affectedByIncidentId && (
                <div className="p-2.5 rounded-lg bg-[#fff8f8] border border-[#fca5a5] text-[#991b1b] text-[11px]">
                  <strong>Active Disruption:</strong> Blocked by official SDMA report ({entity.data.affectedByIncidentId})
                </div>
              )}
            </>
          )}

          {/* GODOWN DETAILS */}
          {entity.type === 'godown' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Facility Location:</span>
                <span className="font-medium text-[#1a1a19]">{entity.data.locationLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Stock Availability:</span>
                <span className="font-bold text-[#16a34a]">{entity.data.availableStock} Units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Suitable Consignments:</span>
                <span className="text-[11px] font-medium text-[#1a1a19]">
                  {entity.data.suitableCargoTypes.join(', ')}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[11px] text-[#c2410c]">
                Emergency fallback point for stranded cold-chain & essential medical relief freight.
              </div>
            </>
          )}

          {/* ROUTE DETAILS */}
          {entity.type === 'route' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Route Assessment:</span>
                <RiskBadge level={entity.data.riskLevel} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Estimated Travel Time:</span>
                <span className="font-semibold text-[#1a1a19]">{formatEta(entity.data.etaMinutes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Total Distance:</span>
                <span className="font-medium text-[#1a1a19]">{entity.data.distanceKm} km</span>
              </div>
              <div className="p-2 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3] text-[11px] text-[#5a5a57]">
                {entity.data.description}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
