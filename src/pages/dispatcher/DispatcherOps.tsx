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
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      {/* Operations Center Header Strip */}
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50/90 text-amber-700 border border-amber-200/80 shadow-2xs">
                Fleet Operations Command
              </span>
              <span className="text-xs text-slate-500">· North Eastern Region Corridor Dispatch</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Operations Control Center
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-xs font-semibold text-emerald-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Regional Operations Grid</span>
            </div>
            {affectedVehicles.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-50/90 border border-rose-200/80 text-xs font-bold text-rose-700 shadow-2xs">
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
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          />
          <MetricCard
            label="Corridor Disruptions"
            value={activeDisruptions.length.toString().padStart(2, '0')}
            subtext={activeDisruptions.length > 0 ? `${activeDisruptions.length} active corridor cut${activeDisruptions.length > 1 ? 's' : ''}` : 'All corridors operational'}
            riskLevel={activeDisruptions.length > 0 ? 'high' : 'low'}
            icon={<Activity className="w-4 h-4 text-amber-600" />}
          />
          <MetricCard
            label="Active Fleet Tracked"
            value={activeVehicles.length}
            subtext={`${safeVehiclesCount} on schedule · ${reroutedVehicles.length} rerouted`}
            icon={<Truck className="w-4 h-4 text-blue-600" />}
          />
        </div>
      </div>

      {/* Main Command Surface: Map (Prominent) + Right Tactical Console */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Prominent Regional Geospatial Map */}
        <div className="flex-1 h-80 lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-200/80">
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
        <div className="w-full lg:w-96 border-l border-slate-200/80 bg-white/95 backdrop-blur-md overflow-y-auto shrink-0 flex flex-col">
          {/* Tab Navigation */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('interventions')}
              className={cn(
                'flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'interventions'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <span>Interventions</span>
              {affectedVehicles.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                  {affectedVehicles.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={cn(
                'flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'fleet'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <span>Fleet ({activeVehicles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('hazards')}
              className={cn(
                'flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'hazards'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
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
                    <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                      Pending Route Interventions ({affectedVehicles.length})
                    </p>
                  </div>

                  {affectedVehicles.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-2xl bg-white border border-rose-200/90 shadow-[0_4px_16px_-4px_rgba(244,63,94,0.08)] space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{v.id}</span>
                            <span className="text-[11px] text-slate-500">· {v.driverName}</span>
                          </div>
                          <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                            📦 {v.cargoType || 'Medical Relief Consignment'}
                          </p>
                        </div>
                        <StatusBadge label="Disrupted" variant="danger" pulse />
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium">
                          {v.origin} <ArrowRight className="w-3 h-3 text-slate-400" /> {v.destination}
                        </span>
                        {v.etaMinutes && <span className="font-semibold text-slate-900">ETA {formatEta(v.etaMinutes)}</span>}
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/70 text-[11px] text-rose-800 leading-tight">
                        <strong>Hazard:</strong> {v.impactReason || 'Blocked corridor on NH-2 Mao Gate.'}
                      </div>

                      <div className="pt-1">
                        {(() => {
                          const pendingPickupReq = pickupRequests.find(
                            (r) => r.vehicleId === v.id && r.status === 'requested'
                          );

                          if (pendingPickupReq) {
                            return (
                              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-800 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Emergency Pickup Requested
                                  </span>
                                  <StatusBadge label="Awaiting Approval" variant="warning" pulse />
                                </div>
                                <p className="text-[11px] text-amber-900">
                                  <strong>{pendingPickupReq.godownName}</strong> · {pendingPickupReq.cargoType}
                                </p>
                                <p className="text-[10px] text-amber-800/80">
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
                                <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/70 text-[11px] space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Emergency Continuity Required</span>
                                  </div>
                                  <p className="text-rose-700 text-[10px]">
                                    No viable alternate highway corridor from current position.
                                  </p>
                                </div>

                                {targetGodown && (
                                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                        Recommended Emergency Godown
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-700 shadow-2xs">
                                        {targetGodown.availableStock} units available
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-900 text-xs">{targetGodown.name}</p>
                                    <div className="flex items-center justify-between text-[11px] text-amber-900">
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
                              className="w-full text-xs bg-rose-600 hover:bg-rose-700 text-white"
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
                <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">All Shipments Clear</p>
                  <p className="text-[11px] text-slate-500">
                    No active shipments require route intervention at this time.
                  </p>
                </div>
              )}

              {/* Active Reroutes Sub-section */}
              {reroutedVehicles.length > 0 && (
                <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Active Detours ({reroutedVehicles.length})
                    </span>
                    <span className="text-[10px] font-bold text-blue-600">In Progress</span>
                  </div>

                  <div className="space-y-2">
                    {reroutedVehicles.map((v) => (
                      <div key={v.id} className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70 text-xs space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{v.id} ({v.driverName})</span>
                          <StatusBadge label="Rerouted" variant="info" />
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Diverted from <strong className="text-slate-900">{v.rerouteFromLabel}</strong> to {v.destination}
                        </p>
                        {v.etaMinutes && (
                          <p className="text-[10px] text-blue-600 font-semibold">
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
                <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Emergency Godown Dispatches ({pickupRequests.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Cross-role status</span>
                  </div>

                  {pickupRequests.map((req) => (
                    <div key={req.id} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{req.vehicleId}</span>
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
                      <p className="text-[11px] text-amber-950">
                        {req.status === 'dispatched'
                          ? `Emergency storage secured at ${req.godownName} (${req.quantity} units). Stock reserved by ${req.contractorName || 'Contractor'}.`
                          : req.status === 'declined'
                          ? `Storage request declined at ${req.godownName}. Alternative corridor evaluation required.`
                          : `Emergency storage requested at ${req.godownName} (${req.quantity} units). Pending supply operator approval.`}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-amber-900/80">
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
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-semibold">
                  <button
                    onClick={() => setFleetFilter('all')}
                    className={cn('px-2.5 py-1 rounded-lg cursor-pointer transition-all', fleetFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900')}
                  >
                    All ({activeVehicles.length})
                  </button>
                  <button
                    onClick={() => setFleetFilter('affected')}
                    className={cn('px-2.5 py-1 rounded-lg cursor-pointer transition-all', fleetFilter === 'affected' ? 'bg-white text-rose-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900')}
                  >
                    Alerts
                  </button>
                  <button
                    onClick={() => setFleetFilter('rerouted')}
                    className={cn('px-2.5 py-1 rounded-lg cursor-pointer transition-all', fleetFilter === 'rerouted' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900')}
                  >
                    Rerouted
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {filteredFleet.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{v.id}</span>
                        <span className="text-[11px] text-slate-400">· {v.driverName}</span>
                        {v.affectedByDisruptionId && v.rerouteStatus !== 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 shadow-2xs">
                            DISRUPTED
                          </span>
                        )}
                        {v.rerouteStatus === 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                            REROUTED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {v.origin} → {v.destination} {v.cargoType ? `· ${v.cargoType}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <RiskBadge level={v.riskLevel} size="sm" />
                      {v.etaMinutes && (
                        <p className="text-[10px] font-bold text-slate-900 mt-0.5">{formatEta(v.etaMinutes)}</p>
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Corridor Hazards ({activeIncidents.length})
              </span>

              <div className="space-y-2.5">
                {activeIncidents.map((inc) => (
                  <div key={inc.id} className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/40 space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-start justify-between">
                      <p className="font-bold text-rose-900">
                        {getIncidentTypeLabel(inc.type)} · {inc.locationName}
                      </p>
                      <StatusBadge
                        label={inc.syncStatus === 'verified' ? 'SDMA Verified' : 'Pending Verification'}
                        variant={inc.syncStatus === 'verified' ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600">{inc.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
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
