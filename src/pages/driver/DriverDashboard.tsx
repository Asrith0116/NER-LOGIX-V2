import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DEMO_TRIP, DEMO_ROUTES, LOCATIONS } from '@/data/demo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { MapContainer } from '@/components/map/MapContainer';
import { DriverVehicleSelector } from '@/components/ui/DriverVehicleSelector';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore, getReactiveDisplayRoute } from '@/store/networkStore';
import { formatEta } from '@/utils';
import {
  Package,
  Thermometer,
  Navigation,
  Route,
  CloudRain,
  Mountain,
  RotateCw,
  CheckCircle2,
  Warehouse,
  ShieldCheck,
  Truck,
  Eye,
  AlertTriangle,
  Database,
} from 'lucide-react';

export function DriverDashboard() {
  const { isJourneyActive, selectedRouteId, networkStatus, selectedDriverVehicleId } = useAppStore();

  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const roadSegments = useNetworkStore((state) => state.roadSegments);
  const godowns = useNetworkStore((state) => state.godowns);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);
  const syncFromIndexedDB = useNetworkStore((state) => state.syncFromIndexedDB);

  const [reroutingInProgress, setReroutingInProgress] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    syncFromIndexedDB();
  }, [syncFromIndexedDB]);

  // Derive active driver vehicle safely from selectedDriverVehicleId
  const driverVehicle =
    activeVehicles.find((v) => v.id === selectedDriverVehicleId) ||
    activeVehicles.find((v) => v.id === 'AS-01-J-4422') ||
    activeVehicles[0];

  const isDisrupted = Boolean(driverVehicle?.affectedByDisruptionId);
  const isRerouted = driverVehicle?.rerouteStatus === 'active';
  const hasNoAlternative = driverVehicle?.rerouteStatus === 'no_alternative';
  const isEmergencyPickup = driverVehicle?.status === 'emergency_pickup';

  // Base route respecting vehicle's planned corridor
  const activeRoute =
    (driverVehicle?.plannedRouteId
      ? Object.values(DEMO_ROUTES).find((r) => r.id === driverVehicle.plannedRouteId)
      : undefined) ||
    DEMO_TRIP.routes.find((r) => r.id === selectedRouteId) ||
    DEMO_ROUTES.saferRoute;

  const reactiveRoute = driverVehicle ? getReactiveDisplayRoute(driverVehicle) : undefined;
  const displayRoutes = isRerouted && reactiveRoute ? [activeRoute, reactiveRoute] : [activeRoute];
  const displayEta = isRerouted && driverVehicle?.etaMinutes
    ? driverVehicle.etaMinutes
    : (driverVehicle?.etaMinutes || activeRoute.etaMinutes);

  const originLocation = Object.values(LOCATIONS).find(
    (l) =>
      l.shortName.toLowerCase() === driverVehicle?.origin?.toLowerCase() ||
      l.name.toLowerCase().includes(driverVehicle?.origin?.toLowerCase() || '')
  ) || LOCATIONS.guwahati;

  const destLocation = Object.values(LOCATIONS).find(
    (l) =>
      l.shortName.toLowerCase() === driverVehicle?.destination?.toLowerCase() ||
      l.name.toLowerCase().includes(driverVehicle?.destination?.toLowerCase() || '')
  ) || LOCATIONS.imphal;

  const handleStartReroute = () => {
    if (!driverVehicle) return;
    setReroutingInProgress(true);
    setTimeout(() => {
      rerouteVehicle(driverVehicle.id);
      setReroutingInProgress(false);
      navigate('/driver/navigation');
    }, 850);
  };

  const handleEmergencyPickup = () => {
    if (!driverVehicle) return;
    requestEmergencyPickup(driverVehicle.id);
    navigate('/driver/navigation');
  };

  return (
    <div className="h-full flex flex-col bg-[#f8f8f7]">
      {/* Top Cockpit Header */}
      <div className="px-5 py-3 bg-white border-b border-[#e4e4e3] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                Field Operator Cockpit
              </span>
              <DriverVehicleSelector id="cockpit-driver-vehicle-selector" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#1a1a19] tracking-tight mt-1">
              {driverVehicle?.driverName} · {driverVehicle?.origin || 'Guwahati'} → {driverVehicle?.destination || 'Imphal'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge
              label={networkStatus === 'online' ? 'Network Connected' : 'Offline Cache (IDB)'}
              variant={networkStatus === 'online' ? 'success' : 'danger'}
            />
            <Button
              size="sm"
              variant={isJourneyActive ? 'primary' : 'outline'}
              onClick={() => navigate(isJourneyActive ? '/driver/navigation' : '/driver/trip')}
              iconLeft={isJourneyActive ? <Navigation className="w-3.5 h-3.5" /> : <Route className="w-3.5 h-3.5" />}
            >
              {isJourneyActive ? 'Active Navigation' : 'Plan Trip'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => navigate('/driver/report')}
              iconLeft={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Report Hazard
            </Button>
          </div>
        </div>

        {/* PRIMARY OPERATIONAL ACTION BANNER */}
        <div className="mt-2.5">
          <AnimatePresence mode="wait">
            {/* Case 1: Disrupted Ahead -> Reroute Recommendation */}
            {isDisrupted && !isRerouted && (
              <motion.div
                key="disrupted-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-xl bg-[#fef2f2] border border-[#fca5a5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#dc2626] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#991b1b] uppercase tracking-wide">
                        Road Hazard Detected Ahead
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#dc2626] text-white">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-[#7f1d1d] mt-0.5">
                      {driverVehicle?.impactReason || 'NH-2 Mao Gate Landslide verified by SDMA. Corridor blocked.'}
                    </p>
                    <p className="text-[11px] text-[#991b1b] font-medium mt-0.5">
                      Recommended Action: Alternate corridor via Lumding / Haflong detour available from your current position.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/driver/trip')}
                    className="border-[#fca5a5] text-[#991b1b] hover:bg-[#fee2e2]"
                  >
                    Review Alternate
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleStartReroute}
                    disabled={reroutingInProgress}
                    iconLeft={reroutingInProgress ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    className="bg-[#dc2626] hover:bg-[#b91c1c] text-white border-transparent"
                  >
                    {reroutingInProgress ? 'Computing Waypoints...' : 'Start Reroute from Here'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Case 2: Reroute Active */}
            {isRerouted && (
              <motion.div
                key="rerouted-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-xl bg-[#eff6ff] border border-[#93c5fd] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1e40af] uppercase tracking-wide">
                        Reactive Reroute Active
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#2563eb] text-white">
                        Avoiding Hazard
                      </span>
                    </div>
                    <p className="text-xs text-[#1e3a8a] mt-0.5">
                      Diverting from {driverVehicle?.rerouteFromLabel || 'Current Position'} toward {DEMO_TRIP.destination.name}.
                    </p>
                    <p className="text-[11px] text-[#2563eb] font-medium mt-0.5">
                      Updated ETA: {formatEta(displayEta)} (includes mountain bypass margin).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/driver/navigation')}
                    iconLeft={<Navigation className="w-3.5 h-3.5" />}
                  >
                    Continue Navigation
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Case 3: No Alternate Route Available */}
            {hasNoAlternative && (
              <motion.div
                key="no-alt-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-xl bg-[#fff7ed] border border-[#fed7aa] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ea580c] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#9a3412] uppercase tracking-wide">
                        No Viable Alternate Corridor
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#ea580c] text-white">
                        Emergency Fallback
                      </span>
                    </div>
                    <p className="text-xs text-[#7c2d12] mt-0.5">
                      Highway pass blocked. Emergency relief godown storage available nearby to preserve cold-chain cargo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleEmergencyPickup}
                    iconLeft={<Warehouse className="w-3.5 h-3.5" />}
                  >
                    Find Emergency Godown
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Case: Emergency Storage Authorized */}
            {isEmergencyPickup && (
              <motion.div
                key="emergency-pickup-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-xl bg-[#f0fdf4] border border-[#86efac] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#166534] uppercase tracking-wide">
                        Emergency Storage & Buffer Authorized
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#16a34a] text-white">
                        Secured
                      </span>
                    </div>
                    <p className="text-xs text-[#14532d] mt-0.5">
                      Emergency godown allocation confirmed by Supply Contractor. Proceed to {driverVehicle?.destination || 'designated emergency facility'}.
                    </p>
                    <p className="text-[11px] text-[#166534] font-medium mt-0.5">
                      {driverVehicle?.rerouteReason || 'Buffer stock and cold-chain relief capacity reserved.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/driver/navigation')}
                    className="bg-[#16a34a] hover:bg-[#15803d] text-white border-transparent"
                    iconLeft={<Navigation className="w-3.5 h-3.5" />}
                  >
                    Navigate to Emergency Godown
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Case 4: Normal Clean Journey */}
            {!isDisrupted && !isRerouted && !hasNoAlternative && !isEmergencyPickup && (
              <motion.div
                key="normal-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#166534] uppercase tracking-wide">
                        Safe to Continue Journey
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#16a34a] text-white">
                        Corridor Clear
                      </span>
                    </div>
                    <p className="text-xs text-[#14532d] mt-0.5">
                      No active road closures on planned route to {driverVehicle?.destination || DEMO_TRIP.destination.name}. Next checkpoint: {driverVehicle?.rerouteFromLabel || 'Nagaon Junction'}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/driver/navigation')}
                    iconLeft={<Navigation className="w-3.5 h-3.5" />}
                  >
                    Open Navigation View
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Cockpit Split: Map (Prominent) + Tactical Journey Card */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Prominent Geospatial Map Canvas */}
        <div className="flex-1 h-80 lg:h-full relative border-b lg:border-b-0 lg:border-r border-[#e4e4e3]">
          <MapContainer
            center={[25.75, 93.2]}
            zoom={7}
            routes={displayRoutes}
            selectedRouteId={reactiveRoute?.id || activeRoute.id}
            incidents={activeIncidents}
            vehicles={driverVehicle ? [driverVehicle] : []}
            godowns={godowns}
            userRole="driver"
            onRerouteVehicle={handleStartReroute}
            onRequestEmergencyPickup={handleEmergencyPickup}
            originMarker={{ latlng: [originLocation.lat, originLocation.lng], label: `${driverVehicle?.origin || 'Guwahati'} Hub` }}
            destinationMarker={{ latlng: [destLocation.lat, destLocation.lng], label: `${driverVehicle?.destination || 'Imphal'} Hub` }}
          />
        </div>

        {/* Focused Journey Console Panel */}
        <div className="w-full lg:w-88 xl:w-96 bg-white overflow-y-auto shrink-0 flex flex-col divide-y divide-[#e4e4e3]">
          {/* Section 1: Immediate Journey Progress */}
          <div className="p-4 space-y-3 bg-[#fafaf9]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
                Current Journey State
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-[#e4e4e3] text-[#1a1a19]">
                {isRerouted ? 'Detour Active' : isDisrupted ? 'Disrupted' : 'On Route'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#e4e4e3] shadow-xs space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-[#8a8a87] uppercase font-bold">Estimated Arrival</span>
                  <p className="text-xl font-bold text-[#1a1a19] tracking-tight">{formatEta(displayEta)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#8a8a87] uppercase font-bold">Total Distance</span>
                  <p className="text-sm font-semibold text-[#5a5a57]">{activeRoute.distanceKm} km</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#f4f4f3] flex items-center justify-between text-xs text-[#5a5a57]">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>Current Checkpoint:</span>
                </span>
                <span className="font-semibold text-[#1a1a19]">
                  {driverVehicle?.rerouteFromLabel || (driverVehicle?.status === 'idle' ? `${driverVehicle?.origin || 'Guwahati'} Hub (Staged)` : 'En Route Corridor')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Consignment & Cold-Chain */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#5a5a57]" />
                Cargo & Cold Chain
              </span>
              <span className="text-[10px] font-bold text-[#16a34a] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                Nominal
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Consignment:</span>
                <span className="font-semibold text-[#1a1a19]">{driverVehicle?.cargoType || DEMO_TRIP.cargo.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87] flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-[#2563eb]" />
                  Cargo Temp:
                </span>
                <span className="font-bold text-[#2563eb]">
                  {driverVehicle?.type.includes('Refrigerated') || driverVehicle?.cargoType?.includes('Vaccines') || driverVehicle?.cargoType?.includes('Pharma')
                    ? '4.2 °C (Cold Chain)'
                    : 'Ambient Controlled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8a8a87]">Vehicle Type:</span>
                <span className="font-medium text-[#1a1a19]">{driverVehicle?.type || 'Refrigerated Truck'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Mountain Pass & Terrain Context */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-[#5a5a57]" />
                Mountain Corridor Status
              </span>
              <span className="text-[10px] text-[#8a8a87]">Mao Pass Corridor</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3]">
                <CloudRain className="w-4 h-4 mx-auto text-[#2563eb] mb-1" />
                <p className="text-[10px] text-[#8a8a87]">Precipitation</p>
                <p className="font-bold text-[#1a1a19]">3.5 mm/h</p>
              </div>
              <div className="p-2 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3]">
                <Eye className="w-4 h-4 mx-auto text-[#d97706] mb-1" />
                <p className="text-[10px] text-[#8a8a87]">Visibility</p>
                <p className="font-bold text-[#1a1a19]">6.2 km</p>
              </div>
              <div className="p-2 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3]">
                <Mountain className="w-4 h-4 mx-auto text-[#5a5a57] mb-1" />
                <p className="text-[10px] text-[#8a8a87]">Pass Elevation</p>
                <p className="font-bold text-[#1a1a19]">1,650 m</p>
              </div>
            </div>
          </div>

          {/* Section 4: Upcoming Highway Segments */}
          <div className="p-4 space-y-2">
            <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider">
              Corridor Segments Ahead
            </span>
            <div className="space-y-1.5">
              {roadSegments.slice(0, 3).map((seg) => (
                <div key={seg.id} className="p-2 rounded-lg border border-[#e4e4e3] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-[#1a1a19]">{seg.name}</p>
                    <p className="text-[10px] text-[#8a8a87]">{seg.fromLocation} → {seg.toLocation}</p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      seg.status === 'blocked'
                        ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        : seg.status === 'caution'
                          ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'
                          : 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                    }`}
                  >
                    {seg.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Offline Resilience Status */}
          <div className="p-4 bg-[#fafaf9] mt-auto">
            <div className="flex items-center gap-2 text-xs text-[#5a5a57]">
              <Database className="w-3.5 h-3.5 text-[#16a34a]" />
              <span className="font-medium">IndexedDB Local Cache Active</span>
            </div>
            <p className="text-[11px] text-[#8a8a87] mt-0.5 leading-snug">
              Route profiles and emergency waypoints stored locally for offline mountain passes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
