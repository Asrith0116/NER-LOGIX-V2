import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStore } from '@/store/networkStore';
import { useAppStore } from '@/store/appStore';
import {
  Sliders,
  WifiOff,
  Wifi,
  AlertTriangle,
  CloudRain,
  Warehouse,
  RotateCcw,
  PlayCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

const PITCH_SCRIPT = [
  {
    title: 'Step 1: Predictive Risk Route Selection',
    desc: 'Driver plans journey from Guwahati to Imphal. System compares Route A (18/100 Risk) vs Route B (82/100 Risk). Driver selects Route A for cargo safety.',
    role: 'driver' as const,
    path: '/driver/trip',
  },
  {
    title: 'Step 2: Pre-Trip Offline Bundle Download',
    desc: 'Driver caches corridor route waypoints, GeoJSON coordinate data, and multilingual audio alerts into IndexedDB for offline operation.',
    role: 'driver' as const,
    path: '/driver/trip',
  },
  {
    title: 'Step 3: Entering Mountain Dead-Zone (Offline)',
    desc: '4G/5G drops to zero bars. Local IndexedDB cache transparently provides cached corridor waypoints, trip state, and device location coordinates.',
    role: 'driver' as const,
    path: '/driver/navigation',
  },
  {
    title: 'Step 4: Field Hazard Reporting & Offline Queue',
    desc: 'Driver encounters fresh landslide at KM 182. Captures geotagged photo and records Assamese voice memo. Report queues locally in IndexedDB.',
    role: 'driver' as const,
    path: '/driver/report',
  },
  {
    title: 'Step 5: Reconnect & Automatic Cloud Sync',
    desc: 'Cresting mountain ridge restores momentary signal. Client network listener automatically syncs queued reports with the operational backend.',
    role: 'sdma' as const,
    path: '/sdma/incidents',
  },
  {
    title: 'Step 6: SDMA Human-in-the-Loop Verification',
    desc: 'District Disaster Officer inspects evidence, reviews AI transcription, and approves hazard pin. Enforces official road status.',
    role: 'sdma' as const,
    path: '/sdma/incidents',
  },
  {
    title: 'Step 7: Real-Time Rerouting from Current Position',
    desc: 'Approaching vehicles receive backend-synchronized operational updates. Route recalculates dynamically from CURRENT position rather than original start point.',
    role: 'driver' as const,
    path: '/driver/navigation',
  },
  {
    title: 'Step 8: No Safe Route & Godown Fallback',
    desc: 'All alternate passes impassable (>85/100 risk). Vehicle safely diverted to Dimapur Emergency Relief Godown with contractor authorization.',
    role: 'contractor' as const,
    path: '/contractor',
  },
];

export function DemoSimulationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [pitchStep, setPitchStep] = useState<number | null>(null);

  const { networkStatus, setNetworkStatus, setRole } = useAppStore();
  const disruptions = useNetworkStore((state) => state.disruptions);
  const addIncident = useNetworkStore((state) => state.addIncident);
  const verifyIncident = useNetworkStore((state) => state.verifyIncident);
  const updateRoadSegment = useNetworkStore((state) => state.updateRoadSegment);
  const requestEmergencyPickup = useNetworkStore((state) => state.requestEmergencyPickup);
  const rerouteVehicle = useNetworkStore((state) => state.rerouteVehicle);
  const resetToCleanState = useNetworkStore((state) => state.resetToCleanState);
  const weatherSpikeActive = useNetworkStore((state) => state.weatherSpikeActive);
  const setWeatherSpike = useNetworkStore((state) => state.setWeatherSpike);

  const navigate = useNavigate();

  // 1. Inject Landslide Blockage
  const handleInjectLandslide = async () => {
    const incId = `INC-2026-LANDSLIDE`;
    const newInc = {
      id: incId,
      type: 'landslide' as const,
      severity: 'critical' as const,
      location: [25.32, 93.55] as [number, number],
      locationName: 'NH-2 near Mao Gate, km 312',
      description: 'Major slope collapse after heavy rainfall. Both carriageways blocked by shale debris and boulders.',
      reportedBy: 'Biren Gogoi (Field Driver)',
      reportedAt: new Date().toISOString(),
      syncStatus: 'pending_verification' as const,
      voiceNote: true,
      voiceTranscript: 'Bhal boroxun hoi ase, rasta bondo hoi gose Mao Gateor osorot.',
      voiceLanguage: 'Assamese',
      affectedRouteId: 'route-b',
    };
    await addIncident(newInc);
    // Directly verify to trigger immediate network disruption broadcast
    await verifyIncident(incId, true, 'SDMA Command');
  };

  // 2. Weather Escalation (Cloudburst Spike)
  const handleSimulateWeatherSpike = () => {
    setWeatherSpike(!weatherSpikeActive);
  };

  // 3. Corridor Collapse -> Godown Fallback
  const handleTriggerCorridorCollapse = () => {
    updateRoadSegment('rd-001', { status: 'blocked', riskLevel: 'blocked' });
    requestEmergencyPickup('NL-02-C-3391');
  };

  // 4. Reset All Demo State
  const handleResetDemo = async () => {
    await resetToCleanState();
    setPitchStep(null);
    setNetworkStatus('online');
  };

  const executeStage = (stepIndex: number) => {
    const stage = PITCH_SCRIPT[stepIndex];
    if (!stage) return;
    setPitchStep(stepIndex);
    setRole(stage.role);

    switch (stepIndex) {
      case 0:
      case 1:
        navigate('/driver/trip');
        break;
      case 2:
        setNetworkStatus('offline');
        navigate('/driver/navigation');
        break;
      case 3:
        navigate('/driver/report');
        break;
      case 4:
        setNetworkStatus('online');
        navigate('/sdma/incidents');
        break;
      case 5:
        handleInjectLandslide();
        navigate('/sdma/incidents');
        break;
      case 6:
        rerouteVehicle('MN-04-B-1121');
        navigate('/driver/navigation');
        break;
      case 7:
        handleTriggerCorridorCollapse();
        navigate('/contractor');
        break;
      default:
        navigate(stage.path);
        break;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-auto">
      {/* Pitch Step Floating Guidance Modal */}
      <AnimatePresence>
        {pitchStep !== null && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="mb-3 w-96 max-w-[calc(100vw-2rem)] bg-[#1a1a19] text-white p-4 rounded-xl shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#2563eb] text-white">
                Operational Scenario Walkthrough
              </span>
              <button
                onClick={() => setPitchStep(null)}
                className="text-white/60 hover:text-white text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {PITCH_SCRIPT[pitchStep].title}
            </h3>
            <p className="text-xs text-white/80 leading-relaxed mb-3">
              {PITCH_SCRIPT[pitchStep].desc}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-white/60 text-[11px]">
                Stage {pitchStep + 1} of {PITCH_SCRIPT.length}
              </span>
              <div className="flex items-center gap-1.5">
                {pitchStep > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-white border-white/20 hover:bg-white/10 text-xs py-1 h-7"
                    onClick={() => executeStage(pitchStep - 1)}
                  >
                    Previous
                  </Button>
                )}
                {pitchStep < PITCH_SCRIPT.length - 1 ? (
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-[#2563eb] text-xs py-1 h-7 font-semibold"
                    onClick={() => executeStage(pitchStep + 1)}
                  >
                    Next Stage →
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-[#16a34a] text-xs py-1 h-7 font-semibold"
                    onClick={() => setPitchStep(null)}
                  >
                    Complete ✓
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Collapsible Demo Controller Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="mb-3 w-84 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 p-4 text-xs divide-y divide-slate-100"
          >
            {/* Header */}
            <div className="pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Operational Simulation Controls</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs">
                NER-LOGIX
              </span>
            </div>

            {/* Guided Walkthrough */}
            <div className="py-3 space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Operational Workflow
              </p>
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 rounded-xl shadow-xs"
                onClick={() => executeStage(0)}
              >
                <PlayCircle className="w-4 h-4 text-cyan-400" />
                <span>Launch Scenario Walkthrough</span>
              </Button>
            </div>

            {/* Manual Simulation Triggers */}
            <div className="py-3 space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Live Disruption & Environment Injections
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-8.5 justify-start px-2.5 hover:bg-rose-50/90 hover:text-rose-700 border-rose-200/80 rounded-xl"
                  onClick={handleInjectLandslide}
                  title="Injects a major slope failure on NH-2 Mao Gate and immediately notifies fleet"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="truncate">Inject Landslide</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`text-[11px] h-8.5 justify-start px-2.5 border rounded-xl transition-all ${
                    weatherSpikeActive
                      ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                      : 'hover:bg-blue-50/90 hover:text-blue-700 border-blue-200/80'
                  }`}
                  onClick={handleSimulateWeatherSpike}
                  title="Simulates 45mm/h cloudburst over Karbi Anglong / Doyyang corridor"
                >
                  <CloudRain className={`w-3.5 h-3.5 shrink-0 ${weatherSpikeActive ? 'text-white' : 'text-blue-600'}`} />
                  <span className="truncate">{weatherSpikeActive ? 'Rain Active (45mm)' : 'Rainfall Spike'}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-8.5 justify-start px-2.5 hover:bg-amber-50/90 hover:text-amber-700 border-amber-200/80 rounded-xl"
                  onClick={handleTriggerCorridorCollapse}
                  title="Collapses all alternative passes and routes heavy vehicle to nearest emergency godown"
                >
                  <Warehouse className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Corridor Collapse</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-8.5 justify-start px-2.5 rounded-xl border-slate-200"
                  onClick={() =>
                    setNetworkStatus(networkStatus === 'online' ? 'offline' : 'online')
                  }
                  title="Toggles between Online cloud sync and Offline IndexedDB dead-zone cache"
                >
                  {networkStatus === 'online' ? (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate">Kill Network</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Restore 4G</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Reset */}
            <div className="pt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>Active Disruptions: {disruptions.length}</span>
              <button
                onClick={handleResetDemo}
                className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset System
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 bg-slate-950/90 backdrop-blur-md text-white rounded-full shadow-[0_10px_30px_-4px_rgba(15,23,42,0.3)] hover:bg-slate-900 transition-all text-xs font-semibold cursor-pointer border border-white/20 active:scale-95"
      >
        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
        <span>Simulation Controls</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
      </button>
    </div>
  );
}
