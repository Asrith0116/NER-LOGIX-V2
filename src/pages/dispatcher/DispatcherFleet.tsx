import { useEffect } from 'react';
import { useNetworkStore, DEMO_PICKUP_QUANTITY } from '@/store/networkStore';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatEta, getVehicleStatusLabel } from '@/utils';
import { cn } from '@/utils';
import { Truck, MapPin, Clock, AlertTriangle, Navigation, Warehouse } from 'lucide-react';

const statusColors: Record<string, string> = {
  on_route: 'text-[#2563eb]',
  idle: 'text-[#8a8a87]',
  disrupted: 'text-[#dc2626]',
  offline: 'text-[#8a8a87]',
  emergency_pickup: 'text-[#c2410c]',
};

export function DispatcherFleet() {
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const godowns = useNetworkStore((state) => state.godowns);
  const pickupRequests = useNetworkStore((state) => state.pickupRequests);
  const syncFromIndexedDB = useNetworkStore((state) => state.syncFromIndexedDB);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const recommendEmergencyGodown = useNetworkStore((state) => state.recommendEmergencyGodown);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);
  const approveEmergencyPickup = useNetworkStore((state) => state.approveEmergencyPickup);
  const declineEmergencyPickup = useNetworkStore((state) => state.declineEmergencyPickup);

  useEffect(() => {
    syncFromIndexedDB();
  }, [syncFromIndexedDB]);

  const affectedCount = activeVehicles.filter(
    (v) =>
      Boolean(v.affectedByDisruptionId) &&
      v.rerouteStatus !== 'active' &&
      v.status !== 'emergency_pickup'
  ).length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 bg-white border-b border-[#e4e4e3]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#8a8a87]" />
            <h1 className="text-base font-semibold text-[#1a1a19]">Fleet Management</h1>
          </div>
          {affectedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]">
              {affectedCount} Disrupted
            </span>
          )}
        </div>
        <p className="text-xs text-[#8a8a87] mt-0.5">
          {activeVehicles.length} vehicles — North Eastern Region {affectedCount > 0 ? `· ${affectedCount} affected by active corridor disruptions` : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
          {activeVehicles.map((v) => {
            const isEmergency = v.status === 'emergency_pickup';
            const isAffected = Boolean(v.affectedByDisruptionId) && v.rerouteStatus !== 'active' && !isEmergency;
            const isRerouted = v.rerouteStatus === 'active';
            const request = pickupRequests.find((r) => r.vehicleId === v.id);
            const godown = godowns.find((g) => g.id === (v.recommendedGodownId || request?.godownId));
            return (
              <div
                key={v.id}
                className={cn(
                  "border rounded-lg p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] transition-all",
                  isEmergency
                    ? "bg-[#fffbeb] border-[#fdba74]"
                    : isRerouted
                      ? "bg-[#f8fbff] border-[#bfdbfe]"
                      : isAffected
                        ? "bg-[#fffbfb] border-[#fca5a5]"
                        : "bg-white border-[#e4e4e3]"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[#1a1a19]">{v.id}</p>
                      {isAffected && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#dc2626] text-white">
                          AFFECTED
                        </span>
                      )}
                      {isRerouted && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#2563eb] text-white">
                          REROUTED
                        </span>
                      )}
                      {isEmergency && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#c2410c] text-white">
                          EMERGENCY PICKUP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5a5a57]">{v.driverName}</p>
                    <p className="text-[11px] text-[#8a8a87]">{v.type}</p>
                  </div>
                  <RiskBadge level={v.riskLevel} size="sm" />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={cn('font-medium', statusColors[v.status])}>
                      {getVehicleStatusLabel(v.status)}
                    </span>
                    {isAffected && (
                      <StatusBadge label="Disrupted" variant="danger" pulse />
                    )}
                    {isRerouted && (
                      <StatusBadge label="Rerouted" variant="info" />
                    )}
                    {isEmergency && (
                      <StatusBadge label="Dispatched" variant="success" />
                    )}
                  </div>

                  {v.cargoType && (
                    <div className="text-[11px] text-[#4b5563] font-medium truncate">
                      📦 {v.cargoType}
                    </div>
                  )}

                  {v.origin && v.destination && (
                    <div className="flex items-center gap-1 text-[#8a8a87]">
                      <MapPin className="w-3 h-3" />
                      <span>{isRerouted ? (v.rerouteFromLabel || 'Current position') : v.origin}</span>
                      <span>→</span>
                      <span>{v.destination}</span>
                    </div>
                  )}

                  {v.etaMinutes && (
                    <div className="flex items-center gap-1 text-[#8a8a87]">
                      <Clock className="w-3 h-3" />
                      <span>{isRerouted ? 'New ETA' : 'ETA'} {formatEta(v.etaMinutes)}</span>
                    </div>
                  )}

                  {isAffected && (
                    <p className="text-[10px] text-[#7f1d1d]">
                      Blocked: NH-2 Mao Gate · {v.plannedRouteId === 'route-b' ? 'Route B' : v.plannedRouteId}
                    </p>
                  )}

                  {v.impactReason && !isEmergency && (
                    <div className="mt-2 pt-2 border-t border-[#fee2e2] text-[10px] text-[#b91c1c] font-medium leading-tight flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#dc2626] shrink-0 mt-0.5" />
                      <span>{v.impactReason}</span>
                    </div>
                  )}

                  {isRerouted && (
                    <div className="mt-2 pt-2 border-t border-[#dbeafe] text-[10px] text-[#1e40af] leading-snug space-y-0.5">
                      <p className="font-semibold">Reactive reroute</p>
                      <p>Avoiding NH-2 Mao Gate Segment</p>
                      <p>Alternate: {v.currentRoute === 'route-a' ? 'Route A — Safer' : v.currentRoute}</p>
                      <p>Rerouted from current vehicle position.</p>
                    </div>
                  )}

                  {v.rerouteStatus === 'no_alternative' && !isEmergency && (
                    <div className="mt-2 space-y-2">
                      <p className="text-[10px] font-medium text-[#7f1d1d] bg-[#fef2f2] border border-[#fecaca] rounded px-2 py-1.5">
                        No alternate corridor from current position.
                      </p>
                      {v.recommendedGodownId && godown && (
                        <div className="text-[10px] text-[#9a3412] space-y-0.5">
                          <p className="font-semibold">Recommended: {godown.name}</p>
                          <p>{v.recommendedGodownDistanceKm} km · {godown.availableStock} units available</p>
                        </div>
                      )}
                      {!v.recommendedGodownId && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => recommendEmergencyGodown(v.id)}
                          iconLeft={<Warehouse className="w-3 h-3" />}
                        >
                          Find Emergency Godown
                        </Button>
                      )}
                      {v.recommendedGodownId && !request && (
                        <Button size="sm" className="w-full" onClick={() => requestEmergencyPickup(v.id)}>
                          Request Emergency Pickup
                        </Button>
                      )}
                      {request?.status === 'requested' && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-[#92400e] font-medium">
                            Awaiting contractor approval · {DEMO_PICKUP_QUANTITY} units
                          </p>
                          <div className="flex gap-1.5">
                            <Button size="sm" className="flex-1" onClick={() => approveEmergencyPickup(request.id)}>
                              Approve Pickup
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => declineEmergencyPickup(request.id)}>
                              Decline
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isEmergency && request && (
                    <div className="mt-2 pt-2 border-t border-[#fed7aa] text-[10px] text-[#9a3412] leading-snug space-y-0.5">
                      <p className="font-semibold">Emergency pickup dispatched</p>
                      <p>{request.godownName}</p>
                      <p>{request.quantity} units reserved · {godown?.availableStock} remaining</p>
                      <p>Destination notified: {request.destination}</p>
                    </div>
                  )}

                  {isAffected && v.rerouteStatus !== 'no_alternative' && (
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => rerouteVehicle(v.id)}
                      iconLeft={<Navigation className="w-3 h-3" />}
                    >
                      Find Alternate
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
