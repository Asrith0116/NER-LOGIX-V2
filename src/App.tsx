import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';

// Driver Pages
import { DriverDashboard } from '@/pages/driver/DriverDashboard';
import { TripPlanner } from '@/pages/driver/TripPlanner';
import { NavigationView } from '@/pages/driver/NavigationView';
import { HazardReport } from '@/pages/driver/HazardReport';

// Dispatcher Pages
import { DispatcherOps } from '@/pages/dispatcher/DispatcherOps';
import { DispatcherFleet } from '@/pages/dispatcher/DispatcherFleet';
import { DispatcherIncidents } from '@/pages/dispatcher/DispatcherIncidents';
import { DispatcherLogistics } from '@/pages/dispatcher/DispatcherLogistics';
import { DispatcherMap } from '@/pages/dispatcher/DispatcherMap';

// SDMA Pages
import { SDMADashboard } from '@/pages/sdma/SDMADashboard';
import { SDMAIncidents } from '@/pages/sdma/SDMAIncidents';
import { SDMARoads } from '@/pages/sdma/SDMARoads';
import { SDMAMap } from '@/pages/sdma/SDMAMap';
import { SDMAConnectivity } from '@/pages/sdma/SDMAConnectivity';

// Contractor Pages
import { ContractorOps } from '@/pages/contractor/ContractorOps';

function RootRedirect() {
  const { isAuthenticated, user, isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-neutral-600">Initializing NER-LOGIX authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${user.role}`} replace />;
}

function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />

        <Route element={<AppShell />}>
          {/* Driver Routes */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/trip"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <TripPlanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/navigation"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <NavigationView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/report"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <HazardReport />
              </ProtectedRoute>
            }
          />

          {/* Dispatcher Routes */}
          <Route
            path="/dispatcher"
            element={
              <ProtectedRoute allowedRoles={['dispatcher']}>
                <DispatcherOps />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatcher/fleet"
            element={
              <ProtectedRoute allowedRoles={['dispatcher']}>
                <DispatcherFleet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatcher/incidents"
            element={
              <ProtectedRoute allowedRoles={['dispatcher']}>
                <DispatcherIncidents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatcher/logistics"
            element={
              <ProtectedRoute allowedRoles={['dispatcher']}>
                <DispatcherLogistics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatcher/map"
            element={
              <ProtectedRoute allowedRoles={['dispatcher']}>
                <DispatcherMap />
              </ProtectedRoute>
            }
          />

          {/* SDMA Routes */}
          <Route
            path="/sdma"
            element={
              <ProtectedRoute allowedRoles={['sdma']}>
                <SDMADashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sdma/incidents"
            element={
              <ProtectedRoute allowedRoles={['sdma']}>
                <SDMAIncidents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sdma/roads"
            element={
              <ProtectedRoute allowedRoles={['sdma']}>
                <SDMARoads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sdma/map"
            element={
              <ProtectedRoute allowedRoles={['sdma']}>
                <SDMAMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sdma/connectivity"
            element={
              <ProtectedRoute allowedRoles={['sdma']}>
                <SDMAConnectivity />
              </ProtectedRoute>
            }
          />

          {/* Contractor Routes */}
          <Route
            path="/contractor"
            element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorOps />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
