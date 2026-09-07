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
    <div className="h-full flex flex-col bg-[#f8f8f7]">
      {/* Contractor Header */}
      <div className="px-6 py-3.5 bg-white border-b border-[#e4e4e3] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#fdf4ff] text-[#86198f] border border-[#f5d0fe]">
                Supply & Logistics Contractor
              </span>
              <span className="text-xs text-[#8a8a87]">· Regional Emergency Buffer Network</span>
            </div>
            <h1 className="text-lg font-bold text-[#1a1a19] tracking-tight mt-0.5">
              Emergency Supply Operations
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <StatusBadge label="Buffer Storage Active" variant="success" />
            <span className="text-xs text-[#8a8a87] hidden md:inline">
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
            icon={<AlertTriangle className="w-4 h-4 text-[#dc2626]" />}
          />
          <MetricCard
            label="Active Storage Nodes"
            value={godowns.length}
            subtext="Guwahati · Dimapur · Haflong · Mao"
            icon={<Warehouse className="w-4 h-4 text-[#86198f]" />}
          />
          <MetricCard
            label="Total Buffer Stock Units"
            value={`${totalStock} Units`}
            subtext="Across 4 regional buffer godowns"
            riskLevel="low"
            icon={<Package className="w-4 h-4 text-[#16a34a]" />}
          />
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Godown Network Map */}
        <div className="flex-1 h-80 lg:h-full relative border-b lg:border-b-0 lg:border-r border-[#e4e4e3]">
          <MapContainer
            center={[25.7, 93.3]}
            zoom={7}
            godowns={godowns}
            vehicles={relevantVehicles}
            userRole="contractor"
          />
        </div>

        {/* Right Operations Panel */}
        <div className="w-full lg:w-96 border-l border-[#e4e4e3] bg-white overflow-y-auto shrink-0 flex flex-col divide-y divide-[#e4e4e3]">
          {/* Emergency Pickup Queue */}
          <div className="p-4 bg-[#fafaf9]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#86198f]" />
                <h2 className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider">
                  Emergency Pickup Queue
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3e8ff] text-[#7e22ce]">
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
                      className="p-3.5 rounded-xl bg-white border border-[#f5d0fe] shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#1a1a19]">{req.vehicleId}</span>
                            <span className="text-[11px] text-[#5a5a57]">· {req.driverName}</span>
                          </div>
                          <p className="text-[11px] text-[#7e22ce] font-medium mt-0.5">
                            Cargo: {req.cargoType}
                          </p>
                        </div>
                        <StatusBadge label="Pickup Requested" variant="warning" pulse />
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#fdf4ff] border border-[#fae8ff] text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[#5a5a57]">
                          <span>Transit Route:</span>
                          <span className="font-semibold text-[#1a1a19]">
                            {vehicle?.origin || 'Guwahati'} → {req.destination}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#5a5a57]">
                          <span>Designated Godown:</span>
                          <span className="font-semibold text-[#1a1a19]">{req.godownName}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#5a5a57]">
                          <span>Available Godown Stock:</span>
                          <span className="font-semibold text-[#16a34a]">{targetGodown?.availableStock ?? 120} units</span>
                        </div>
                        <div className="flex items-center justify-between text-[#5a5a57] border-t border-[#f5d0fe] pt-1">
                          <span>Requested Buffer Allocation:</span>
                          <span className="font-bold text-[#7e22ce]">{req.quantity} units</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1 bg-[#86198f] hover:bg-[#701a75] text-white text-xs font-bold cursor-pointer shadow-xs"
                          onClick={() => approveEmergencyPickup(req.id)}
                          iconLeft={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Approve Emergency Pickup
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-[#e4e4e3] hover:bg-[#fef2f2] hover:text-[#dc2626] cursor-pointer"
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
              <div className="p-4 rounded-xl bg-white border border-[#e4e4e3] text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-[#16a34a] mx-auto" />
                <p className="text-xs font-semibold text-[#1a1a19]">No Pending Emergency Pickups</p>
                <p className="text-[11px] text-[#8a8a87]">
                  All regional godowns operating at normal buffer capacity.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-[#86198f] border-[#f5d0fe] bg-[#fdf4ff] hover:bg-[#fae8ff] mt-1"
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
            <div className="p-4 bg-white border-t border-[#e4e4e3] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
                  Active Buffer Allocations ({securedPickups.length})
                </span>
                <span className="text-[10px] text-[#16a34a] font-semibold">Stock Decremented</span>
              </div>

              {securedPickups.map((req) => (
                <div key={req.id} className="p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#166534]">{req.vehicleId} · {req.driverName}</span>
                    <StatusBadge label="Allocated / Secured" variant="success" />
                  </div>
                  <p className="text-[11px] text-[#14532d]">
                    <strong>{req.godownName}</strong>: {req.quantity} units buffer stock reserved.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[#166534]/80">
                    <span>Cargo: {req.cargoType}</span>
                    <span>Dest: {req.destination}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Regional Godown Registry */}
          <div className="p-4 space-y-3">
            <h2 className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider">
              Regional Buffer Nodes ({godowns.length})
            </h2>

            <div className="space-y-2.5">
              {godowns.map((g) => (
                <div key={g.id} className="p-3 rounded-lg bg-[#fafaf9] border border-[#e4e4e3] space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1a1a19]">{g.name}</p>
                      <p className="text-[11px] text-[#8a8a87]">{g.locationLabel}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#e4e4e3] text-[#5a5a57]">
                      {g.availableStock} units
                    </span>
                  </div>

                  <div className="text-[11px] text-[#5a5a57]">
                    <span className="text-[#8a8a87]">Suitable Cargo: </span>
                    <span className="font-medium text-[#1a1a19]">{g.suitableCargoTypes.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Policy Note */}
          <div className="p-4 bg-[#fafaf9] text-xs text-[#8a8a87] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px] text-[#5a5a57]">
              <strong>Autonomous Emergency Godown Protocol:</strong> When all alternative mountain passes exceed the safety threshold (&gt;85/100 risk score), in-transit freight is diverted to the closest verified regional godown to protect cargo integrity and driver safety.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
