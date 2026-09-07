import { useState } from 'react';
import {
  useNetworkStore,
  getReactiveDisplayRoute,
  findNearestSuitableGodown,
} from '@/store/networkStore';
import { DEMO_ROUTES } from '@/data/demo';
import type { Route } from '@/types';
import { MapContainer } from '@/components/map/MapContainer';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatEta, getIncidentTypeLabel, cn } from '@/utils';
import {
  Truck,
  AlertTriangle,
  Activity,
  Navigation,
  Warehouse,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export function DispatcherOps() {
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const disruptions = useNetworkStore((state) => state.disruptions);
  const godowns = useNetworkStore((state) => state.godowns);
  const pickupRequests = useNetworkStore((state) => state.pickupRequests);

  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);

  const [activeTab, setActiveTab] = useState<'interventions' | 'fleet' | 'hazards'>('interventions');
  const [fleetFilter, setFleetFilter] = useState<'all' | 'affected' | 'rerouted'>('all');

  // Filtered collections
  const activeDisruptions = disruptions.filter((d) => d.status === 'active');
  const affectedVehicles = activeVehicles.filter(
    (v) => Boolean(v.affectedByDisruptionId) && v.rerouteStatus !== 'active' && v.status !== 'emergency_pickup'
  );
  const reroutedVehicles = activeVehicles.filter((v) => v.rerouteStatus === 'active');
  const safeVehiclesCount = activeVehicles.filter((v) => !v.affectedByDisruptionId && v.rerouteStatus !== 'active').length;

  // Build reactive routes for map rendering
  const reactiveMapRoutes: Route[] = activeVehicles
    .filter((v) => v.rerouteStatus === 'active')
    .map((v) => getReactiveDisplayRoute(v))
    .filter((r): r is Route => Boolean(r));

  const filteredFleet = activeVehicles.filter((v) => {
    if (fleetFilter === 'affected') return Boolean(v.affectedByDisruptionId) || v.rerouteStatus === 'no_alternative';
    if (fleetFilter === 'rerouted') return v.rerouteStatus === 'active';
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#f8f8f7]">
      {/* Operations Center Header Strip */}
      <div className="px-6 py-3 bg-white border-b border-[#e4e4e3] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                Fleet Operations Command
              </span>
              <span className="text-xs text-[#8a8a87]">· North Eastern Region Corridor Dispatch</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#1a1a19] tracking-tight mt-0.5">
              Operations Control Center
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f0fdf4] border border-[#bbf7d0] text-xs font-semibold text-[#166534]">
              <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
              <span>Regional Operations Grid</span>
            </div>
            {affectedVehicles.length > 0 && (
              <div className="px-2.5 py-1 rounded-md bg-[#fef2f2] border border-[#fca5a5] text-xs font-bold text-[#dc2626]">
                {affectedVehicles.length} Disrupted Shipment{affectedVehicles.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Compact 3-Metric Operational Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Affected Shipments"
            value={affectedVehicles.length.toString().padStart(2, '0')}
            subtext={affectedVehicles.length > 0 ? 'Requires route intervention' : 'All shipments clear'}
            riskLevel={affectedVehicles.length > 0 ? 'high' : 'low'}
            icon={<AlertTriangle className="w-4 h-4 text-[#dc2626]" />}
          />
          <MetricCard
            label="Corridor Disruptions"
            value={activeDisruptions.length.toString().padStart(2, '0')}
            subtext={activeDisruptions.length > 0 ? `${activeDisruptions.length} active corridor cut${activeDisruptions.length > 1 ? 's' : ''}` : 'All corridors operational'}
            riskLevel={activeDisruptions.length > 0 ? 'high' : 'low'}
            icon={<Activity className="w-4 h-4 text-[#ea580c]" />}
          />
          <MetricCard
            label="Active Fleet Tracked"
            value={activeVehicles.length}
            subtext={`${safeVehiclesCount} on schedule · ${reroutedVehicles.length} rerouted`}
            icon={<Truck className="w-4 h-4 text-[#2563eb]" />}
          />
        </div>
      </div>

      {/* Main Command Surface: Map (Prominent) + Right Tactical Console */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Prominent Regional Geospatial Map */}
        <div className="flex-1 h-80 lg:h-full relative border-b lg:border-b-0 lg:border-r border-[#e4e4e3]">
          <MapContainer
            center={[25.5, 93.0]}
            zoom={7}
            routes={[...Object.values(DEMO_ROUTES), ...reactiveMapRoutes]}
            selectedRouteId={reactiveMapRoutes[0]?.id}
            incidents={activeIncidents}
            vehicles={activeVehicles}
            godowns={godowns}
            userRole="dispatcher"
            onRerouteVehicle={rerouteVehicle}
            onRequestEmergencyPickup={requestEmergencyPickup}
          />
        </div>

        {/* Tactical Right Command Desk */}
        <div className="w-full lg:w-96 border-l border-[#e4e4e3] bg-white overflow-y-auto shrink-0 flex flex-col">
          {/* Tab Navigation */}
          <div className="p-2.5 border-b border-[#e4e4e3] bg-[#fafaf9] flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('interventions')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'interventions'
                  ? 'bg-white text-[#1a1a19] shadow-xs border border-[#e4e4e3]'
                  : 'text-[#8a8a87] hover:text-[#1a1a19]'
              )}
            >
              <span>Interventions</span>
              {affectedVehicles.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#dc2626] text-white">
                  {affectedVehicles.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'fleet'
                  ? 'bg-white text-[#1a1a19] shadow-xs border border-[#e4e4e3]'
                  : 'text-[#8a8a87] hover:text-[#1a1a19]'
              )}
            >
              <span>Fleet ({activeVehicles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('hazards')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'hazards'
                  ? 'bg-white text-[#1a1a19] shadow-xs border border-[#e4e4e3]'
                  : 'text-[#8a8a87] hover:text-[#1a1a19]'
              )}
            >
              <span>Hazards ({activeIncidents.length})</span>
            </button>
          </div>

          {/* TAB 1: INTERVENTIONS */}
          {activeTab === 'interventions' && (
            <div className="p-4 space-y-4 flex-1">
              {affectedVehicles.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#991b1b] uppercase tracking-wider">
                      Pending Route Interventions ({affectedVehicles.length})
                    </p>
                  </div>

                  {affectedVehicles.map((v) => (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-xl bg-white border border-[#fca5a5] shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#1a1a19]">{v.id}</span>
                            <span className="text-[11px] text-[#5a5a57]">· {v.driverName}</span>
                          </div>
                          <p className="text-[11px] text-[#2563eb] font-medium mt-0.5">
                            📦 {v.cargoType || 'Medical Relief Consignment'}
                          </p>
                        </div>
                        <StatusBadge label="Disrupted" variant="danger" pulse />
                      </div>

                      <div className="text-[11px] text-[#5a5a57] flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium">
                          {v.origin} <ArrowRight className="w-3 h-3 text-[#8a8a87]" /> {v.destination}
                        </span>
                        {v.etaMinutes && <span className="font-semibold text-[#1a1a19]">ETA {formatEta(v.etaMinutes)}</span>}
                      </div>

                      <div className="p-2 rounded bg-[#fef2f2] border border-[#fee2e2] text-[11px] text-[#991b1b] leading-tight">
                        <strong>Hazard:</strong> {v.impactReason || 'Blocked corridor on NH-2 Mao Gate.'}
                      </div>

                      <div className="pt-1">
                        {(() => {
                          const pendingPickupReq = pickupRequests.find(
                            (r) => r.vehicleId === v.id && r.status === 'requested'
                          );

                          if (pendingPickupReq) {
                            return (
                              <div className="p-2.5 rounded-lg bg-[#fffbeb] border border-[#fde68a] text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[#92400e] flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Emergency Pickup Requested
                                  </span>
                                  <StatusBadge label="Awaiting Approval" variant="warning" pulse />
                                </div>
                                <p className="text-[11px] text-[#78350f]">
                                  <strong>{pendingPickupReq.godownName}</strong> · {pendingPickupReq.cargoType}
                                </p>
                                <p className="text-[10px] text-[#92400e]/80">
                                  Awaiting supply operator approval ({pendingPickupReq.quantity} units buffer stock).
                                </p>
                              </div>
                            );
                          }

                          if (v.rerouteStatus === 'no_alternative') {
                            const match = findNearestSuitableGodown(v, godowns);
                            const targetGodown = v.recommendedGodownId
                              ? godowns.find((g) => g.id === v.recommendedGodownId)
                              : match?.godown;
                            const distanceKm = v.recommendedGodownDistanceKm ?? match?.distanceKm ?? 68;

                            return (
                              <div className="space-y-2">
                                <div className="p-2 rounded bg-[#fef2f2] border border-[#fecaca] text-[11px] space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-bold text-[#991b1b]">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Emergency Continuity Required</span>
                                  </div>
                                  <p className="text-[#7f1d1d] text-[10px]">
                                    No viable alternate highway corridor from current position.
                                  </p>
                                </div>

                                {targetGodown && (
                                  <div className="p-2.5 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-xs space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a3412]">
                                        Recommended Emergency Godown
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#fed7aa] text-[#c2410c]">
                                        {targetGodown.availableStock} units available
                                      </span>
                                    </div>
                                    <p className="font-bold text-[#1a1a19] text-xs">{targetGodown.name}</p>
                                    <div className="flex items-center justify-between text-[11px] text-[#7c2d12]">
                                      <span>Distance: ~{distanceKm} km</span>
                                      <span>Suitability: Compatible ({v.cargoType || 'Relief Rations & Grain'})</span>
                                    </div>
                                  </div>
                                )}

                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="w-full text-xs"
                                  onClick={() => requestEmergencyPickup(v.id)}
                                  iconLeft={<Warehouse className="w-3.5 h-3.5" />}
                                >
                                  Request Emergency Pickup
                                </Button>
                              </div>
                            );
                          }

                          return (
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                              onClick={() => rerouteVehicle(v.id)}
                              iconLeft={<Navigation className="w-3.5 h-3.5" />}
                            >
                              Execute Reactive Reroute
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#fafaf9] border border-[#e4e4e3] text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-[#16a34a] mx-auto" />
                  <p className="text-xs font-bold text-[#1a1a19]">All Shipments Clear</p>
                  <p className="text-[11px] text-[#8a8a87]">
                    No active shipments require route intervention at this time.
                  </p>
                </div>
              )}

              {/* Active Reroutes Sub-section */}
              {reroutedVehicles.length > 0 && (
                <div className="pt-3 border-t border-[#e4e4e3] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
                      Active Detours ({reroutedVehicles.length})
                    </span>
                    <span className="text-[10px] font-bold text-[#2563eb]">In Progress</span>
                  </div>

                  <div className="space-y-2">
                    {reroutedVehicles.map((v) => (
                      <div key={v.id} className="p-3 rounded-lg bg-[#f8fbff] border border-[#bfdbfe] text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1a1a19]">{v.id} ({v.driverName})</span>
                          <StatusBadge label="Rerouted" variant="info" />
                        </div>
                        <p className="text-[11px] text-[#5a5a57]">
                          Diverted from <strong className="text-[#1a1a19]">{v.rerouteFromLabel}</strong> to {v.destination}
                        </p>
                        {v.etaMinutes && (
                          <p className="text-[10px] text-[#2563eb] font-semibold">
                            Adjusted ETA: {formatEta(v.etaMinutes)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Godown Continuity Sub-section */}
              {pickupRequests.length > 0 && (
                <div className="pt-3 border-t border-[#e4e4e3] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
                      Emergency Godown Dispatches ({pickupRequests.length})
                    </span>
                    <span className="text-[10px] text-[#8a8a87]">Cross-role status</span>
                  </div>

                  {pickupRequests.map((req) => (
                    <div key={req.id} className="p-3 rounded-lg bg-[#fffbeb] border border-[#fed7aa] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1a1a19]">{req.vehicleId}</span>
                        <StatusBadge
                          label={
                            req.status === 'dispatched'
                              ? 'Secured / Allocated'
                              : req.status === 'declined'
                              ? 'Declined'
                              : 'Awaiting Contractor'
                          }
                          variant={
                            req.status === 'dispatched'
                              ? 'success'
                              : req.status === 'declined'
                              ? 'danger'
                              : 'warning'
                          }
                          pulse={req.status === 'requested'}
                        />
                      </div>
                      <p className="text-[11px] text-[#7c2d12]">
                        {req.status === 'dispatched'
                          ? `Emergency storage secured at ${req.godownName} (${req.quantity} units). Stock reserved by ${req.contractorName || 'Contractor'}.`
                          : req.status === 'declined'
                          ? `Storage request declined at ${req.godownName}. Alternative corridor evaluation required.`
                          : `Emergency storage requested at ${req.godownName} (${req.quantity} units). Pending supply operator approval.`}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#92400e]/80">
                        <span>Cargo: {req.cargoType}</span>
                        <span>Dest: {req.destination}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FLEET OVERVIEW */}
          {activeTab === 'fleet' && (
            <div className="p-4 space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-[#f4f4f3] p-0.5 rounded-lg text-[10px] font-semibold">
                  <button
                    onClick={() => setFleetFilter('all')}
                    className={cn('px-2 py-0.5 rounded cursor-pointer', fleetFilter === 'all' ? 'bg-white text-[#1a1a19] shadow-xs' : 'text-[#8a8a87]')}
                  >
                    All ({activeVehicles.length})
                  </button>
                  <button
                    onClick={() => setFleetFilter('affected')}
                    className={cn('px-2 py-0.5 rounded cursor-pointer', fleetFilter === 'affected' ? 'bg-white text-[#dc2626] shadow-xs' : 'text-[#8a8a87]')}
                  >
                    Alerts
                  </button>
                  <button
                    onClick={() => setFleetFilter('rerouted')}
                    className={cn('px-2 py-0.5 rounded cursor-pointer', fleetFilter === 'rerouted' ? 'bg-white text-[#2563eb] shadow-xs' : 'text-[#8a8a87]')}
                  >
                    Rerouted
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {filteredFleet.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-lg border border-[#e4e4e3] bg-white flex items-center justify-between text-xs hover:border-[#c4c4c2] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#1a1a19]">{v.id}</span>
                        <span className="text-[11px] text-[#8a8a87]">· {v.driverName}</span>
                        {v.affectedByDisruptionId && v.rerouteStatus !== 'active' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#fef2f2] text-[#dc2626]">
                            DISRUPTED
                          </span>
                        )}
                        {v.rerouteStatus === 'active' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#eff6ff] text-[#2563eb]">
                            REROUTED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#5a5a57] truncate mt-0.5">
                        {v.origin} → {v.destination} {v.cargoType ? `· ${v.cargoType}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <RiskBadge level={v.riskLevel} size="sm" />
                      {v.etaMinutes && (
                        <p className="text-[10px] font-bold text-[#1a1a19] mt-0.5">{formatEta(v.etaMinutes)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CORRIDOR HAZARDS */}
          {activeTab === 'hazards' && (
            <div className="p-4 space-y-3 flex-1">
              <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
                Active Corridor Hazards ({activeIncidents.length})
              </span>

              <div className="space-y-2.5">
                {activeIncidents.map((inc) => (
                  <div key={inc.id} className="p-3 rounded-lg border border-[#fca5a5] bg-[#fff8f8] space-y-1.5 text-xs">
                    <div className="flex items-start justify-between">
                      <p className="font-bold text-[#991b1b]">
                        {getIncidentTypeLabel(inc.type)} · {inc.locationName}
                      </p>
                      <StatusBadge
                        label={inc.syncStatus === 'verified' ? 'SDMA Verified' : 'Pending Verification'}
                        variant={inc.syncStatus === 'verified' ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="text-[11px] text-[#5a5a57]">{inc.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-[#8a8a87] pt-1">
                      <span>Reported by {inc.reportedBy}</span>
                      <span>Severeness: High</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
