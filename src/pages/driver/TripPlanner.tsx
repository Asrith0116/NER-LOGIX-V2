import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_TRIP, DEMO_ROUTES, LOCATIONS } from '@/data/demo';
import { RouteCard } from '@/components/ui/RouteCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Notification } from '@/components/ui/Notification';
import { MapContainer } from '@/components/map/MapContainer';
import { RiskBreakdownCard } from '@/components/ui/RiskBreakdownCard';
import { DriverVehicleSelector } from '@/components/ui/DriverVehicleSelector';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Loader2,
  Navigation,
  CloudRain,
  Volume2,
  Database,
  Check,
  Sparkles,
} from 'lucide-react';
import { fetchLiveWeather } from '@/services/weatherService';
import { calculateExplainableRisk } from '@/services/riskEngine';
import type { WeatherDataPoint, RiskFactorBreakdown, Route } from '@/types';

type PrepState = 'idle' | 'preparing' | 'saving' | 'ready';

const CARGO_OPTIONS = [
  { id: 'cold-chain', label: 'Cold-Chain Medical Supplies (Vaccines & Insulin)', priority: 'critical', temp: true },
  { id: 'relief', label: 'Emergency Disaster Relief & Grain Rations', priority: 'high', temp: false },
  { id: 'pharma', label: 'Essential Hospital Pharmaceuticals & IV Fluids', priority: 'high', temp: true },
  { id: 'heavy', label: 'Infrastructure Bridge Steel & Cement Payload', priority: 'normal', temp: false },
];

const VEHICLE_OPTIONS = [
  { id: 'reefer', label: 'Medium Commercial Reefer (AS-01-J-4422)', type: 'Refrigerated Truck' },
  { id: 'heavy', label: 'Heavy 10-Wheeler Cargo Truck (NL-02-C-3391)', type: 'Heavy Truck' },
  { id: 'light', label: 'Light Goods Vehicle / Van (MN-04-B-1121)', type: 'Light Goods Vehicle' },
];

