import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore } from '@/store/networkStore';
import { DEMO_CORRIDORS } from '@/data/demo';
import { MetricCard } from '@/components/ui/MetricCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { MapContainer } from '@/components/map/MapContainer';
import { DEMO_ROUTES } from '@/data/demo';
import { formatTimeAgo, getIncidentTypeLabel } from '@/utils';
import {
  Activity,
  AlertTriangle,
  Truck,
  Wifi,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
  item: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  },
};

export function RootPage() {
  const navigate = useNavigate();
  const role = useAppStore((s) => s.role);

  const activeIncidents = useNetworkStore((s) => s.activeIncidents);
  const roadSegments = useNetworkStore((s) => s.roadSegments);
  const activeVehicles = useNetworkStore((s) => s.activeVehicles);
  const disruptions = useNetworkStore((s) => s.disruptions);

  // Derived Operational Metrics
  const activeTrips = useMemo(
    () => activeVehicles.filter((v) => v.status === 'on_route' || v.status === 'emergency_pickup').length,
    [activeVehicles]
  );

  const blockedRoads = useMemo(
    () => roadSegments.filter((r) => r.status === 'blocked'),
    [roadSegments]
  );

  const pendingVerifications = useMemo(
    () => activeIncidents.filter((i) => i.syncStatus === 'pending_verification' || i.syncStatus === 'synced').length,
    [activeIncidents]
  );

  const regionalRisk = useMemo(() => {
    if (blockedRoads.length > 0 || disruptions.length > 0) return 'high';
    if (activeIncidents.length > 0) return 'moderate';
    return 'low';
  }, [blockedRoads, disruptions, activeIncidents]);

  const vehiclesSafe = useMemo(
    () => activeVehicles.filter((v) => v.riskLevel === 'low' && !v.affectedByDisruptionId).length,
    [activeVehicles]
  );

  const vehiclesModerate = useMemo(
    () => activeVehicles.filter((v) => v.riskLevel === 'moderate' && !v.affectedByDisruptionId).length,
    [activeVehicles]
  );

  const vehiclesHighRisk = useMemo(
    () => activeVehicles.filter((v) => v.riskLevel === 'high' || v.riskLevel === 'blocked' || Boolean(v.affectedByDisruptionId)).length,
    [activeVehicles]
  );

  const totalFleet = activeVehicles.length || 1;

  // Dynamic corridor cards
  const dynamicCorridors = useMemo(() => {
    return DEMO_CORRIDORS.map((c) => {
      const corridorVehicles = activeVehicles.filter((v) => v.assignedCorridorId === c.id);
      const corridorIncidents = activeIncidents.filter((i) => {
        if (c.id === 'cor-001') {
          return i.locationName.includes('Mao') || i.locationName.includes('Senapati') || i.affectedRouteId === 'route-b';
        }
        if (c.id === 'cor-002') {
          return i.locationName.includes('Wokha') || i.locationName.includes('Doyyang') || i.affectedRouteId === 'route-a';
        }
        return false;
      });

      const hasBlockage = roadSegments.some((r) => {
        if (c.id === 'cor-001' && (r.id === 'rd-001' || r.id === 'rd-005')) return r.status === 'blocked';
        if (c.id === 'cor-002' && (r.id === 'rd-002' || r.id === 'rd-003')) return r.status === 'blocked';
        return false;
      });

      const level = hasBlockage
        ? 'blocked'
        : corridorIncidents.length > 0
        ? 'moderate'
        : 'low';

      return {
        ...c,
        activeVehicles: corridorVehicles.length,
        incidents: corridorIncidents.length,
        riskLevel: level as 'low' | 'moderate' | 'high' | 'blocked',
      };
    });
  }, [activeVehicles, activeIncidents, roadSegments]);

  return (
    <div className="flex h-full bg-[#f4f6f8]">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top metrics bar */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Regional Overview</h1>
              <p className="text-xs text-slate-500">North Eastern Region — Live Operations Snapshot</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-xs font-semibold text-emerald-800 shadow-2xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Operational</span>
            </div>
          </div>
          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Active Trips"
                value={activeTrips}
                subtext="Across NE Region"
                icon={<Truck className="w-4 h-4 text-blue-600" />}
              />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Regional Risk"
                value={regionalRisk === 'high' ? 'High Risk' : regionalRisk === 'moderate' ? 'Moderate' : 'Low (Safe)'}
                subtext={blockedRoads.length > 0 ? `${blockedRoads.length} corridor blocked` : 'All corridors open'}
                riskLevel={regionalRisk}
                icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
              />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Active Incidents"
                value={activeIncidents.length.toString().padStart(2, '0')}
                subtext={pendingVerifications > 0 ? `${pendingVerifications} pending verification` : '0 pending verification'}
                riskLevel={activeIncidents.length > 0 ? 'high' : 'low'}
                icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
              />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Connectivity"
                value="Operational"
                subtext="All nodes reachable"
                riskLevel="low"
                icon={<Wifi className="w-4 h-4 text-emerald-600" />}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Map + panels */}
        <div className="flex-1 flex min-h-0">
          {/* Map */}
          <div className="flex-1 min-w-0 border-r border-slate-200/80 relative">
            <MapContainer
              center={[25.5, 93.0]}
              zoom={7}
              routes={Object.values(DEMO_ROUTES)}
              incidents={activeIncidents}
              vehicles={activeVehicles}
              roadSegments={roadSegments}
            />
          </div>

          {/* Right panel */}
          <div className="w-72 border-l border-slate-200/80 bg-white/95 backdrop-blur-md overflow-y-auto flex flex-col shrink-0">
            {/* Corridor status */}
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Corridor Status
              </h2>
              <div className="space-y-2">
                {dynamicCorridors.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {c.activeVehicles} vehicles · {c.incidents} incident{c.incidents !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <RiskBadge level={c.riskLevel} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Fleet summary */}
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Fleet Status
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Safe</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(vehiclesSafe / totalFleet) * 100}%` }} />
                    </div>
                    <span className="font-bold text-emerald-600 tabular-nums w-5 text-right">{vehiclesSafe}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Moderate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-amber-50 rounded-full overflow-hidden border border-amber-100">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(vehiclesModerate / totalFleet) * 100}%` }} />
                    </div>
                    <span className="font-bold text-amber-600 tabular-nums w-5 text-right">{vehiclesModerate}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">High Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-rose-50 rounded-full overflow-hidden border border-rose-100">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(vehiclesHighRisk / totalFleet) * 100}%` }} />
                    </div>
                    <span className="font-bold text-rose-600 tabular-nums w-5 text-right">{vehiclesHighRisk}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent incidents */}
            <div className="px-4 py-3.5 flex-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Recent Incidents
              </h2>
              {activeIncidents.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <ShieldCheck className="w-7 h-7 text-emerald-600 mx-auto mb-1.5 opacity-90" />
                  <p className="text-xs font-bold text-slate-900">All Corridors Clear</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">No active hazards or road cuts reported.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeIncidents.slice(0, 3).map((inc) => (
                    <div key={inc.id} className="pb-3 border-b border-slate-100 last:border-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-900">
                          {getIncidentTypeLabel(inc.type)}
                        </span>
                        <StatusBadge syncStatus={inc.syncStatus} />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{inc.locationName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatTimeAgo(inc.reportedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role workspace panel */}
      <div className="w-64 border-l border-slate-200/80 bg-slate-50/60 p-4 flex flex-col gap-6 shrink-0">
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
            Current Assigned Role
          </h2>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
            Authenticated workspace session identity.
          </p>
          <RoleSwitcher />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Quick Access
          </h2>
          <div className="space-y-2">
            {(role === 'driver' ? [
              { label: 'Plan a Trip', sub: 'Corridor Route Evaluator', action: () => navigate('/driver/trip') },
              { label: 'Active Navigation', sub: 'Turn-by-turn Guidance', action: () => navigate('/driver/navigation') },
              { label: 'Report Hazard', sub: 'Field Obstruction Log', action: () => navigate('/driver/report') },
            ] : role === 'dispatcher' ? [
              { label: 'Operations Control', sub: 'Fleet Command', action: () => navigate('/dispatcher') },
              { label: 'Fleet Monitoring', sub: 'Vehicle Tracking', action: () => navigate('/dispatcher/fleet') },
              { label: 'Corridor GIS Map', sub: 'Spatial Network', action: () => navigate('/dispatcher/map') },
            ] : role === 'sdma' ? [
              { label: 'Accessibility Overview', sub: 'Govt Intel Dashboard', action: () => navigate('/sdma') },
              { label: 'Verify Incidents', sub: 'Verification Queue', action: () => navigate('/sdma/incidents') },
              { label: 'Road Status Registry', sub: 'Official Corridor Records', action: () => navigate('/sdma/roads') },
            ] : [
              { label: 'Supply Operations', sub: 'Relief Godown Storage', action: () => navigate('/contractor') },
            ]).map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition-all text-left group cursor-pointer"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{qa.label}</p>
                  <p className="text-[10px] text-slate-400">{qa.sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="mt-auto pt-4 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>System Status</span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Route Engine', status: 'Operational' },
              { label: 'Incident Sync', status: 'Operational' },
              { label: 'SDMA Link', status: 'Operational' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">{s.label}</span>
                <span className="text-emerald-600 font-bold">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
