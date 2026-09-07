import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_TRIP, LOCATIONS } from '@/data/demo';
import { RouteCard } from '@/components/ui/RouteCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Notification } from '@/components/ui/Notification';
import { MapContainer } from '@/components/map/MapContainer';
import { RiskBreakdownCard } from '@/components/ui/RiskBreakdownCard';
import { DriverVehicleSelector } from '@/components/ui/DriverVehicleSelector';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore } from '@/store/networkStore';
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
  Sliders,
  Clock,
  Truck,
  Thermometer,
} from 'lucide-react';
import { fetchLiveWeather } from '@/services/weatherService';
import { calculateTripCandidates } from '@/services/routing/tripIntelligence';
import { candidateToRiskBreakdown } from '@/services/riskEngine';
import type {
  WeatherDataPoint,
  RouteCandidate,
  TripRequest,
  CargoSensitivity,
  TripPriority,
  OperationalConstraints,
  Location,
} from '@/types';

type PrepState = 'idle' | 'preparing' | 'saving' | 'ready';

const CARGO_CATALOG = [
  {
    category: 'Cold-Chain Medical Supplies',
    label: 'Cold-Chain Vaccines & Biologicals (2°C - 8°C)',
    sensitivity: 'critical' as CargoSensitivity,
    coldChain: true,
    priority: 'emergency' as TripPriority,
  },
  {
    category: 'Emergency Pharmaceuticals',
    label: 'Emergency Critical Care Pharmaceuticals & IV Fluids',
    sensitivity: 'critical' as CargoSensitivity,
    coldChain: true,
    priority: 'emergency' as TripPriority,
  },
  {
    category: 'Surgical Consumables & Blood Units',
    label: 'Trauma Surgical Kits & Whole Blood Units',
    sensitivity: 'critical' as CargoSensitivity,
    coldChain: true,
    priority: 'emergency' as TripPriority,
  },
  {
    category: 'Relief Rations & Grain',
    label: 'Emergency Disaster Food Rations & Grain Supplies',
    sensitivity: 'high' as CargoSensitivity,
    coldChain: false,
    priority: 'urgent' as TripPriority,
  },
  {
    category: 'Disaster Shelter Materials',
    label: 'Emergency Tarpaulins, Blankets & Shelter Kits',
    sensitivity: 'medium' as CargoSensitivity,
    coldChain: false,
    priority: 'high' as TripPriority,
  },
  {
    category: 'Diagnostic Lab Samples',
    label: 'Diagnostic Pathology Specimens & Test Cartridges',
    sensitivity: 'high' as CargoSensitivity,
    coldChain: true,
    priority: 'urgent' as TripPriority,
  },
  {
    category: 'Infrastructure Bridge Steel & Cement',
    label: 'Heavy Road Recovery Spares & Cement Payload',
    sensitivity: 'low' as CargoSensitivity,
    coldChain: false,
    priority: 'standard' as TripPriority,
  },
];

