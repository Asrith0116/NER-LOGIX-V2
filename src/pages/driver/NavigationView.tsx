import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer } from '@/components/map/MapContainer';
import { Notification } from '@/components/ui/Notification';
import { Button } from '@/components/ui/Button';
import { DEMO_ROUTES, LOCATIONS, DEMO_TRIP } from '@/data/demo';
import { formatEta } from '@/utils';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore, getReactiveDisplayRoute } from '@/store/networkStore';
import { useCurrentDriver } from '@/hooks/useCurrentDriver';
import { getPendingIncidents, updateIncidentSyncStatus } from '@/utils/idb';
import {
  Navigation,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  RotateCw,
  Warehouse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function NetworkStateDisplay({
  networkStatus,
  pendingIncidentsCount,
}: {
  networkStatus: 'online' | 'offline' | 'syncing';
  pendingIncidentsCount: number;
}) {
  const configs = {
    online: { icon: <Wifi className="w-3.5 h-3.5" />, label: 'Network Connected', color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
    offline: { icon: <WifiOff className="w-3.5 h-3.5" />, label: 'Network Unavailable — Offline Mode', color: 'text-rose-700 border-rose-200 bg-rose-50' },
    syncing: { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: 'Reconnected — Synchronizing...', color: 'text-amber-700 border-amber-200 bg-amber-50' },
  };
  const cfg = configs[networkStatus];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={networkStatus}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs ${cfg.color}`}
      >
        {cfg.icon}
        {cfg.label}
        {pendingIncidentsCount > 0 && networkStatus === 'offline' && (
          <span className="ml-1.5 px-2 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold shadow-2xs">
            {pendingIncidentsCount} queued
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function NavigationView() {
  const {
    networkStatus,
    setNetworkStatus,
    selectedRouteId,
    selectedCustomRoute,
    pendingIncidentsCount,
    setPendingIncidentsCount,
    vehicleTripContexts,
  } = useAppStore();
  const navigate = useNavigate();

  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const pickupRequests = useNetworkStore((state) => state.pickupRequests);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);

  const currentDriver = useCurrentDriver();
  const driverVehicle = currentDriver.vehicle;

  const driverTripCtx = driverVehicle ? vehicleTripContexts[driverVehicle.id] : undefined;

  const isDriverDisrupted = Boolean(driverVehicle?.affectedByDisruptionId);
  const driverRerouted = driverVehicle?.rerouteStatus === 'active';
  const reactiveRoute = driverVehicle ? getReactiveDisplayRoute(driverVehicle) : undefined;

  const nl02Vehicle = activeVehicles.find((v) => v.id === 'NL-02-C-3391');
  const nl02InFallback =
    Boolean(nl02Vehicle) &&
    (nl02Vehicle?.rerouteStatus === 'no_alternative' || nl02Vehicle?.status === 'emergency_pickup');
  const emergencyVehicle =
    driverVehicle &&
    (driverVehicle.rerouteStatus === 'no_alternative' || driverVehicle.status === 'emergency_pickup')
      ? driverVehicle
      : nl02InFallback
        ? nl02Vehicle
        : undefined;

  const emergencyRequest = emergencyVehicle
    ? pickupRequests.find((r) => r.vehicleId === emergencyVehicle.id)
    : undefined;

  const activeRoute =
    driverTripCtx?.committedRoute ||
    driverTripCtx?.selectedRoute ||
    (driverVehicle?.plannedRouteId
      ? Object.values(DEMO_ROUTES).find((r) => r.id === driverVehicle.plannedRouteId)
      : undefined) ||
    selectedCustomRoute ||
    DEMO_TRIP.routes.find((r) => r.id === selectedRouteId) ||
    DEMO_ROUTES.saferRoute;

  const navRoutes = driverRerouted && reactiveRoute
    ? [activeRoute, reactiveRoute]
    : [activeRoute];
  const displayEta = driverRerouted && driverVehicle?.etaMinutes
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

  const [justSyncedCount, setJustSyncedCount] = useState(0);
  const [reroutingInProgress, setReroutingInProgress] = useState(false);

  useEffect(() => {
    getPendingIncidents().then((incidents) => setPendingIncidentsCount(incidents.length));
  }, [setPendingIncidentsCount]);

  const simulateOffline = () => {
    setNetworkStatus('offline');
  };

  const simulateSync = async () => {
    setNetworkStatus('syncing');
    const pending = await getPendingIncidents();
    for (const inc of pending) {
      await updateIncidentSyncStatus(inc.id, 'pending_verification');
    }
    setTimeout(() => {
      setNetworkStatus('online');
      setPendingIncidentsCount(0);
      setJustSyncedCount(pending.length);
      setTimeout(() => setJustSyncedCount(0), 5000);
    }, 2000);
  };

  const handleStartReroute = () => {
    if (!driverVehicle) return;
    setReroutingInProgress(true);
    setTimeout(() => {
      rerouteVehicle(driverVehicle.id);
      setReroutingInProgress(false);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-[#f4f6f8]">
      {/* Cockpit Top Bar */}
      <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Turn-by-Turn Guidance</h1>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="font-bold text-slate-900">{currentDriver.driverName}</span>
              <span className="font-mono text-slate-500">({currentDriver.vehicleId})</span>
              <span className="text-slate-300">·</span>
              <span>{driverRerouted ? (driverVehicle?.rerouteFromLabel || 'Current position') : originDisplayName}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span>{destDisplayName}</span>
              <span className="text-slate-300">·</span>
              <span className="font-bold text-blue-600">
                {driverRerouted ? `Alternate Corridor Active (via ${driverVehicle?.rerouteTo || 'Alternate Route'})` : activeRoute.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <NetworkStateDisplay networkStatus={networkStatus} pendingIncidentsCount={pendingIncidentsCount} />
          {networkStatus === 'online' ? (
            <Button size="sm" variant="outline" onClick={simulateOffline} iconLeft={<WifiOff className="w-3.5 h-3.5" />}>
              Simulate Offline
            </Button>
          ) : networkStatus === 'offline' ? (
            <Button size="sm" variant="primary" onClick={simulateSync} iconLeft={<RefreshCw className="w-3.5 h-3.5" />}>
              Restore Network
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Map */}
        <div className="flex-1 relative h-80 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200/80">
          <MapContainer
            center={[25.7, 93.2]}
            zoom={7}
            routes={navRoutes}
            selectedRouteId={reactiveRoute?.id || activeRoute.id}
            incidents={activeIncidents}
            originMarker={{ latlng: [originLocation.lat, originLocation.lng], label: `${originDisplayName} Hub` }}
            destinationMarker={{ latlng: [destLocation.lat, destLocation.lng], label: `${destDisplayName} Hub` }}
            vehicles={driverVehicle ? [driverVehicle] : []}
            userRole="driver"
            onRerouteVehicle={handleStartReroute}
          />

          {/* Offline Banner pill */}
          <AnimatePresence>
            {networkStatus === 'offline' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]"
              >
                <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full font-bold shadow-xl flex items-center gap-2 border border-white/15">
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  Operating in Offline Autonomous Mode (IndexedDB Cached)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tactical Nav info panel */}
        <div className="w-full lg:w-80 xl:w-88 border-l border-slate-200/80 bg-white/95 backdrop-blur-md overflow-y-auto shrink-0 flex flex-col divide-y divide-slate-100">
          {/* ETA & distance banner */}
          <div className="p-4 bg-slate-50/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Active Trip Metrics</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Estimated ETA</span>
                </div>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {formatEta(displayEta)}
                </p>
                {driverRerouted && (
                  <p className="text-[10px] text-blue-600 font-bold mt-0.5">Detour adjusted</p>
                )}
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Distance</span>
                </div>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {activeRoute.distanceKm} km
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Mountain Highway</p>
              </div>
            </div>
          </div>

          {/* Tactical Alerts & Action Trigger */}
          <div className="p-4 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Corridor Conditions & Actions</p>
            <div className="space-y-3">
              {/* Direct Driver Reroute Action Card */}
              {isDriverDisrupted && !driverRerouted && (
                <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 shadow-2xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-950">Road Disruption Ahead</p>
                      <p className="text-[11px] text-rose-800 mt-0.5 font-medium leading-relaxed">
                        {driverVehicle?.impactReason || 'Corridor blocked by incident ahead. Alternate route is ready.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-2xs rounded-xl"
                    onClick={handleStartReroute}
                    disabled={reroutingInProgress}
                    iconLeft={reroutingInProgress ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                  >
                    {reroutingInProgress ? 'Calculating...' : 'Start Reroute from Current Position'}
                  </Button>
                </div>
              )}

              {driverRerouted && driverVehicle && (
                <Notification
                  type="info"
                  title="Detour Active"
                  message={`${driverVehicle.rerouteFromLabel || 'Current Position'} → ${driverVehicle.rerouteTo || driverVehicle.destination || DEMO_TRIP.destination.shortName}. Alternate corridor active.`}
                  visible
                />
              )}

              {driverVehicle?.rerouteStatus === 'no_alternative' && (
                <Notification
                  type="error"
                  title="No Alternate Route"
                  message={`${driverVehicle.id}: Planned corridor is blocked. No alternate route is available from current position.`}
                  visible
                />
              )}

              {emergencyVehicle && emergencyVehicle.rerouteStatus === 'no_alternative' && !emergencyRequest && emergencyVehicle.recommendedGodownId && (
                <div className="space-y-2.5 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 shadow-2xs">
                  <Notification
                    type="error"
                    title="Emergency Supply Continuity"
                    message={`Route blocked. No viable alternate corridor. Relief storage godown available for ${emergencyVehicle.id}.`}
                    visible
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    className="w-full rounded-xl"
                    onClick={() => requestEmergencyPickup(emergencyVehicle.id)}
                    iconLeft={<Warehouse className="w-3.5 h-3.5" />}
                  >
                    Request Emergency Pickup
                  </Button>
                </div>
              )}

              {emergencyRequest?.status === 'requested' && (
                <Notification
                  type="warning"
                  title="Emergency Pickup Requested"
                  message={`${emergencyRequest.vehicleId}: Pickup location: ${emergencyRequest.godownName}. Awaiting contractor dispatch.`}
                  visible
                />
              )}

              {(emergencyRequest?.status === 'dispatched' || emergencyRequest?.status === 'approved') && (
                <Notification
                  type="success"
                  title="Pickup Approved"
                  message={`Supplies available at ${emergencyRequest.godownName}. Destination: ${emergencyRequest.destination}. Relief transit dispatched.`}
                  visible
                />
              )}

              {justSyncedCount > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <Notification
                    type="success"
                    title="Incidents Synced"
                    message="Field hazard reports uploaded to SDMA verification queue."
                    visible
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Offline Status checklist */}
          <div className="p-4 bg-slate-50/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Offline Field Readiness</p>
            <div className="space-y-2">
              {[
                { label: 'Route waypoints & state (IDB)', available: true },
                { label: 'Online map tiles', available: networkStatus === 'online' },
                { label: 'Offline hazard storage (IDB)', available: true },
                { label: 'SDMA cloud link', available: networkStatus === 'online' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{item.label}</span>
                  <span className={item.available ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {item.available ? '✓ Ready' : '✗ Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Dock */}
          <div className="p-4 space-y-2.5 bg-white">
            <Button
              variant="danger"
              size="sm"
              className="w-full text-xs rounded-xl"
              onClick={() => navigate('/driver/report')}
              iconLeft={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Report Hazard from Field
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs rounded-xl"
              onClick={() => {
                useAppStore.getState().setTripState({ isJourneyActive: false, activeTripId: null, selectedRouteId: null, isOfflineReady: false });
                navigate('/driver');
              }}
            >
              End Journey & Return to Cockpit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
