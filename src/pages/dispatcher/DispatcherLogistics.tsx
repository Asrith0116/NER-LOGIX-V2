import { useState } from 'react';
import { useNetworkStore, findNearestSuitableGodown } from '@/store/networkStore';
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
  X,
  ShieldCheck,
  MapPin,
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
  const [godownModalShipment, setGodownModalShipment] = useState<Shipment | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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
    setGodownModalShipment(shipment);
  };

  const handleConfirmEmergencyPickup = (shipment: Shipment) => {
    if (!shipment.vehicleId) return;
    const reqId = requestEmergencyPickup(shipment.vehicleId);
    setGodownModalShipment(null);
    setActionFeedback(`Emergency Pickup Request ${reqId || 'EPK-' + shipment.vehicleId} submitted to contractor. Dispatcher buffer reserved.`);
    setTimeout(() => setActionFeedback(null), 6000);
  };

  const handleInspectVehicleInCockpit = (vehicleId: string) => {
    setSelectedDriverVehicleId(vehicleId);
    navigate('/driver');
  };

  const getPriorityBadge = (p: ShipmentPriority) => {
    switch (p) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            P1 CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            P2 HIGH
          </span>
        );
      case 'normal':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            NORMAL
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
            STANDARD
          </span>
        );
    }
  };

  const getContinuityStatusBadge = (s: Shipment) => {
    if (s.currentStatus === 'relief_buffered' || s.continuityStatus === 'relief_secured') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
          <Warehouse className="w-3 h-3 text-emerald-600" />
          EMERGENCY STORAGE BUFFER
        </span>
      );
    }
    if (s.currentStatus === 'rerouted' || s.continuityStatus === 'rerouting') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
          <RotateCw className="w-3 h-3 text-blue-600" />
          DETOURED (CONTINUITY SECURED)
        </span>
      );
    }
    if (s.currentStatus === 'disrupted' || s.affected || s.continuityStatus === 'at_risk' || s.continuityStatus === 'escalated') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 shadow-2xs">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          DISRUPTED BY CORRIDOR HAZARD
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        ON TRACK
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#f4f6f8] overflow-hidden" id="dispatcher-logistics-page">
      {/* Header */}
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                Supply Continuity Workspace
              </span>
              <span className="text-xs text-slate-400 font-medium">· Regional Freight & Emergency Godowns</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
              Logistics Intelligence & Supply Continuity
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/contractor')}
              iconLeft={<Warehouse className="w-3.5 h-3.5 text-purple-600" />}
              className="rounded-xl shadow-2xs font-semibold text-xs"
            >
              Open Contractor Operations
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/dispatcher/fleet')}
              iconLeft={<Truck className="w-3.5 h-3.5" />}
              className="rounded-xl shadow-2xs font-semibold text-xs"
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
            icon={<Package className="w-4 h-4 text-blue-600" />}
          />
          <MetricCard
            label="Disrupted Shipments"
            value={disruptedShipments.length.toString().padStart(2, '0')}
            subtext={disruptedShipments.length > 0 ? 'Requires route or godown action' : 'Zero corridor disruption'}
            riskLevel={disruptedShipments.length > 0 ? 'high' : 'low'}
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          />
          <MetricCard
            label="Buffer Storage Available"
            value={`${availableBufferStock} MT`}
            subtext={`Across ${godowns.length} regional relief godowns`}
            riskLevel="moderate"
            icon={<Warehouse className="w-4 h-4 text-emerald-600" />}
          />
          <MetricCard
            label="Emergency Pickups"
            value={pickupRequests.length.toString().padStart(2, '0')}
            subtext={`${pickupRequests.filter((p) => p.status === 'dispatched').length} approved & dispatched`}
            riskLevel={pickupRequests.length > 0 ? 'high' : 'low'}
            icon={<Send className="w-4 h-4 text-purple-600" />}
          />
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Shipments List + Side Inspection / Godown Network */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left: Filterable Shipments List */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200/80 bg-white overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3.5 bg-slate-50/80 backdrop-blur-xs border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shipment ID, cargo, vehicle, route..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  All ({totalShipments})
                </button>
                <button
                  onClick={() => setStatusFilter('disrupted')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1',
                    statusFilter === 'disrupted'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                      : 'text-rose-600 hover:bg-rose-50/60'
                  )}
                >
                  Disrupted ({disruptedShipments.length})
                </button>
                <button
                  onClick={() => setStatusFilter('detoured')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    statusFilter === 'detoured' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Detoured ({reroutedShipments.length})
                </button>
                <button
                  onClick={() => setStatusFilter('buffered')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    statusFilter === 'buffered' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Buffered ({bufferedShipments.length})
                </button>
                <button
                  onClick={() => setStatusFilter('on_track')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    statusFilter === 'on_track' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  On Track ({onTrackShipments.length})
                </button>
              </div>

              {/* Priority Filters */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setPriorityFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    priorityFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Priority: All
                </button>
                <button
                  onClick={() => setPriorityFilter('critical')}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    priorityFilter === 'critical' ? 'bg-rose-50 text-rose-700 shadow-2xs' : 'text-rose-600 hover:bg-rose-50/60'
                  )}
                >
                  P1
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                    priorityFilter === 'high' ? 'bg-amber-50 text-amber-700 shadow-2xs' : 'text-amber-600 hover:bg-amber-50/60'
                  )}
                >
                  P2
                </button>
              </div>
            </div>
          </div>

          {/* Shipment Rows List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredShipments.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-slate-800">No consignments match your filter</p>
                <p className="text-xs text-slate-400 mt-1">Try resetting search or status filters</p>
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
                      'p-4 rounded-2xl border transition-all cursor-pointer select-none shadow-2xs',
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-100'
                        : isDisrupted
                        ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                    )}
                  >
                    {/* Top Row: IDs, Priority, Continuity Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                          {s.id}
                        </span>
                        <span className="font-bold text-xs text-slate-900">
                          {s.cargoCategory}
                        </span>
                        {getPriorityBadge(s.priority)}
                        {s.coldChainRequired && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shadow-2xs">
                            <Thermometer className="w-3 h-3 text-blue-600" />
                            {s.currentTemperatureC !== undefined ? `${s.currentTemperatureC} °C` : 'Cold-Chain'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {getContinuityStatusBadge(s)}
                      </div>
                    </div>

                    {/* Middle Row: Corridor, Cargo specs, SLA */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Corridor:</span>
                        <p className="font-semibold text-slate-800 truncate mt-0.5">
                          {s.origin} → {s.destination}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payload / Quantity:</span>
                        <p className="font-semibold text-slate-800 truncate mt-0.5">
                          {s.quantity} {s.unit} ({s.cargoCategory})
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Transport:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-mono font-bold text-slate-900">{s.vehicleId || 'Unassigned'}</span>
                          {assignedVehicle && (
                            <span className="text-slate-500 font-medium">({assignedVehicle.driverName})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Disruption Alert Note if affected */}
                    {isDisrupted && s.impactReason && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 shadow-2xs font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold">Corridor Hazard Impact: </span>
                          <span>{s.impactReason}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {s.delayMinutes ? `Expected Delay: +${s.delayMinutes} min` : 'Corridor Timeline: Nominal'}
                      </span>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {isDisrupted && assignedVehicle && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmergencyPickup(s)}
                              iconLeft={<Warehouse className="w-3 h-3 text-emerald-600" />}
                              className="text-xs py-1 h-7 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-2xs font-semibold"
                            >
                              Emergency Godown
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleRerouteShipment(s)}
                              iconLeft={<RotateCw className="w-3 h-3" />}
                              className="text-xs py-1 h-7 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-2xs font-semibold"
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
                            className="text-xs py-1 h-7 rounded-xl font-semibold"
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
        <div className="w-full lg:w-96 bg-slate-50/60 border-l border-slate-200/80 overflow-y-auto p-4 space-y-4 shrink-0">
          {/* Section 1: Regional Relief Godowns Buffer */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-emerald-600" />
                Regional Buffer Godowns
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                {godowns.length} Facilities Active
              </span>
            </div>

            <div className="space-y-2.5">
              {godowns.map((g: Godown) => {
                const totalCap = g.totalCapacity || (g.availableStock + 30);
                const stockPercent = Math.min(100, Math.round((g.availableStock / totalCap) * 100));
                return (
                  <div key={g.id} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5 hover:shadow-xs transition-shadow">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{g.name}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">{g.locationLabel}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs shrink-0">
                        {g.availableStock} MT Available
                      </span>
                    </div>

                    {/* Stock capacity bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-1">
                        <span>Stock Level</span>
                        <span className="font-semibold text-slate-700">{stockPercent}% ({g.availableStock}/{totalCap} MT)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${stockPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{g.suitableCargoTypes?.join(', ') || 'General & Pharma'}</span>
                      </span>
                      <span className="font-bold text-blue-700 capitalize shrink-0">
                        {g.status || 'operational'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Active Emergency Pickups Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-4 h-4 text-purple-600" />
                Emergency Pickups Pipeline
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                {pickupRequests.length} Active
              </span>
            </div>

            {pickupRequests.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-400 font-medium shadow-2xs">
                No active emergency pickup requests. All disrupted corridors handled via standard rerouting or on track.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pickupRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-800">{req.id}</span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs',
                          req.status === 'dispatched'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'declined'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        )}
                      >
                        {req.status === 'dispatched' ? 'DISPATCHED' : req.status === 'declined' ? 'DECLINED' : 'PENDING APPROVAL'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-bold">
                      Vehicle: <span className="font-mono text-blue-700">{req.vehicleId}</span> ({req.driverName})
                    </p>

                    <p className="text-[11px] text-slate-600 font-medium">
                      Diverted to <span className="font-bold text-slate-900">{req.godownName}</span> · {req.quantity} MT {req.cargoType}
                    </p>

                    {req.contractorName && (
                      <p className="text-[10px] text-purple-700 font-semibold pt-1.5 border-t border-slate-100">
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

      {/* Emergency Godown Recommendation Modal */}
      {godownModalShipment && (() => {
        const assignedV = activeVehicles.find((v) => v.id === godownModalShipment.vehicleId);
        const bestGodownMatch = assignedV ? findNearestSuitableGodown(assignedV, godowns) : undefined;
        const targetGodown = assignedV?.recommendedGodownId
          ? godowns.find((g) => g.id === assignedV.recommendedGodownId) || bestGodownMatch?.godown || godowns[0]
          : bestGodownMatch?.godown || godowns[0];
        const distKm = assignedV?.recommendedGodownDistanceKm ?? bestGodownMatch?.distanceKm ?? 45;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700 shadow-2xs">
                    <Warehouse className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-emerald-900 tracking-tight">Emergency Godown Recommendation</h3>
                    <p className="text-[11px] text-emerald-700 font-medium">Relief Storage Allocation & Pickup Request</p>
                  </div>
                </div>
                <button
                  onClick={() => setGodownModalShipment(null)}
                  className="p-1.5 rounded-xl hover:bg-emerald-100/80 text-emerald-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Target Shipment Summary */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Consignment {godownModalShipment.id}</span>
                    <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">{godownModalShipment.vehicleId}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{godownModalShipment.cargoCategory} · {godownModalShipment.quantity} {godownModalShipment.unit}</p>
                  <p className="text-slate-400 text-[11px] font-medium">{godownModalShipment.origin} → {godownModalShipment.destination}</p>
                </div>

                {/* Godown Recommendation Card */}
                {targetGodown ? (
                  <div className="p-4.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Optimal Emergency Storage Node
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        {targetGodown.availableStock} Units Stock Available
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-emerald-950">{targetGodown.name}</h4>
                      <p className="text-emerald-800 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {targetGodown.locationLabel}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-emerald-200/80 text-[11px]">
                      <div>
                        <span className="text-emerald-800 font-medium">Proximity / Distance:</span>
                        <p className="font-bold text-emerald-950">~{distKm} km from position</p>
                      </div>
                      <div>
                        <span className="text-emerald-800 font-medium">Cargo Compatibility:</span>
                        <p className="font-bold text-emerald-950">
                          {godownModalShipment.coldChainRequired ? 'Cold-Chain Refrigerated' : 'Relief Rations Compatible'}
                        </p>
                      </div>
                      <div>
                        <span className="text-emerald-800 font-medium">Shipment Urgency:</span>
                        <p className="font-bold text-rose-700">
                          {godownModalShipment.priority === 'critical' ? 'P1 Critical Allocation' : 'P2 High Allocation'}
                        </p>
                      </div>
                      <div>
                        <span className="text-emerald-800 font-medium">Corridor Accessibility:</span>
                        <p className="font-bold text-emerald-950">Open Feeder Access</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium shadow-2xs">
                    No suitable godown found matching cargo requirements.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGodownModalShipment(null)}
                    className="rounded-xl shadow-2xs font-semibold text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleConfirmEmergencyPickup(godownModalShipment)}
                    iconLeft={<Send className="w-3.5 h-3.5" />}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs cursor-pointer"
                  >
                    Request Emergency Pickup & Allocation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