export function TripPlanner() {
  const navigate = useNavigate();
  const { setTripState } = useAppStore();

  const [originKey, setOriginKey] = useState<string>('guwahati');
  const [destKey, setDestKey] = useState<string>('imphal');
  const [selectedCargo, setSelectedCargo] = useState(CARGO_OPTIONS[0]);
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_OPTIONS[0]);

  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(DEMO_ROUTES.saferRoute.id);
  const [prepState, setPrepState] = useState<PrepState>('idle');
  const [activeTab, setActiveTab] = useState<'routes' | 'risk_breakdown'>('routes');

  const [originWeather, setOriginWeather] = useState<WeatherDataPoint | null>(null);
  const [destWeather, setDestWeather] = useState<WeatherDataPoint | null>(null);

  const originLocation = LOCATIONS[originKey as keyof typeof LOCATIONS] || LOCATIONS.guwahati;
  const destLocation = LOCATIONS[destKey as keyof typeof LOCATIONS] || LOCATIONS.imphal;

  // Fetch live weather from Open-Meteo
  useEffect(() => {
    fetchLiveWeather(originLocation.shortName).then(setOriginWeather);
    fetchLiveWeather(destLocation.shortName).then(setDestWeather);
  }, [originLocation.shortName, destLocation.shortName]);

  const routes: Route[] = DEMO_TRIP.routes;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  // Dynamic explainable risk breakdown calculation
  const riskBreakdown: RiskFactorBreakdown = useMemo(() => {
    const isSafer = selectedRoute.id === 'route-a';
    return calculateExplainableRisk({
      routeId: selectedRoute.id,
      routeLabel: selectedRoute.label,
      weather: destWeather || undefined,
      slopeDegrees: isSafer ? 14 : 26,
      historicalDisruptionsCount: isSafer ? 2 : 7,
      activeHazards: isSafer ? [] : [{ id: 'INC-DEMO', type: 'landslide', severity: 'high', location: [25.32, 93.55], locationName: 'Mao Gate', description: 'Debris', reportedBy: 'Patrol', reportedAt: '', syncStatus: 'verified' }],
      vehicleType: selectedVehicle.type,
      cargoPriority: selectedCargo.priority,
      isColdChain: selectedCargo.temp,
    });
  }, [selectedRoute, destWeather, selectedVehicle, selectedCargo]);

  const handleConfirm = () => {
    if (prepState === 'ready' && selectedRouteId) {
      setTripState({
        activeTripId: DEMO_TRIP.id,
        selectedRouteId,
        isOfflineReady: true,
        isJourneyActive: true,
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
      {/* Top Header */}
      <div className="px-6 py-3.5 bg-white border-b border-[#e4e4e3]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                Layer 1: Pre-Trip Predictive Engine
              </span>
              <DriverVehicleSelector id="tripplanner-driver-vehicle-selector" compact />
            </div>
            <h1 className="text-base font-bold text-[#1a1a19] mt-0.5">
              Trip Route Planner & Risk Scorer
            </h1>
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
                  <StatusBadge label="Offline Bundle Cached" variant="success" pulse />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left: Trip Configuration & Route Options */}
        <div className="w-full lg:w-96 bg-[#fafaf9] border-r border-[#e4e4e3] flex flex-col overflow-y-auto shrink-0 divide-y divide-[#e4e4e3]">
          {/* Corridor & Weather Ingestion Box */}
          <div className="p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">
                Corridor Parameters
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#2563eb] font-semibold">
                <CloudRain className="w-3 h-3" /> Live Open-Meteo Ingestion
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-[#5a5a57] block mb-1">Origin Node</label>
                <select
                  value={originKey}
                  onChange={(e) => setOriginKey(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19]"
                >
                  <option value="guwahati">Guwahati Hub</option>
                  <option value="dimapur">Dimapur Node</option>
                  <option value="silchar">Silchar Depot</option>
                </select>
                {originWeather && (
                  <p className="text-[10px] text-[#8a8a87] mt-1">
                    {originWeather.temperatureC}°C · {originWeather.precipitationMm}mm/h rain
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5a5a57] block mb-1">Destination</label>
                <select
                  value={destKey}
                  onChange={(e) => setDestKey(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19]"
                >
                  <option value="imphal">Imphal Hospital</option>
                  <option value="kohima">Kohima Relief</option>
                  <option value="dimapur">Dimapur Node</option>
                </select>
                {destWeather && (
                  <p className="text-[10px] text-[#8a8a87] mt-1">
                    {destWeather.temperatureC}°C · {destWeather.precipitationMm}mm/h rain
                  </p>
                )}
              </div>
            </div>

            {/* Cargo & Vehicle */}
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[11px] font-medium text-[#5a5a57] block mb-1">Cargo Profile</label>
                <select
                  value={selectedCargo.id}
                  onChange={(e) => {
                    const c = CARGO_OPTIONS.find((opt) => opt.id === e.target.value);
                    if (c) setSelectedCargo(c);
                  }}
                  className="w-full text-xs font-medium p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19]"
                >
                  {CARGO_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5a5a57] block mb-1">Vehicle Class</label>
                <select
                  value={selectedVehicle.id}
                  onChange={(e) => {
                    const v = VEHICLE_OPTIONS.find((opt) => opt.id === e.target.value);
                    if (v) setSelectedVehicle(v);
                  }}
                  className="w-full text-xs font-medium p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19]"
                >
                  {VEHICLE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tab Selector: Route Cards vs Explainable Risk Breakdown */}
          <div className="p-4 flex-1 space-y-3">
            <div className="flex border-b border-[#e4e4e3] gap-4">
              <button
                onClick={() => setActiveTab('routes')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'routes'
                    ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
                    : 'text-[#8a8a87] hover:text-[#1a1a19]'
                }`}
              >
                Candidate Routes (2)
              </button>
              <button
                onClick={() => setActiveTab('risk_breakdown')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'risk_breakdown'
                    ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
                    : 'text-[#8a8a87] hover:text-[#1a1a19]'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#2563eb]" />
                Explainable Risk Engine
              </button>
            </div>

            {/* Offline Prep Banner Feedback */}
            <AnimatePresence mode="wait">
              {prepState === 'preparing' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                  <Notification
                    type="info"
                    title="Generating Offline Bundle..."
                    message="Packaging 10km spatial corridor buffer & elevation matrices."
                    className="mb-2"
                    visible
                  />
                </motion.div>
              )}
              {prepState === 'saving' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                  <Notification
                    type="info"
                    title="Caching Multilingual Voice Pack..."
                    message="Writing Assamese & Manipuri navigation triggers to IndexedDB."
                    className="mb-2"
                    visible
                  />
                </motion.div>
              )}
              {prepState === 'ready' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <Notification
                    type="success"
                    title="Offline Bundle Ready (0G Resilient)"
                    message="Full turn-by-turn guidance and offline reporting active without cellular signal."
                    className="mb-2"
                    visible
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {activeTab === 'routes' ? (
              <div className="space-y-3">
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

                {/* Pre-Trip Bundle Details */}
                <div className="p-3 rounded-xl bg-[#fafaf9] border border-[#e4e4e3] text-xs space-y-2">
                  <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider block">
                    Included in Offline Route Bundle
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5a5a57]">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>10 km corridor tiles</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>Elevation profiles</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-[#2563eb]" />
                      <span>Voice cues (Assamese)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#2563eb]" />
                      <span>IndexedDB schema</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <RiskBreakdownCard breakdown={riskBreakdown} routeLabel={selectedRoute.label} />
            )}
          </div>

          {/* Action Dock */}
          <div className="p-4 border-t border-[#e4e4e3] bg-white space-y-2">
            {prepState === 'idle' && (
              <Button
                variant="primary"
                className="w-full font-semibold"
                onClick={handleConfirm}
                disabled={!selectedRouteId}
                iconLeft={<ShieldCheck className="w-4 h-4" />}
              >
                Prepare & Cache Offline Bundle
              </Button>
            )}

            {(prepState === 'preparing' || prepState === 'saving') && (
              <Button
                variant="outline"
                className="w-full font-semibold"
                disabled
                iconLeft={<Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />}
              >
                Building Offline Bundle...
              </Button>
            )}

            {prepState === 'ready' && (
              <Button
                variant="primary"
                className="w-full bg-[#16a34a] hover:bg-[#15803d] border-[#16a34a] font-semibold shadow-sm"
                onClick={handleConfirm}
                iconLeft={<Navigation className="w-4 h-4" />}
              >
                Start Journey & Navigate
              </Button>
            )}

            <p className="text-[10px] text-[#8a8a87] text-center">
              Routes ranked by terrain risk + live Open-Meteo precipitation rather than distance alone.
            </p>
          </div>
        </div>

        {/* Right: Map Container */}
        <div className="flex-1 min-w-0 h-96 lg:h-full relative">
          <MapContainer
            center={[25.5, 93.0]}
            zoom={7}
            routes={routes}
            selectedRouteId={selectedRouteId}
            incidents={[]}
            originMarker={{ latlng: [originLocation.lat, originLocation.lng], label: originLocation.name }}
            destinationMarker={{ latlng: [destLocation.lat, destLocation.lng], label: destLocation.name }}
          />
        </div>
      </div>
    </div>
  );
}
