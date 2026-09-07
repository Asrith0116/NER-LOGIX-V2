import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer } from '@/components/map/MapContainer';
import { Notification } from '@/components/ui/Notification';
import { Button } from '@/components/ui/Button';
import { DriverVehicleSelector } from '@/components/ui/DriverVehicleSelector';
import { DEMO_ROUTES, LOCATIONS, DEMO_TRIP } from '@/data/demo';
import { formatEta } from '@/utils';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore, getReactiveDisplayRoute } from '@/store/networkStore';
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
    online: { icon: <Wifi className="w-4 h-4" />, label: 'Network Connected', color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' },
    offline: { icon: <WifiOff className="w-4 h-4" />, label: 'Network Unavailable — Offline Mode', color: 'text-[#dc2626]', bg: 'bg-[#fef2f2]' },
    syncing: { icon: <RefreshCw className="w-4 h-4 animate-spin" />, label: 'Reconnected — Synchronizing...', color: 'text-[#d97706]', bg: 'bg-[#fffbeb]' },
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border ${cfg.color} ${cfg.bg}`}
      >
        {cfg.icon}
        {cfg.label}
        {pendingIncidentsCount > 0 && networkStatus === 'offline' && (
          <span className="ml-2 px-1.5 py-0.5 bg-[#dc2626] text-white rounded-full text-[10px]">
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
    selectedDriverVehicleId,
  } = useAppStore();
  const navigate = useNavigate();

  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const pickupRequests = useNetworkStore((state) => state.pickupRequests);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);

  const driverVehicle =
    activeVehicles.find((v) => v.id === selectedDriverVehicleId) ||
    activeVehicles.find((v) => v.id === 'AS-01-J-4422') ||
    activeVehicles[0];

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
    selectedCustomRoute ||
    (driverVehicle?.plannedRouteId
      ? Object.values(DEMO_ROUTES).find((r) => r.id === driverVehicle.plannedRouteId)
      : undefined) ||
    DEMO_TRIP.routes.find((r) => r.id === selectedRouteId) ||
    DEMO_ROUTES.saferRoute;

  const navRoutes = driverRerouted && reactiveRoute
    ? [activeRoute, reactiveRoute]
    : [activeRoute];
  const displayEta = driverRerouted && driverVehicle?.etaMinutes
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
    <div className="h-full flex flex-col bg-[#f8f8f7]">
      {/* Cockpit Top Bar */}
      <div className="px-6 py-3 bg-white border-b border-[#e4e4e3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center text-[#2563eb]">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-[#1a1a19]">Turn-by-Turn Guidance</h1>
              <DriverVehicleSelector id="nav-driver-vehicle-selector" compact />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#8a8a87] mt-0.5">
              <span>{driverRerouted ? (driverVehicle?.rerouteFromLabel || 'Current position') : (driverVehicle?.origin || DEMO_TRIP.origin.shortName)}</span>
              <ChevronRight className="w-3 h-3" />
              <span>{driverVehicle?.destination || DEMO_TRIP.destination.shortName}</span>
              <span className="mx-1">·</span>
              <span className="font-medium text-[#2563eb]">
                {driverRerouted ? `Alternate Corridor Active (via ${driverVehicle?.rerouteTo || 'Alternate Route'})` : activeRoute.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        <div className="flex-1 relative h-80 lg:h-full border-b lg:border-b-0 lg:border-r border-[#e4e4e3]">
          <MapContainer
            center={[25.7, 93.2]}
            zoom={7}
            routes={navRoutes}
            selectedRouteId={reactiveRoute?.id || activeRoute.id}
            incidents={activeIncidents}
            originMarker={{ latlng: [originLocation.lat, originLocation.lng], label: `${driverVehicle?.origin || 'Guwahati'} Hub` }}
            destinationMarker={{ latlng: [destLocation.lat, destLocation.lng], label: `${driverVehicle?.destination || 'Imphal'} Hub` }}
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
                className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]"
              >
                <div className="bg-[#1a1a19]/95 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full font-medium shadow-lg flex items-center gap-2 border border-white/10">
                  <WifiOff className="w-3.5 h-3.5 text-[#f87171]" />
                  Operating in Offline Autonomous Mode (IndexedDB Cached)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tactical Nav info panel */}
        <div className="w-full lg:w-80 border-l border-[#e4e4e3] bg-white overflow-y-auto shrink-0 flex flex-col">
          {/* ETA & distance banner */}
          <div className="px-4 py-3.5 border-b border-[#e4e4e3] bg-[#fafaf9]">
            <p className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider mb-2">Live Trip Telemetry</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-white border border-[#e4e4e3]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span className="text-[10px] text-[#8a8a87] font-medium">Estimated ETA</span>
                </div>
                <p className="text-xl font-bold text-[#1a1a19] tabular-nums">
                  {formatEta(displayEta)}
                </p>
                {driverRerouted && (
                  <p className="text-[10px] text-[#2563eb] font-semibold mt-0.5">Detour adjusted</p>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#e4e4e3]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#16a34a]" />
                  <span className="text-[10px] text-[#8a8a87] font-medium">Distance</span>
                </div>
                <p className="text-xl font-bold text-[#1a1a19] tabular-nums">
                  {activeRoute.distanceKm} km
                </p>
                <p className="text-[10px] text-[#8a8a87] mt-0.5">Mountain Highway</p>
              </div>
            </div>
          </div>

          {/* Tactical Alerts & Action Trigger */}
          <div className="px-4 py-3.5 border-b border-[#e4e4e3] flex-1">
            <p className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider mb-2">Corridor Conditions & Actions</p>
            <div className="space-y-2.5">
              {/* Direct Driver Reroute Action Card */}
              {isDriverDisrupted && !driverRerouted && (
                <div className="p-3 rounded-lg bg-[#fef2f2] border border-[#fca5a5] space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-[#991b1b]">Road Disruption Ahead</p>
                      <p className="text-[11px] text-[#7f1d1d] mt-0.5">
                        {driverVehicle?.impactReason || 'Corridor blocked by incident ahead. Alternate route is ready.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white"
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
                <div className="space-y-2 p-3 rounded-lg bg-[#fff7ed] border border-[#fed7aa]">
                  <Notification
                    type="error"
                    title="Emergency Supply Continuity"
                    message={`Route blocked. No viable alternate corridor. Relief storage godown available for ${emergencyVehicle.id}.`}
                    visible
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    className="w-full"
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
          <div className="px-4 py-3 border-b border-[#e4e4e3] bg-[#fafaf9]">
            <p className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider mb-2">Offline Field Readiness</p>
            <div className="space-y-1.5">
              {[
                { label: 'Corridor vector cached', available: true },
                { label: 'Base map tiles', available: true },
                { label: 'Offline hazard storage (IDB)', available: true },
                { label: 'SDMA cloud link', available: networkStatus === 'online' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-[#5a5a57]">{item.label}</span>
                  <span className={item.available ? 'text-[#16a34a] font-semibold' : 'text-[#dc2626] font-semibold'}>
                    {item.available ? '✓ Ready' : '✗ Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Dock */}
          <div className="p-4 space-y-2 bg-white">
            <Button
              variant="danger"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate('/driver/report')}
              iconLeft={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Report Hazard from Field
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
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
