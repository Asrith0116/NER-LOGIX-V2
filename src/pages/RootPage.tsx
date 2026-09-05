import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { DEMO_METRICS, DEMO_INCIDENTS, DEMO_CORRIDORS } from '@/data/demo';
import { MetricCard } from '@/components/ui/MetricCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { MapContainer } from '@/components/map/MapContainer';
import { DEMO_ROUTES, DEMO_FLEET } from '@/data/demo';
import { formatTimeAgo, getIncidentTypeLabel } from '@/utils';
import {
  Activity,
  AlertTriangle,
  Truck,
  Wifi,
  ArrowRight,
  TrendingUp,
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
  const { setRole } = useAppStore();

  const handleNavigate = (role: 'driver' | 'dispatcher' | 'sdma', path: string) => {
    setRole(role);
    navigate(path);
  };

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top metrics bar */}
        <div className="px-6 py-4 border-b border-[#e4e4e3] bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-semibold text-[#1a1a19]">Regional Overview</h1>
              <p className="text-xs text-[#8a8a87]">North Eastern Region — Live Operations Snapshot</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8a8a87]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
              System Operational
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
                value={DEMO_METRICS.activeTrips}
                subtext="Across NE Region"
                icon={<Truck className="w-4 h-4" />}
              />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Regional Risk"
                value="Moderate"
                subtext="3 high-risk corridors"
                riskLevel="moderate"
                icon={<TrendingUp className="w-4 h-4" />}
              />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Active Incidents"
                value={`0${DEMO_METRICS.activeIncidents}`}
                subtext={`${DEMO_METRICS.pendingVerifications} pending verification`}
                riskLevel="high"
                icon={<AlertTriangle className="w-4 h-4" />}
              />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Connectivity"
                value="Operational"
                subtext="All nodes reachable"
                riskLevel="low"
                icon={<Wifi className="w-4 h-4" />}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Map + panels */}
        <div className="flex-1 flex min-h-0">
          {/* Map */}
          <div className="flex-1 min-w-0">
            <MapContainer
              center={[25.5, 93.0]}
              zoom={7}
              routes={Object.values(DEMO_ROUTES)}
              incidents={DEMO_INCIDENTS.slice(0, 3)}
              vehicles={DEMO_FLEET.slice(0, 5)}
            />
          </div>

          {/* Right panel */}
          <div className="w-72 border-l border-[#e4e4e3] bg-white overflow-y-auto flex flex-col shrink-0">
            {/* Corridor status */}
            <div className="px-4 py-3 border-b border-[#e4e4e3]">
              <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-3">
                Corridor Status
              </h2>
              <div className="space-y-2">
                {DEMO_CORRIDORS.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2 border-b border-[#f4f4f3] last:border-0"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#1a1a19]">{c.name}</p>
                      <p className="text-[10px] text-[#8a8a87]">
                        {c.activeVehicles} vehicles · {c.incidents} incident{c.incidents !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <RiskBadge level={c.riskLevel} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Fleet summary */}
            <div className="px-4 py-3 border-b border-[#e4e4e3]">
              <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-3">
                Fleet Status
              </h2>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5a5a57]">Safe</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-[#f0fdf4] rounded-full overflow-hidden">
                      <div className="h-full bg-[#16a34a] rounded-full" style={{ width: `${(DEMO_METRICS.vehiclesSafe / 18) * 100}%` }} />
                    </div>
                    <span className="font-semibold text-[#16a34a] tabular-nums w-5 text-right">{DEMO_METRICS.vehiclesSafe}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5a5a57]">Moderate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-[#fffbeb] rounded-full overflow-hidden">
                      <div className="h-full bg-[#d97706] rounded-full" style={{ width: `${(DEMO_METRICS.vehiclesModerate / 18) * 100}%` }} />
                    </div>
                    <span className="font-semibold text-[#d97706] tabular-nums w-5 text-right">{DEMO_METRICS.vehiclesModerate}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5a5a57]">High Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-[#fef2f2] rounded-full overflow-hidden">
                      <div className="h-full bg-[#dc2626] rounded-full" style={{ width: `${(DEMO_METRICS.vehiclesHighRisk / 18) * 100}%` }} />
                    </div>
                    <span className="font-semibold text-[#dc2626] tabular-nums w-5 text-right">{DEMO_METRICS.vehiclesHighRisk}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent incidents */}
            <div className="px-4 py-3 flex-1">
              <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-3">
                Recent Incidents
              </h2>
              <div className="space-y-3">
                {DEMO_INCIDENTS.slice(0, 3).map((inc) => (
                  <div key={inc.id} className="pb-3 border-b border-[#f4f4f3] last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-[#1a1a19]">
                        {getIncidentTypeLabel(inc.type)}
                      </span>
                      <StatusBadge syncStatus={inc.syncStatus} />
                    </div>
                    <p className="text-[11px] text-[#8a8a87] truncate">{inc.locationName}</p>
                    <p className="text-[10px] text-[#c4c4c2] mt-0.5">{formatTimeAgo(inc.reportedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role switcher panel */}
      <div className="w-64 border-l border-[#e4e4e3] bg-[#fafaf9] p-4 flex flex-col gap-6 shrink-0">
        <div>
          <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-1">
            Select Stakeholder View
          </h2>
          <p className="text-[11px] text-[#8a8a87] leading-relaxed mb-4">
            NER-LOGIX serves three stakeholders. Select a role to enter the corresponding workspace.
          </p>
          <RoleSwitcher />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-xs font-semibold text-[#1a1a19] uppercase tracking-wide mb-3">
            Quick Access
          </h2>
          <div className="space-y-1.5">
            {[
              { label: 'Plan a Trip', sub: 'Driver workspace', action: () => handleNavigate('driver', '/driver/trip') },
              { label: 'Operations Map', sub: 'Dispatcher workspace', action: () => handleNavigate('dispatcher', '/dispatcher') },
              { label: 'Verify Incidents', sub: 'SDMA workspace', action: () => handleNavigate('sdma', '/sdma/incidents') },
            ].map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-[#e4e4e3] hover:border-[#c4c4c2] hover:shadow-sm transition-all text-left group"
              >
                <div>
                  <p className="text-xs font-medium text-[#1a1a19]">{qa.label}</p>
                  <p className="text-[10px] text-[#8a8a87]">{qa.sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#c4c4c2] group-hover:text-[#2563eb] transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="mt-auto pt-4 border-t border-[#e4e4e3]">
          <div className="flex items-center gap-2 text-xs text-[#8a8a87] mb-1">
            <Activity className="w-3 h-3" />
            <span>System Status</span>
          </div>
          <div className="space-y-1">
            {[
              { label: 'Route Engine', status: 'Operational' },
              { label: 'Incident Sync', status: 'Operational' },
              { label: 'SDMA Link', status: 'Operational' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[10px]">
                <span className="text-[#8a8a87]">{s.label}</span>
                <span className="text-[#16a34a] font-medium">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
