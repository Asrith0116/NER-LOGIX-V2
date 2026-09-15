import { useEffect } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useNetworkStore } from '@/store/networkStore';
import { Warehouse, Package, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ContractorOps() {
  const godowns = useNetworkStore((state) => state.godowns);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const pickupRequests = useNetworkStore((state) => state.pickupRequests);
  const approveEmergencyPickup = useNetworkStore((state) => state.approveEmergencyPickup);
  const declineEmergencyPickup = useNetworkStore((state) => state.declineEmergencyPickup);
  const syncFromIndexedDB = useNetworkStore((state) => state.syncFromIndexedDB);

  useEffect(() => {
    syncFromIndexedDB();
  }, [syncFromIndexedDB]);

  const pendingPickups = pickupRequests.filter((r) => r.status === 'requested');
  const securedPickups = pickupRequests.filter((r) => r.status === 'dispatched');
  const totalStock = godowns.reduce((acc, g) => acc + g.availableStock, 0);

  // Vehicles to display on map: those with pending pickup requests or active emergency pickup status
  const relevantVehicles = activeVehicles.filter(
    (v) => pendingPickups.some((r) => r.vehicleId === v.id) || v.status === 'emergency_pickup'
  );

  return (
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      {/* Contractor Header */}
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
                Supply & Logistics Contractor
              </span>
              <span className="text-xs text-slate-500">· Regional Emergency Buffer Network</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              Emergency Supply Operations
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <StatusBadge label="Buffer Storage Active" variant="success" />
            <span className="text-xs font-semibold text-slate-500 hidden md:inline">
              {godowns.length} Regional Godown Nodes
            </span>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Pending Pickup Requests"
            value={pendingPickups.length.toString().padStart(2, '0')}
            subtext={pendingPickups.length > 0 ? 'Urgent relief consignment buffer required' : 'No pending buffer requests'}
            riskLevel={pendingPickups.length > 0 ? 'high' : 'low'}
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          />
          <MetricCard
            label="Active Storage Nodes"
            value={godowns.length}
            subtext="Guwahati · Dimapur · Haflong · Mao"
            icon={<Warehouse className="w-4 h-4 text-purple-600" />}
          />
          <MetricCard
            label="Total Buffer Stock Units"
            value={`${totalStock} Units`}
            subtext="Across 4 regional buffer godowns"
            riskLevel="low"
            icon={<Package className="w-4 h-4 text-emerald-600" />}
          />
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Godown Network Map */}
        <div className="flex-1 h-80 lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-200/80">
          <MapContainer
            center={[25.7, 93.3]}
            zoom={7}
            godowns={godowns}
            vehicles={relevantVehicles}
            userRole="contractor"
          />
        </div>

        {/* Right Operations Panel */}
        <div className="w-full lg:w-96 border-l border-slate-200/80 bg-slate-50/50 backdrop-blur-xs overflow-y-auto shrink-0 flex flex-col divide-y divide-slate-100">
          {/* Emergency Pickup Queue */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Emergency Pickup Queue
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100/80 text-purple-700 border border-purple-200/60 shadow-2xs">
                {pendingPickups.length} Pending
              </span>
            </div>

            {pendingPickups.length > 0 ? (
              <div className="space-y-3">
                {pendingPickups.map((req) => {
                  const targetGodown = godowns.find((g) => g.id === req.godownId);
                  const vehicle = activeVehicles.find((v) => v.id === req.vehicleId);
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white border border-purple-200/80 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{req.vehicleId}</span>
                            <span className="text-[11px] text-slate-500">· {req.driverName}</span>
                          </div>
                          <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                            Cargo: {req.cargoType}
                          </p>
                        </div>
                        <StatusBadge label="Pickup Requested" variant="warning" pulse />
                      </div>

                      <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs space-y-1.5 font-medium">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Transit Route:</span>
                          <span className="font-bold text-slate-900">
                            {vehicle?.origin || 'Guwahati'} → {req.destination}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Designated Godown:</span>
                          <span className="font-bold text-slate-900">{req.godownName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Available Godown Stock:</span>
                          <span className="font-bold text-emerald-600">{targetGodown?.availableStock ?? 120} units</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 border-t border-purple-200/60 pt-1.5">
                          <span>Requested Buffer Allocation:</span>
                          <span className="font-bold text-purple-700">{req.quantity} units</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer rounded-xl shadow-2xs"
                          onClick={() => approveEmergencyPickup(req.id)}
                          iconLeft={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Approve Pickup
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl cursor-pointer shadow-2xs"
                          onClick={() => declineEmergencyPickup(req.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2 shadow-2xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900">No Pending Emergency Pickups</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  All regional godowns operating at normal buffer capacity.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-purple-700 border-purple-200 bg-purple-50/60 hover:bg-purple-100 rounded-xl font-bold mt-1 shadow-2xs"
                  onClick={() => {
                    useNetworkStore.getState().requestEmergencyPickup('NL-02-C-3391');
                  }}
                >
                  Simulate NL-02-C-3391 Godown Fallback
                </Button>
              </div>
            )}
          </div>

          {/* Active Secured Allocations */}
          {securedPickups.length > 0 && (
            <div className="p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Buffer Allocations ({securedPickups.length})
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">Stock Decremented</span>
              </div>

              {securedPickups.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">{req.vehicleId} · {req.driverName}</span>
                    <StatusBadge label="Allocated / Secured" variant="success" />
                  </div>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    <strong>{req.godownName}</strong>: {req.quantity} units buffer stock reserved.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 font-medium">
                    <span>Cargo: {req.cargoType}</span>
                    <span>Dest: {req.destination}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Regional Godown Registry */}
          <div className="p-4 bg-white space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Regional Buffer Nodes ({godowns.length})
            </h2>

            <div className="space-y-2.5">
              {godowns.map((g) => (
                <div key={g.id} className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80 space-y-2 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{g.name}</p>
                      <p className="text-[11px] text-slate-500">{g.locationLabel}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {g.availableStock} units
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    <span className="text-slate-400 font-medium">Suitable Cargo: </span>
                    <span className="font-semibold text-slate-800">{g.suitableCargoTypes.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Policy Note */}
          <div className="p-4 bg-slate-50/70 text-xs text-slate-500 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px] text-slate-600 font-medium">
              <strong className="text-slate-900">Autonomous Emergency Godown Protocol:</strong> When all alternative mountain passes exceed the safety threshold (&gt;85/100 risk score), in-transit freight is diverted to the closest verified regional godown to protect cargo integrity and driver safety.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
