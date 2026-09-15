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
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Fleet Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeVehicles.length} vehicles — North Eastern Region {affectedCount > 0 ? `· ${affectedCount} affected by active corridor disruptions` : ''}
              </p>
            </div>
          </div>
          {affectedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              {affectedCount} Disrupted
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
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
                  "border rounded-2xl p-4.5 shadow-2xs transition-all hover:shadow-xs",
                  isEmergency
                    ? "bg-amber-50/60 border-amber-200"
                    : isRerouted
                      ? "bg-blue-50/60 border-blue-200"
                      : isAffected
                        ? "bg-rose-50/60 border-rose-200"
                        : "bg-white border-slate-200/80"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900">{v.id}</p>
                      {isAffected && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white shadow-2xs">
                          AFFECTED
                        </span>
                      )}
                      {isRerouted && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white shadow-2xs">
                          REROUTED
                        </span>
                      )}
                      {isEmergency && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-600 text-white shadow-2xs">
                          EMERGENCY PICKUP
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{v.driverName}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{v.type}</p>
                  </div>
                  <RiskBadge level={v.riskLevel} size="sm" />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={cn('font-semibold', statusColors[v.status])}>
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
                    <div className="text-[11px] text-slate-700 font-medium truncate">
                      📦 {v.cargoType}
                    </div>
                  )}

                  {v.origin && v.destination && (
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{isRerouted ? (v.rerouteFromLabel || 'Current position') : v.origin}</span>
                      <span>→</span>
                      <span>{v.destination}</span>
                    </div>
                  )}

                  {v.etaMinutes && (
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{isRerouted ? 'New ETA' : 'ETA'} {formatEta(v.etaMinutes)}</span>
                    </div>
                  )}

                  {isAffected && (
                    <p className="text-[11px] font-bold text-rose-700">
                      Blocked: NH-2 Mao Gate · {v.plannedRouteId === 'route-b' ? 'Route B' : v.plannedRouteId}
                    </p>
                  )}

                  {v.impactReason && !isEmergency && (
                    <div className="mt-2 pt-2 border-t border-rose-200/80 text-[11px] text-rose-800 font-medium leading-relaxed flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{v.impactReason}</span>
                    </div>
                  )}

                  {isRerouted && (
                    <div className="mt-2 pt-2 border-t border-blue-200/80 text-[11px] text-blue-900 leading-snug space-y-0.5 font-medium">
                      <p className="font-bold text-blue-700">Reactive reroute</p>
                      <p>Avoiding NH-2 Mao Gate Segment</p>
                      <p>Alternate: {v.currentRoute === 'route-a' ? 'Route A — Safer' : v.currentRoute}</p>
                      <p className="text-slate-500 text-[10px]">Rerouted from current vehicle position.</p>
                    </div>
                  )}

                  {v.rerouteStatus === 'no_alternative' && !isEmergency && (
                    <div className="mt-2 space-y-2">
                      <p className="text-[11px] font-medium text-rose-900 bg-rose-50/80 border border-rose-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                        No alternate corridor from current position.
                      </p>
                      {v.recommendedGodownId && godown && (
                        <div className="text-[11px] text-amber-900 space-y-0.5 font-medium bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
                          <p className="font-bold text-amber-800">Recommended: {godown.name}</p>
                          <p>{v.recommendedGodownDistanceKm} km · {godown.availableStock} units available</p>
                        </div>
                      )}
                      {!v.recommendedGodownId && (
                        <Button
                          size="sm"
                          className="w-full rounded-xl shadow-2xs font-bold text-xs"
                          onClick={() => recommendEmergencyGodown(v.id)}
                          iconLeft={<Warehouse className="w-3.5 h-3.5" />}
                        >
                          Find Emergency Godown
                        </Button>
                      )}
                      {v.recommendedGodownId && !request && (
                        <Button size="sm" className="w-full rounded-xl shadow-2xs font-bold text-xs" onClick={() => requestEmergencyPickup(v.id)}>
                          Request Emergency Pickup
                        </Button>
                      )}
                      {request?.status === 'requested' && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-amber-800 font-semibold">
                            Awaiting contractor approval · {DEMO_PICKUP_QUANTITY} units
                          </p>
                          <div className="flex gap-1.5">
                            <Button size="sm" className="flex-1 rounded-xl shadow-2xs font-bold text-xs" onClick={() => approveEmergencyPickup(request.id)}>
                              Approve Pickup
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl shadow-2xs font-bold text-xs" onClick={() => declineEmergencyPickup(request.id)}>
                              Decline
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isEmergency && request && (
                    <div className="mt-2 pt-2 border-t border-amber-200/80 text-[11px] text-amber-900 leading-snug space-y-0.5 font-medium">
                      <p className="font-bold text-amber-800">Emergency pickup dispatched</p>
                      <p>{request.godownName}</p>
                      <p>{request.quantity} units reserved · {godown?.availableStock} remaining</p>
                      <p className="text-slate-500 text-[10px]">Destination notified: {request.destination}</p>
                    </div>
                  )}

                  {isAffected && v.rerouteStatus !== 'no_alternative' && (
                    <Button
                      size="sm"
                      className="w-full mt-2 rounded-xl shadow-2xs font-bold text-xs"
                      onClick={() => rerouteVehicle(v.id)}
                      iconLeft={<Navigation className="w-3.5 h-3.5" />}
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
