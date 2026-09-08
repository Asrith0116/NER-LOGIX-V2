import { useState } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils';
import type { Shipment, ShipmentPriority, Godown } from '@/types';
import {
  Package,
  AlertTriangle,
  Warehouse,
  Truck,
  Search,
  CheckCircle2,
  Thermometer,
  ArrowRight,
  RotateCw,
  Send,
  Building2,
} from 'lucide-react';

export function DispatcherLogistics() {
  const shipments = useNetworkStore((state) => state.shipments);
  const godowns = useNetworkStore((state) => state.godowns);
  const pickupRequests = useNetworkStore((state) => state.pickupRequests);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);

  const setSelectedDriverVehicleId = useAppStore((state) => state.setSelectedDriverVehicleId);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ShipmentPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_track' | 'disrupted' | 'detoured' | 'buffered'>('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Computed metrics
  const totalShipments = shipments.length;
  const disruptedShipments = shipments.filter(
    (s) => s.currentStatus === 'disrupted' || s.continuityStatus === 'at_risk' || s.continuityStatus === 'escalated' || (s.affected && s.continuityStatus !== 'relief_secured' && s.currentStatus !== 'rerouted')
  );
  const onTrackShipments = shipments.filter((s) => s.continuityStatus === 'on_track' || s.currentStatus === 'in_transit');
  const reroutedShipments = shipments.filter((s) => s.currentStatus === 'rerouted' || s.continuityStatus === 'rerouting');
  const bufferedShipments = shipments.filter((s) => s.currentStatus === 'relief_buffered' || s.continuityStatus === 'relief_secured');

  const availableBufferStock = godowns.reduce((acc, g) => acc + g.availableStock, 0);

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    // Search filter
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cargoCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.vehicleId && s.vehicleId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Priority filter
    if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;

    // Status filter
    if (statusFilter === 'disrupted') {
      return s.currentStatus === 'disrupted' || s.continuityStatus === 'at_risk' || s.continuityStatus === 'escalated' || (s.affected && s.continuityStatus !== 'relief_secured' && s.currentStatus !== 'rerouted');
    }
    if (statusFilter === 'detoured') return s.currentStatus === 'rerouted' || s.continuityStatus === 'rerouting';
    if (statusFilter === 'buffered') return s.currentStatus === 'relief_buffered' || s.continuityStatus === 'relief_secured';
    if (statusFilter === 'on_track') return s.continuityStatus === 'on_track' || s.currentStatus === 'in_transit';

    return true;
  });

  const handleRerouteShipment = (shipment: Shipment) => {
    if (!shipment.vehicleId) return;
    rerouteVehicle(shipment.vehicleId);
  };

  const handleEmergencyPickup = (shipment: Shipment) => {
    if (!shipment.vehicleId) return;
    requestEmergencyPickup(shipment.vehicleId);
  };

  const handleInspectVehicleInCockpit = (vehicleId: string) => {
    setSelectedDriverVehicleId(vehicleId);
    navigate('/driver');
  };

  const getPriorityBadge = (p: ShipmentPriority) => {
    switch (p) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef2f2] text-[#dc2626] border border-[#fca5a5] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
            P1 CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fde68a]">
            P2 HIGH
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
            NORMAL
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f4f4f3] text-[#5a5a57] border border-[#e4e4e3]">
            STANDARD
          </span>
        );
    }
  };

  const getContinuityStatusBadge = (s: Shipment) => {
    if (s.currentStatus === 'relief_buffered' || s.continuityStatus === 'relief_secured') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center gap-1">
          <Warehouse className="w-3 h-3 text-[#16a34a]" />
          EMERGENCY STORAGE BUFFER
        </span>
      );
    }
    if (s.currentStatus === 'rerouted' || s.continuityStatus === 'rerouting') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] flex items-center gap-1">
          <RotateCw className="w-3 h-3 text-[#2563eb]" />
          DETOURED (CONTINUITY SECURED)
        </span>
      );
    }
    if (s.currentStatus === 'disrupted' || s.affected || s.continuityStatus === 'at_risk' || s.continuityStatus === 'escalated') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef2f2] text-[#dc2626] border border-[#fca5a5] flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-[#dc2626]" />
          DISRUPTED BY CORRIDOR HAZARD
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />
        ON TRACK
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#f8f8f7] overflow-hidden" id="dispatcher-logistics-page">
      {/* Header */}
      <div className="px-6 py-3.5 bg-white border-b border-[#e4e4e3] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                Supply Continuity Workspace
              </span>
              <span className="text-xs text-[#8a8a87]">· Regional Freight & Emergency Godowns</span>
            </div>
            <h1 className="text-lg font-bold text-[#1a1a19] tracking-tight mt-0.5">
              Logistics Intelligence & Supply Continuity
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/contractor')}
              iconLeft={<Warehouse className="w-3.5 h-3.5 text-[#86198f]" />}
            >
              Open Contractor Operations
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/dispatcher/fleet')}
              iconLeft={<Truck className="w-3.5 h-3.5" />}
            >
              Fleet Command
            </Button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Total Consignments"
            value={totalShipments.toString().padStart(2, '0')}
            subtext={`${onTrackShipments.length} on track, ${reroutedShipments.length} detoured`}
            riskLevel="low"
            icon={<Package className="w-4 h-4 text-[#2563eb]" />}
          />
          <MetricCard
            label="Disrupted Shipments"
            value={disruptedShipments.length.toString().padStart(2, '0')}
            subtext={disruptedShipments.length > 0 ? 'Requires route or godown action' : 'Zero corridor disruption'}
            riskLevel={disruptedShipments.length > 0 ? 'high' : 'low'}
            icon={<AlertTriangle className="w-4 h-4 text-[#dc2626]" />}
          />
          <MetricCard
            label="Buffer Storage Available"
            value={`${availableBufferStock} MT`}
            subtext={`Across ${godowns.length} regional relief godowns`}
            riskLevel="moderate"
            icon={<Warehouse className="w-4 h-4 text-[#16a34a]" />}
          />
          <MetricCard
            label="Emergency Pickups"
            value={pickupRequests.length.toString().padStart(2, '0')}
            subtext={`${pickupRequests.filter((p) => p.status === 'dispatched').length} approved & dispatched`}
            riskLevel={pickupRequests.length > 0 ? 'high' : 'low'}
            icon={<Send className="w-4 h-4 text-[#86198f]" />}
          />
        </div>
      </div>

      {/* Main Grid: Shipments List + Side Inspection / Godown Network */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left: Filterable Shipments List */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#e4e4e3] bg-white overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3 bg-[#fafaf9] border-b border-[#e4e4e3] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#8a8a87] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shipment ID, cargo, vehicle, route..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#e4e4e3] text-xs bg-white text-[#1a1a19] placeholder:text-[#8a8a87] focus:outline-none focus:border-[#2563eb]"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-[#f4f4f3] p-0.5 rounded-lg border border-[#e4e4e3] shrink-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === 'all' ? 'bg-white text-[#1a1a19] shadow-2xs' : 'text-[#5a5a57] hover:text-[#1a1a19]'
                  )}
                >
                  All ({totalShipments})
                </button>
                <button
                  onClick={() => setStatusFilter('disrupted')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                    statusFilter === 'disrupted'
                      ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fca5a5] shadow-2xs'
                      : 'text-[#dc2626] hover:bg-[#fee2e2]/60'
                  )}
                >
                  Disrupted ({disruptedShipments.length})
                </button>
                <button
                  onClick={() => setStatusFilter('detoured')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === 'detoured' ? 'bg-white text-[#2563eb] shadow-2xs' : 'text-[#5a5a57] hover:text-[#1a1a19]'
                  )}
                >
                  Detoured ({reroutedShipments.length})
                </button>
                <button
                  onClick={() => setStatusFilter('buffered')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === 'buffered' ? 'bg-white text-[#166534] shadow-2xs' : 'text-[#5a5a57] hover:text-[#1a1a19]'
                  )}
                >
                  Buffered ({bufferedShipments.length})
                </button>
                <button
                  onClick={() => setStatusFilter('on_track')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === 'on_track' ? 'bg-white text-[#166534] shadow-2xs' : 'text-[#5a5a57] hover:text-[#1a1a19]'
                  )}
                >
                  On Track ({onTrackShipments.length})
                </button>
              </div>

              {/* Priority Filters */}
              <div className="flex items-center gap-1 bg-[#f4f4f3] p-0.5 rounded-lg border border-[#e4e4e3] shrink-0">
                <button
                  onClick={() => setPriorityFilter('all')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    priorityFilter === 'all' ? 'bg-white text-[#1a1a19] shadow-2xs' : 'text-[#5a5a57] hover:text-[#1a1a19]'
                  )}
                >
                  Priority: All
                </button>
                <button
                  onClick={() => setPriorityFilter('critical')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    priorityFilter === 'critical' ? 'bg-[#fef2f2] text-[#dc2626] shadow-2xs' : 'text-[#dc2626] hover:bg-[#fee2e2]/60'
                  )}
                >
                  P1
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    priorityFilter === 'high' ? 'bg-[#fffbeb] text-[#d97706] shadow-2xs' : 'text-[#d97706] hover:bg-[#fef3c7]/60'
                  )}
                >
                  P2
                </button>
              </div>
            </div>
          </div>

          {/* Shipment Rows List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f4f4f3] p-3 space-y-2.5">
            {filteredShipments.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-8 h-8 text-[#8a8a87] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#1a1a19]">No consignments match your filter</p>
                <p className="text-xs text-[#8a8a87] mt-1">Try resetting search or status filters</p>
              </div>
            ) : (
              filteredShipments.map((s) => {
                const assignedVehicle = activeVehicles.find((v) => v.id === s.vehicleId);
                const isDisrupted = s.currentStatus === 'disrupted' || s.affected || s.continuityStatus === 'at_risk' || s.continuityStatus === 'escalated';
                const isSelected = selectedShipment?.id === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedShipment(s)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                      isSelected
                        ? 'border-[#2563eb] bg-[#eff6ff]/40 shadow-xs'
                        : isDisrupted
                        ? 'border-[#fca5a5] bg-[#fff8f8] hover:border-[#f87171]'
                        : 'border-[#e4e4e3] bg-white hover:border-[#d4d4d2] hover:bg-[#fafaf9]'
                    )}
                  >
                    {/* Top Row: IDs, Priority, Continuity Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#1a1a19] bg-[#f4f4f3] px-2 py-0.5 rounded border border-[#e4e4e3]">
                          {s.id}
                        </span>
                        <span className="font-semibold text-xs text-[#1a1a19]">
                          {s.cargoCategory}
                        </span>
                        {getPriorityBadge(s.priority)}
                        {s.coldChainRequired && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-[#2563eb]" />
                            {s.currentTemperatureC !== undefined ? `${s.currentTemperatureC} °C` : 'Cold-Chain'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {getContinuityStatusBadge(s)}
                      </div>
                    </div>

                    {/* Middle Row: Corridor, Cargo specs, SLA */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-[#f4f4f3] text-xs">
                      <div>
                        <span className="text-[10px] text-[#8a8a87] font-semibold uppercase">Corridor:</span>
                        <p className="font-medium text-[#1a1a19] truncate">
                          {s.origin} → {s.destination}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#8a8a87] font-semibold uppercase">Payload / Quantity:</span>
                        <p className="font-medium text-[#1a1a19] truncate">
                          {s.quantity} {s.unit} ({s.cargoCategory})
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#8a8a87] font-semibold uppercase">Assigned Transport:</span>
                        <div className="flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-[#2563eb]" />
                          <span className="font-mono font-bold text-[#1a1a19]">{s.vehicleId || 'Unassigned'}</span>
                          {assignedVehicle && (
                            <span className="text-[#8a8a87]">({assignedVehicle.driverName})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Disruption Alert Note if affected */}
                    {isDisrupted && s.impactReason && (
                      <div className="mt-2.5 p-2 rounded-lg bg-[#fee2e2]/80 border border-[#fca5a5] text-xs text-[#991b1b] flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#dc2626]" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold">Corridor Hazard Impact: </span>
                          <span>{s.impactReason}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#f4f4f3]">
                      <span className="text-[11px] text-[#8a8a87]">
                        {s.delayMinutes ? `Expected Delay: +${s.delayMinutes} min` : 'Corridor Timeline: Nominal'}
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isDisrupted && assignedVehicle && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmergencyPickup(s)}
                              iconLeft={<Warehouse className="w-3 h-3 text-[#16a34a]" />}
                              className="text-xs py-1 h-7 border-[#bbf7d0] text-[#166534] bg-[#f0fdf4] hover:bg-[#dcfce7]"
                            >
                              Emergency Godown
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleRerouteShipment(s)}
                              iconLeft={<RotateCw className="w-3 h-3" />}
                              className="text-xs py-1 h-7 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                            >
                              Reroute Detour
                            </Button>
                          </>
                        )}
                        {assignedVehicle && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleInspectVehicleInCockpit(assignedVehicle.id)}
                            iconRight={<ArrowRight className="w-3 h-3" />}
                            className="text-xs py-1 h-7"
                          >
                            Open Cockpit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Regional Godowns & Emergency Pickup Status */}
        <div className="w-full lg:w-96 bg-[#fafaf9] overflow-y-auto p-4 space-y-4 shrink-0">
          {/* Section 1: Regional Relief Godowns Buffer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-[#16a34a]" />
                Regional Buffer Godowns
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                {godowns.length} Facilities Active
              </span>
            </div>

            <div className="space-y-2">
              {godowns.map((g: Godown) => {
                const totalCap = g.totalCapacity || (g.availableStock + 30);
                const stockPercent = Math.min(100, Math.round((g.availableStock / totalCap) * 100));
                return (
                  <div key={g.id} className="p-3 rounded-xl bg-white border border-[#e4e4e3] shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h4 className="font-bold text-xs text-[#1a1a19]">{g.name}</h4>
                        <p className="text-[11px] text-[#8a8a87]">{g.locationLabel}</p>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                        {g.availableStock} MT Available
                      </span>
                    </div>

                    {/* Stock capacity bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#8a8a87] mb-1">
                        <span>Stock Level</span>
                        <span>{stockPercent}% ({g.availableStock}/{totalCap} MT)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#f4f4f3] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#16a34a] rounded-full transition-all"
                          style={{ width: `${stockPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#f4f4f3] text-[10px] text-[#5a5a57]">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#2563eb]" />
                        {g.suitableCargoTypes?.join(', ') || 'General & Pharma'}
                      </span>
                      <span className="font-medium text-[#2563eb]">
                        Status: {g.status || 'operational'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Active Emergency Pickups Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1a1a19] uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#86198f]" />
                Emergency Pickups Pipeline
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fdf4ff] text-[#86198f] border border-[#f5d0fe]">
                {pickupRequests.length} Active
              </span>
            </div>

            {pickupRequests.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-white border border-[#e4e4e3] text-center text-xs text-[#8a8a87]">
                No active emergency pickup requests. All disrupted corridors handled via standard rerouting or on track.
              </div>
            ) : (
              <div className="space-y-2">
                {pickupRequests.map((req) => (
                  <div key={req.id} className="p-3 rounded-xl bg-white border border-[#e4e4e3] shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#1a1a19]">{req.id}</span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded border',
                          req.status === 'dispatched'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : req.status === 'declined'
                            ? 'bg-[#fef2f2] text-[#dc2626] border-[#fca5a5]'
                            : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
                        )}
                      >
                        {req.status === 'dispatched' ? 'DISPATCHED' : req.status === 'declined' ? 'DECLINED' : 'PENDING APPROVAL'}
                      </span>
                    </div>

                    <p className="text-xs text-[#1a1a19] font-semibold">
                      Vehicle: <span className="font-mono">{req.vehicleId}</span> ({req.driverName})
                    </p>

                    <p className="text-[11px] text-[#5a5a57]">
                      Diverted to <span className="font-semibold text-[#1a1a19]">{req.godownName}</span> · {req.quantity} MT {req.cargoType}
                    </p>

                    {req.contractorName && (
                      <p className="text-[10px] text-[#86198f] font-medium pt-1 border-t border-[#f4f4f3]">
                        Fulfillment Contractor: {req.contractorName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
