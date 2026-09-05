import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_TRIP, DEMO_ROUTES, LOCATIONS } from '@/data/demo';
import { RouteCard } from '@/components/ui/RouteCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Notification } from '@/components/ui/Notification';
import { MapContainer } from '@/components/map/MapContainer';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';
import { Package, Thermometer, ChevronRight, ShieldCheck, Loader2, Navigation } from 'lucide-react';

type PrepState = 'idle' | 'preparing' | 'saving' | 'ready';

export function TripPlanner() {
  const navigate = useNavigate();
  const { setTripState } = useAppStore();
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(DEMO_ROUTES.saferRoute.id);
  const [prepState, setPrepState] = useState<PrepState>('idle');

  const routes = DEMO_TRIP.routes;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const handleConfirm = () => {
    if (prepState === 'ready' && selectedRouteId) {
      setTripState({
        activeTripId: DEMO_TRIP.id,
        selectedRouteId,
        isOfflineReady: true,
        isJourneyActive: true
      });
      navigate('/driver/navigation');
      return;
    }
    
    setPrepState('preparing');
  };

  useEffect(() => {
    if (prepState === 'preparing') {
      const t1 = setTimeout(() => setPrepState('saving'), 1200);
      return () => clearTimeout(t1);
    } else if (prepState === 'saving') {
      const t2 = setTimeout(() => setPrepState('ready'), 1500);
      return () => clearTimeout(t2);
    }
  }, [prepState]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-[#e4e4e3]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-[#1a1a19]">Trip Planner</h1>
            <div className="flex items-center gap-1 text-xs text-[#8a8a87] mt-0.5">
              <span>{DEMO_TRIP.origin.shortName}</span>
              <ChevronRight className="w-3 h-3" />
              <span>{DEMO_TRIP.destination.shortName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge label={`Trip ${DEMO_TRIP.id}`} variant="neutral" />
            <AnimatePresence>
              {prepState === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <StatusBadge label="Offline Ready" variant="success" pulse />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: trip details + route selection */}
        <div className="w-80 bg-[#fafaf9] border-r border-[#e4e4e3] flex flex-col overflow-y-auto shrink-0">
          {/* Trip summary */}
          <div className="px-4 py-3 bg-white border-b border-[#e4e4e3]">
            <p className="text-[10px] text-[#8a8a87] uppercase tracking-wide font-medium mb-2.5">Trip Summary</p>

            {/* Route visualization */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#2563eb] flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-white">A</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#1a1a19] truncate">{DEMO_TRIP.origin.name}</p>
                  <p className="text-[10px] text-[#8a8a87]">{DEMO_TRIP.origin.state}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 flex justify-center">
                  <div className="w-px h-4 bg-[#e4e4e3]" />
                </div>
                <p className="text-[10px] text-[#8a8a87]">~500 km · NE India</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#dc2626] flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-white">B</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#1a1a19] truncate">{DEMO_TRIP.destination.name}</p>
                  <p className="text-[10px] text-[#8a8a87]">{DEMO_TRIP.destination.state}</p>
                </div>
              </div>
            </div>

            {/* Cargo */}
            <div className="bg-[#f8f8f7] rounded p-2.5 border border-[#e4e4e3]">
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="w-3.5 h-3.5 text-[#8a8a87]" />
                <span className="text-xs font-medium text-[#1a1a19]">{DEMO_TRIP.cargo.type}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge label="Critical Priority" variant="danger" />
                {DEMO_TRIP.cargo.temperatureControlled && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af] text-[10px]">
                    <Thermometer className="w-2.5 h-2.5" />
                    Cold Chain
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Route options */}
          <div className="flex-1 px-4 py-3">
            <p className="text-[10px] text-[#8a8a87] uppercase tracking-wide font-medium mb-2.5">
              Route Options
            </p>

            <AnimatePresence mode="wait">
              {prepState === 'preparing' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                  <Notification type="info" title="Preparing offline route..." className="mb-3" visible />
                </motion.div>
              )}
              {prepState === 'saving' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                  <Notification type="info" title="Saving route data..." className="mb-3" visible />
                </motion.div>
              )}
              {prepState === 'ready' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <Notification type="success" title="Offline ready" message="Route, maps, and safety details cached." className="mb-3" visible />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2.5">
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRouteId === route.id}
                  onSelect={() => {
                    setSelectedRouteId(route.id);
                    setPrepState('idle');
                  }}
                />
              ))}
            </div>
          </div>

          {/* Confirm button */}
          <div className="px-4 py-3 border-t border-[#e4e4e3] bg-white">
            {selectedRoute && prepState === 'idle' && (
              <div className="mb-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8a8a87]">Selected Route</span>
                  <span className="font-medium text-[#1a1a19]">{selectedRoute.label}</span>
                </div>
              </div>
            )}
            
            {prepState === 'idle' && (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleConfirm}
                disabled={!selectedRouteId}
                iconLeft={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Prepare Offline Route
              </Button>
            )}

            {(prepState === 'preparing' || prepState === 'saving') && (
              <Button
                variant="outline"
                className="w-full"
                disabled
                iconLeft={<Loader2 className="w-3.5 h-3.5 animate-spin" />}
              >
                Caching Data...
              </Button>
            )}

            {prepState === 'ready' && (
              <Button
                variant="primary"
                className="w-full bg-[#16a34a] hover:bg-[#15803d] border-[#16a34a]"
                onClick={handleConfirm}
                iconLeft={<Navigation className="w-3.5 h-3.5" />}
              >
                Start Journey
              </Button>
            )}

            {prepState === 'idle' && (
              <p className="text-[10px] text-[#8a8a87] text-center mt-1.5">
                Save essential route data for areas with unreliable connectivity
              </p>
            )}
          </div>
        </div>

        {/* Right: map */}
        <div className="flex-1 min-w-0">
          <MapContainer
            center={[25.5, 93.0]}
            zoom={7}
            routes={routes}
            selectedRouteId={selectedRouteId}
            incidents={[]}
            originMarker={{ latlng: [LOCATIONS.guwahati.lat, LOCATIONS.guwahati.lng], label: DEMO_TRIP.origin.name }}
            destinationMarker={{ latlng: [LOCATIONS.imphal.lat, LOCATIONS.imphal.lng], label: DEMO_TRIP.destination.name }}
          />
        </div>
      </div>
    </div>
  );
}