export function TripPlanner() {
  const navigate = useNavigate();
  const { setTripState, selectedDriverVehicleId } = useAppStore();

  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const roadSegments = useNetworkStore((state) => state.roadSegments);
  const disruptions = useNetworkStore((state) => state.disruptions);
  const activeIncidents = useNetworkStore((state) => state.activeIncidents);
  const setVehicleStatus = useNetworkStore((state) => state.setVehicleStatus);
  const storeWeatherData = useNetworkStore((state) => state.weatherData);
  const weatherSpikeActive = useNetworkStore((state) => state.weatherSpikeActive);

  // Active Vehicle Context
  const activeVehicle =
    activeVehicles.find((v) => v.id === selectedDriverVehicleId) ||
    activeVehicles.find((v) => v.id === 'AS-01-J-4422') ||
    activeVehicles[0];

  // Journey origin and destination nodes (with driver vehicle defaults)
  const defaultOrigin = useMemo(() => {
    if (activeVehicle?.origin) {
      const match = Object.keys(LOCATIONS).find((k) =>
        LOCATIONS[k as keyof typeof LOCATIONS].shortName.toLowerCase() ===
        activeVehicle.origin?.toLowerCase()
      );
      if (match) return match;
    }
    return 'guwahati';
  }, [activeVehicle]);

  const defaultDest = useMemo(() => {
    if (activeVehicle?.destination) {
      const match = Object.keys(LOCATIONS).find((k) =>
        LOCATIONS[k as keyof typeof LOCATIONS].shortName.toLowerCase() ===
        activeVehicle.destination?.toLowerCase()
      );
      if (match) return match;
    }
    return 'imphal';
  }, [activeVehicle]);

  const [originKey, setOriginKey] = useState<string>(defaultOrigin);
  const [destKey, setDestKey] = useState<string>(defaultDest);

  // Synchronize when active vehicle context switches
  const [prevVehicleId, setPrevVehicleId] = useState<string>(activeVehicle?.id || '');
  if (activeVehicle && activeVehicle.id !== prevVehicleId) {
    setPrevVehicleId(activeVehicle.id);
    setOriginKey(defaultOrigin);
    setDestKey(defaultDest);
  }

  // Trip Configuration Inputs
  const [selectedCargoOption, setSelectedCargoOption] = useState(CARGO_CATALOG[0]);
  const [cargoSensitivity, setCargoSensitivity] = useState<CargoSensitivity>('critical');
  const [tripPriority, setTripPriority] = useState<TripPriority>('emergency');
  const [departureWindow, setDepartureWindow] = useState<'immediate' | 'within_2h' | 'morning_clear'>('immediate');

  // Operational Constraints
  const [requireColdChain, setRequireColdChain] = useState<boolean>(true);
  const [avoidHighRiskCorridors, setAvoidHighRiskCorridors] = useState<boolean>(true);
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'balanced' | 'aggressive'>('conservative');
  const [showAdvancedConstraints, setShowAdvancedConstraints] = useState<boolean>(false);

  // State Management
  const [userSelectedRouteId, setUserSelectedRouteId] = useState<string | null>(null);
  const [prepState, setPrepState] = useState<PrepState>('idle');
  const [activeTab, setActiveTab] = useState<'routes' | 'risk_breakdown'>('routes');

  // Weather data ingestion
  const [originWeather, setOriginWeather] = useState<WeatherDataPoint | null>(null);
  const [destWeather, setDestWeather] = useState<WeatherDataPoint | null>(null);

  const originLocation: Location = LOCATIONS[originKey as keyof typeof LOCATIONS] || LOCATIONS.guwahati;
  const destLocation: Location = LOCATIONS[destKey as keyof typeof LOCATIONS] || LOCATIONS.imphal;

  // Ingest live weather from Open-Meteo
  useEffect(() => {
    fetchLiveWeather(originLocation.shortName).then(setOriginWeather);
    fetchLiveWeather(destLocation.shortName).then(setDestWeather);
  }, [originLocation.shortName, destLocation.shortName]);

  // When cargo option changes, sync default sensitivity & cold-chain
  const handleCargoChange = (categoryName: string) => {
    const found = CARGO_CATALOG.find((c) => c.category === categoryName);
    if (found) {
      setSelectedCargoOption(found);
      setCargoSensitivity(found.sensitivity);
      setRequireColdChain(found.coldChain);
      setTripPriority(found.priority);
      setPrepState('idle');
    }
  };

  // Build the complete Trip Request
  const tripRequest: TripRequest = useMemo(() => {
    const constraints: OperationalConstraints = {
      requireColdChain,
      avoidHighRiskCorridors,
      maxDelayTolerance: tripPriority === 'emergency' ? 'strict' : 'moderate',
      riskTolerance,
      avoidUnpavedSections: activeVehicle?.type?.toLowerCase().includes('heavy') ?? false,
    };

    return {
      origin: originLocation,
      destination: destLocation,
      vehicleId: activeVehicle?.id || 'AS-01-J-4422',
      vehicleType: activeVehicle?.type || 'Refrigerated Truck',
      driverName: activeVehicle?.driverName || 'Arjun Baruah',
      cargoCategory: selectedCargoOption.category,
      cargoSensitivity,
      priority: tripPriority,
      departureWindow,
      constraints,
    };
  }, [
    originLocation,
    destLocation,
    activeVehicle,
    selectedCargoOption,
    cargoSensitivity,
    tripPriority,
    departureWindow,
    requireColdChain,
    avoidHighRiskCorridors,
    riskTolerance,
  ]);

  // Multi-Factor Corridor Candidates dynamically generated and scored
  const candidateRoutes: RouteCandidate[] = useMemo(() => {
    const weatherData: Record<string, WeatherDataPoint> = { ...storeWeatherData };
    if (originWeather) weatherData[originLocation.shortName] = originWeather;
    if (destWeather) weatherData[destLocation.shortName] = destWeather;

    const candidates = calculateTripCandidates(tripRequest, {
      roadSegments,
      disruptions,
      activeIncidents,
      weatherData,
    });

    return Array.isArray(candidates) ? candidates : [];
  }, [tripRequest, roadSegments, disruptions, activeIncidents, originWeather, destWeather, originLocation.shortName, destLocation.shortName, storeWeatherData]);

  // Selected Route ID derivation
  const selectedRouteId = useMemo(() => {
    if (userSelectedRouteId && candidateRoutes.some((r) => r.id === userSelectedRouteId)) {
      return userSelectedRouteId;
    }
    const topRoute = candidateRoutes.find((r) => r.recommended) || candidateRoutes[0];
    return topRoute?.id;
  }, [userSelectedRouteId, candidateRoutes]);

  const selectedCandidate =
    candidateRoutes.find((r) => r.id === selectedRouteId) ||
    candidateRoutes[0];

  // Dynamic Explainable Risk Breakdown for the selected candidate
  const riskBreakdown = useMemo(() => {
    if (!selectedCandidate) return null;
    return candidateToRiskBreakdown(selectedCandidate);
  }, [selectedCandidate]);

  // Handle Journey Confirmation
  const handleConfirm = () => {
    if (prepState === 'ready' && selectedCandidate) {
      // 1. Update app store with selected route
      setTripState({
        activeTripId: DEMO_TRIP.id,
        selectedRouteId: selectedCandidate.id,
        selectedCustomRoute: selectedCandidate,
        isOfflineReady: true,
        isJourneyActive: true,
      });

      // 2. Commit route to active vehicle in network store
      if (activeVehicle?.id) {
        setVehicleStatus(activeVehicle.id, {
          plannedRouteId: selectedCandidate.id,
          currentRoute: selectedCandidate.id,
          plannedSegmentIds: selectedCandidate.segmentIds ? [...selectedCandidate.segmentIds] : undefined,
          origin: originLocation.shortName,
          destination: destLocation.shortName,
          cargoType: selectedCargoOption.category,
          etaMinutes: selectedCandidate.etaMinutes,
          status: 'on_route',
        });
      }

      // 3. Navigate to Cockpit
      navigate('/driver/navigation');
      return;
    }
    setPrepState('preparing');
  };

  useEffect(() => {
    if (prepState === 'preparing') {
      const t1 = setTimeout(() => setPrepState('saving'), 1100);
      return () => clearTimeout(t1);
    } else if (prepState === 'saving') {
      const t2 = setTimeout(() => setPrepState('ready'), 1400);
      return () => clearTimeout(t2);
    }
  }, [prepState]);

  return (
    <div className="h-full flex flex-col bg-[#fbfbfa]">
      {/* Top Header & Active Vehicle Context */}
      <div className="px-6 py-3 bg-white border-b border-[#e4e4e3] shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                Layer 1: Pre-Trip Intelligent Routing
              </span>
              <DriverVehicleSelector id="tripplanner-driver-vehicle-selector" compact />
            </div>
            <h1 className="text-base font-bold text-[#1a1a19] mt-1 flex items-center gap-2">
              <span>Trip Route Planner & Risk Scorer</span>
              <span className="text-xs font-normal text-[#71717a] hidden sm:inline">
                · {candidateRoutes.length} Corridors Evaluated
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Vehicle Info Tag */}
            {activeVehicle && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#f8f8f7] border border-[#e4e4e3] text-xs">
                <Truck className="w-3.5 h-3.5 text-[#2563eb]" />
                <span className="font-semibold text-[#1a1a19]">{activeVehicle.id}</span>
                <span className="text-[#8a8a87]">({activeVehicle.type})</span>
              </div>
            )}

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
        {/* Left Section: Inputs & Evaluated Candidates */}
        <div className="w-full lg:w-[460px] bg-[#fafaf9] border-r border-[#e4e4e3] flex flex-col overflow-y-auto shrink-0 divide-y divide-[#e4e4e3]">
          {/* Section 1: Journey Nodes & Live Weather */}
          <div className="p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">
                1. Corridor Nodes & Weather Ingestion
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#2563eb] font-semibold">
                <CloudRain className="w-3.5 h-3.5" /> Live Open-Meteo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#52525b] block mb-1">Origin Node</label>
                <select
                  value={originKey}
                  onChange={(e) => {
                    setOriginKey(e.target.value);
                    setUserSelectedRouteId(null);
                    setPrepState('idle');
                  }}
                  className="w-full text-xs font-semibold p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                >
                  <option value="guwahati">Guwahati Regional Hub</option>
                  <option value="dimapur">Dimapur Rail Node</option>
                  <option value="silchar">Silchar Buffer Depot</option>
                </select>
                {originWeather && (
                  <p className="text-[10px] text-[#71717a] mt-1 font-medium">
                    {originWeather.temperatureC}°C · {originWeather.precipitationMm} mm/h rain
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b] block mb-1">Destination Node</label>
                <select
                  value={destKey}
                  onChange={(e) => {
                    setDestKey(e.target.value);
                    setUserSelectedRouteId(null);
                    setPrepState('idle');
                  }}
                  className="w-full text-xs font-semibold p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                >
                  <option value="imphal">Imphal Civil Hospital</option>
                  <option value="kohima">Kohima Disaster Center</option>
                  <option value="dimapur">Dimapur Transit Hub</option>
                </select>
                {destWeather && (
                  <p className="text-[10px] text-[#71717a] mt-1 font-medium">
                    {destWeather.temperatureC}°C · {destWeather.precipitationMm} mm/h rain
                  </p>
                )}
              </div>
            </div>

            {weatherSpikeActive && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af]">
                <CloudRain className="w-4 h-4 text-[#2563eb] shrink-0" />
                <div>
                  <span className="font-bold">Regional Cloudburst Active (45 mm/h):</span> Karbi Anglong / Doyyang corridor precipitation spike ingested into corridor risk calculations.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Cargo Profile & Priority Intelligence */}
          <div className="p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8a8a87] uppercase tracking-wider font-bold">
                2. Cargo Profile & Urgency
              </span>
              {requireColdChain && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                  <Thermometer className="w-3 h-3 text-[#2563eb]" /> Cold-Chain Required
                </span>
              )}
            </div>

            {/* Cargo Category Dropdown */}
            <div>
              <label className="text-[11px] font-semibold text-[#52525b] block mb-1">Cargo Category</label>
              <select
                value={selectedCargoOption.category}
                onChange={(e) => handleCargoChange(e.target.value)}
                className="w-full text-xs font-semibold p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              >
                {CARGO_CATALOG.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sensitivity & Priority Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#52525b] block mb-1">Cargo Sensitivity</label>
                <select
                  value={cargoSensitivity}
                  onChange={(e) => {
                    setCargoSensitivity(e.target.value as CargoSensitivity);
                    setPrepState('idle');
                  }}
                  className="w-full text-xs font-semibold p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19]"
                >
                  <option value="critical">Critical (Zero Delay/Spoilage)</option>
                  <option value="high">High Vulnerability</option>
                  <option value="medium">Medium Sensitivity</option>
                  <option value="low">Standard / Non-Perishable</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b] block mb-1">Trip Priority</label>
                <select
                  value={tripPriority}
                  onChange={(e) => {
                    setTripPriority(e.target.value as TripPriority);
                    setPrepState('idle');
                  }}
                  className="w-full text-xs font-semibold p-2 bg-[#f8f8f7] border border-[#e4e4e3] rounded-lg text-[#1a1a19]"
                >
                  <option value="emergency">Emergency Intervention</option>
                  <option value="urgent">Urgent Replenishment</option>
                  <option value="high">High Priority</option>
                  <option value="standard">Standard Dispatch</option>
                </select>
              </div>
            </div>

            {/* Departure Window & Advanced Constraints Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#8a8a87]" />
                <span className="text-[11px] font-medium text-[#71717a]">Departure:</span>
                <select
                  value={departureWindow}
                  onChange={(e) => setDepartureWindow(e.target.value as any)}
                  className="text-xs font-semibold bg-transparent border-0 text-[#1a1a19] focus:outline-none cursor-pointer"
                >
                  <option value="immediate">Immediate Dispatch</option>
                  <option value="within_2h">Within 2 Hours</option>
                  <option value="morning_clear">06:00 AM Clear Weather</option>
                </select>
              </div>

              <button
                onClick={() => setShowAdvancedConstraints(!showAdvancedConstraints)}
                className="text-[11px] font-semibold text-[#2563eb] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                {showAdvancedConstraints ? 'Hide Constraints' : 'Edit Constraints'}
              </button>
            </div>

            {/* Expandable Operational Constraints Box */}
            <AnimatePresence>
              {showAdvancedConstraints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-[#f8f8f7] rounded-lg border border-[#e4e4e3] space-y-2.5 overflow-hidden text-xs"
                >
                  <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider block">
                    Operational Safety Constraints
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireColdChain}
                      onChange={(e) => {
                        setRequireColdChain(e.target.checked);
                        setPrepState('idle');
                      }}
                      className="rounded border-[#d4d4d8] text-[#2563eb] focus:ring-[#2563eb]"
                    />
                    <span className="text-[#3f3f46] font-medium">
                      Enforce Cold-Chain continuous monitoring & avoid rough terrain
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avoidHighRiskCorridors}
                      onChange={(e) => {
                        setAvoidHighRiskCorridors(e.target.checked);
                        setPrepState('idle');
                      }}
                      className="rounded border-[#d4d4d8] text-[#2563eb] focus:ring-[#2563eb]"
                    />
                    <span className="text-[#3f3f46] font-medium">
                      Strictly avoid corridors with active slide warnings or scree slopes
                    </span>
                  </label>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-[#52525b] font-medium">Risk Tolerance Profile:</span>
                    <div className="flex gap-1">
                      {(['conservative', 'balanced', 'aggressive'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setRiskTolerance(mode);
                            setPrepState('idle');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            riskTolerance === mode
                              ? 'bg-[#1a1a19] text-white'
                              : 'bg-white text-[#71717a] border border-[#e4e4e3]'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 3: Evaluated Candidate Routes & Risk Engine */}
          <div className="p-4 flex-1 space-y-3">
            {/* Tab Selector */}
            <div className="flex border-b border-[#e4e4e3] gap-4">
              <button
                onClick={() => setActiveTab('routes')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'routes'
                    ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
                    : 'text-[#8a8a87] hover:text-[#1a1a19]'
                }`}
              >
                <span>Evaluated Corridors ({candidateRoutes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('risk_breakdown')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'risk_breakdown'
                    ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
                    : 'text-[#8a8a87] hover:text-[#1a1a19]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>Explainable Risk Matrix</span>
              </button>
            </div>

            {/* Offline Prep Feedback Banner */}
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
                {candidateRoutes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    selected={selectedRouteId === route.id}
                    onSelect={() => {
                      setUserSelectedRouteId(route.id);
                      setPrepState('idle');
                    }}
                  />
                ))}

                {/* Pre-Trip Bundle Metadata Box */}
                <div className="p-3.5 rounded-xl bg-white border border-[#e4e4e3] text-xs space-y-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider block">
                    Zero-G Offline Safety Protocol
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#52525b]">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>10 km corridor tile cache</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>Elevation & slope profiles</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-[#2563eb]" />
                      <span>Voice cues (Assamese / Manipuri)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#2563eb]" />
                      <span>IndexedDB sync journal</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              riskBreakdown && (
                <RiskBreakdownCard
                  breakdown={riskBreakdown}
                  routeLabel={selectedCandidate?.label}
                />
              )
            )}
          </div>

          {/* Action Dock */}
          <div className="p-4 border-t border-[#e4e4e3] bg-white space-y-2 sticky bottom-0 z-10 shadow-lg">
            {prepState === 'idle' && (
              <Button
                variant="primary"
                className="w-full font-semibold"
                onClick={handleConfirm}
                disabled={!selectedRouteId || selectedCandidate?.isBlocked}
                iconLeft={<ShieldCheck className="w-4 h-4" />}
              >
                {selectedCandidate?.isBlocked
                  ? 'Selected Corridor Is Blocked'
                  : 'Prepare & Cache Offline Bundle'}
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
              Routes ranked by terrain slope, verified road closures, and live Open-Meteo precipitation.
            </p>
          </div>
        </div>

        {/* Right Section: Map View */}
        <div className="flex-1 min-w-0 h-96 lg:h-full relative">
          <MapContainer
            center={[25.5, 93.3]}
            zoom={7}
            routes={candidateRoutes}
            selectedRouteId={selectedRouteId}
            incidents={activeIncidents}
            originMarker={{
              latlng: [originLocation.lat, originLocation.lng],
              label: `${originLocation.name} (Origin)`,
            }}
            destinationMarker={{
              latlng: [destLocation.lat, destLocation.lng],
              label: `${destLocation.name} (Destination)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
