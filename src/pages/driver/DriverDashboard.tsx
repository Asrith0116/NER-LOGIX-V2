import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DEMO_TRIP, DEMO_ROUTES, LOCATIONS } from '@/data/demo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { MapContainer } from '@/components/map/MapContainer';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore, getReactiveDisplayRoute } from '@/store/networkStore';
import { useCurrentDriver } from '@/hooks/useCurrentDriver';
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
  const { isJourneyActive, selectedRouteId, networkStatus, vehicleTripContexts } = useAppStore();

  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const roadSegments = useNetworkStore((state) => state.roadSegments);
  const godowns = useNetworkStore((state) => state.godowns);
  const weatherData = useNetworkStore((state) => state.weatherData);
  const elevationProfiles = useNetworkStore((state) => state.elevationProfiles);
  const weatherSpikeActive = useNetworkStore((state) => state.weatherSpikeActive);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);
  const syncFromIndexedDB = useNetworkStore((state) => state.syncFromIndexedDB);

  const [reroutingInProgress, setReroutingInProgress] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    syncFromIndexedDB();
  }, [syncFromIndexedDB]);

  // Derive active driver vehicle safely from unified currentDriver hook
  const currentDriver = useCurrentDriver();
  const driverVehicle = currentDriver.vehicle;

  const driverTripCtx = driverVehicle ? vehicleTripContexts[driverVehicle.id] : undefined;

  const isDisrupted = Boolean(driverVehicle?.affectedByDisruptionId);
  const isRerouted = driverVehicle?.rerouteStatus === 'active';
  const hasNoAlternative = driverVehicle?.rerouteStatus === 'no_alternative';
  const isEmergencyPickup = driverVehicle?.status === 'emergency_pickup';

  // Base route respecting committed trip context or vehicle's planned corridor
  const activeRoute =
    driverTripCtx?.committedRoute ||
    driverTripCtx?.selectedRoute ||
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

  const locDict = LOCATIONS as Record<string, typeof LOCATIONS.guwahati>;
  const originLocation = (driverTripCtx?.originKey && locDict[driverTripCtx.originKey])
    ? locDict[driverTripCtx.originKey]
    : Object.values(LOCATIONS).find(
        (l) =>
          l.shortName.toLowerCase() === driverVehicle?.origin?.toLowerCase() ||
          l.name.toLowerCase().includes(driverVehicle?.origin?.toLowerCase() || '')
      ) || LOCATIONS.guwahati;

  const destKey = driverTripCtx?.destKey || driverTripCtx?.destinationKey;
  const destLocation = (destKey && locDict[destKey])
    ? locDict[destKey]
    : Object.values(LOCATIONS).find(
        (l) =>
          l.shortName.toLowerCase() === driverVehicle?.destination?.toLowerCase() ||
          l.name.toLowerCase().includes(driverVehicle?.destination?.toLowerCase() || '')
      ) || LOCATIONS.imphal;

  const originDisplayName = driverTripCtx?.originName || driverVehicle?.origin || originLocation.shortName;
  const destDisplayName = driverTripCtx?.destinationName || driverVehicle?.destination || destLocation.shortName;
  const cargoDisplayName = driverTripCtx?.cargoType || driverTripCtx?.cargoCategory || driverVehicle?.cargoType || 'Essential Supplies';

  // Dynamic Mountain Corridor Context derived from active corridor, route, weather & terrain
  const activeCorridorKey = (activeRoute as unknown as { corridorKey?: string })?.corridorKey || (activeRoute.id === 'route-b' ? 'nh2_mountain_direct' : 'valley_low_risk');
  const corridorDisplayName =
    (activeRoute as unknown as { corridorName?: string })?.corridorName ||
    (destLocation.shortName === 'Imphal' ? 'Mao Pass Corridor (NH-2)' :
     destLocation.shortName === 'Kohima' ? 'Doyang Ridge / Naga Hills (NH-2)' :
     destLocation.shortName === 'Silchar' ? 'Barail Mountain Pass (NH-27)' :
     destLocation.shortName === 'Dimapur' ? 'Brahmaputra Lowland Approach' :
     'Regional Strategic Corridor');

  const destWeather = weatherData[destLocation.shortName] || weatherData[destLocation.name];
  const originWeather = weatherData[originLocation.shortName] || weatherData[originLocation.name];
  const livePrecip = destWeather?.precipitationMm ?? originWeather?.precipitationMm ?? (weatherSpikeActive ? 45.0 : 6.5);

  const elevProfile = elevationProfiles[activeCorridorKey];
  const passElevationMeters = elevProfile?.maxElevationMeters ?? (
    destLocation.shortName === 'Imphal' ? 1740 :
    destLocation.shortName === 'Kohima' ? 1444 :
    destLocation.shortName === 'Silchar' ? 920 :
    destLocation.shortName === 'Dimapur' ? 260 :
    1650
  );

  // Atmospheric optical visibility derived deterministically from live corridor precipitation
  const visibilityKm = Math.max(1.5, Math.round((13.5 - Math.min(11.5, livePrecip * 0.45)) * 10) / 10);

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
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      {/* Top Cockpit Header */}
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50/90 text-blue-700 border border-blue-200/80 shadow-2xs">
                Field Operator Cockpit
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">
              {currentDriver.driverName} · {originDisplayName} → {destDisplayName}
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
        <div className="mt-3">
          <AnimatePresence mode="wait">
            {/* Case 1: Disrupted Ahead -> Reroute Recommendation */}
            {isDisrupted && !isRerouted && (
              <motion.div
                key="disrupted-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 shadow-[0_4px_16px_-4px_rgba(244,63,94,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                        Road Hazard Detected Ahead
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 mt-0.5 font-medium">
                      {driverVehicle?.impactReason || 'NH-2 Mao Gate Landslide verified by SDMA. Corridor blocked.'}
                    </p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Recommended Action: Alternate corridor via Lumding / Haflong detour available from your current position.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/driver/trip')}
                    className="border-rose-200 text-rose-800 hover:bg-rose-100"
                  >
                    Review Alternate
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleStartReroute}
                    disabled={reroutingInProgress}
                    iconLeft={reroutingInProgress ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
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
                className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/90 shadow-[0_4px_16px_-4px_rgba(37,99,235,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                        Reactive Reroute Active
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
                        Avoiding Hazard
                      </span>
                    </div>
                    <p className="text-xs text-blue-900 mt-0.5 font-medium">
                      Diverting from {driverVehicle?.rerouteFromLabel || 'Current Position'} toward {destDisplayName}.
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
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
                className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 shadow-[0_4px_16px_-4px_rgba(217,119,6,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                        No Viable Alternate Corridor
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-2xs">
                        Emergency Fallback
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-0.5 font-medium">
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
                className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Emergency Storage & Buffer Authorized
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                        Secured
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 mt-0.5 font-medium">
                      Emergency godown allocation confirmed by Supply Contractor. Proceed to {driverVehicle?.destination || 'designated emergency facility'}.
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      {driverVehicle?.rerouteReason || 'Buffer stock and cold-chain relief capacity reserved.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/driver/navigation')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
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
                className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Safe to Continue Journey
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                        Corridor Clear
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 mt-0.5 font-medium">
                      No active road closures on planned route to {destDisplayName}. Next checkpoint: {driverVehicle?.rerouteFromLabel || 'Nagaon Junction'}.
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
        <div className="flex-1 h-80 lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-200/80">
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
        <div className="w-full lg:w-88 xl:w-96 bg-white/95 backdrop-blur-md overflow-y-auto shrink-0 flex flex-col divide-y divide-slate-100 border-l border-slate-200/80">
          {/* Section 1: Immediate Journey Progress */}
          <div className="p-4 space-y-3 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Journey State
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                {isRerouted ? 'Detour Active' : isDisrupted ? 'Disrupted' : 'On Route'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Estimated Arrival</span>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">{formatEta(displayEta)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Distance</span>
                  <p className="text-sm font-semibold text-slate-600">{activeRoute.distanceKm} km</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Current Checkpoint:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {driverVehicle?.rerouteFromLabel || (driverVehicle?.status === 'idle' ? `${driverVehicle?.origin || 'Guwahati'} Hub (Staged)` : 'En Route Corridor')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Consignment & Cold-Chain */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                Cargo & Cold Chain
              </span>
              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Nominal
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Assigned Driver:</span>
                <span className="font-bold text-slate-900">{currentDriver.driverName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vehicle ID:</span>
                <span className="font-mono font-bold text-slate-900">{currentDriver.vehicleId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Consignment:</span>
                <span className="font-semibold text-slate-900">{cargoDisplayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                  Cargo Temp:
                </span>
                <span className="font-bold text-blue-600">
                  {driverVehicle?.type.includes('Refrigerated') || driverVehicle?.cargoType?.includes('Vaccines') || driverVehicle?.cargoType?.includes('Pharma')
                    ? '4.2 °C (Cold Chain)'
                    : 'Ambient Controlled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vehicle Type:</span>
                <span className="font-medium text-slate-900">{driverVehicle?.type || 'Refrigerated Truck'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Mountain Pass & Terrain Context */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-slate-500" />
                Mountain Corridor Status
              </span>
              <span className="text-[10px] text-slate-700 font-semibold">{corridorDisplayName}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs">
                <CloudRain className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                <p className="text-[10px] text-slate-500">Precipitation</p>
                <p className="font-bold text-slate-900">{livePrecip.toFixed(1)} mm/h</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs">
                <Eye className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                <p className="text-[10px] text-slate-500">Visibility</p>
                <p className="font-bold text-slate-900">{visibilityKm.toFixed(1)} km</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs">
                <Mountain className="w-4 h-4 mx-auto text-slate-600 mb-1" />
                <p className="text-[10px] text-slate-500">Pass Elevation</p>
                <p className="font-bold text-slate-900">{passElevationMeters.toLocaleString()} m</p>
              </div>
            </div>
          </div>

          {/* Section 4: Upcoming Highway Segments */}
          <div className="p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Corridor Segments Ahead
            </span>
            <div className="space-y-2">
              {roadSegments.slice(0, 3).map((seg) => (
                <div key={seg.id} className="p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{seg.name}</p>
                    <p className="text-[10px] text-slate-500">{seg.fromLocation} → {seg.toLocation}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-2xs ${
                      seg.status === 'blocked'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        : seg.status === 'caution'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    }`}
                  >
                    {seg.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Offline Resilience Status */}
          <div className="p-4 bg-slate-50/60 mt-auto">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">IndexedDB Local Cache Active</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Route profiles and emergency waypoints stored locally for offline mountain passes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
