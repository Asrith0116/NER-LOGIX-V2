import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { DemoSimulationBar } from '@/components/ui/DemoSimulationBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import type { UserRole } from '@/types';

export function AppShell() {
  const location = useLocation();
  const role = useAppStore((state) => state.role);
  const setRole = useAppStore((state) => state.setRole);

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const pathRole = pathSegments[1] as UserRole;
    if (['driver', 'dispatcher', 'sdma', 'contractor'].includes(pathRole) && pathRole !== role) {
      setRole(pathRole);
    }
  }, [location.pathname, role, setRole]);

  return (
    <div className="h-full flex flex-col bg-[#f4f6f8] text-slate-900 selection:bg-cyan-500 selection:text-white">
      <TopBar />
      <div className="flex flex-1 min-h-0 relative isolate">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="h-full overflow-y-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <DemoSimulationBar />
    </div>
  );
}
