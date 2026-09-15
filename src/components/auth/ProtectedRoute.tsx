import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isAuthLoading } = useAuthStore();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-neutral-600">Verifying session credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role mismatch: redirect to authorized dashboard for their role
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-neutral-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Access Denied (403 Forbidden)</h2>
          <p className="text-xs text-neutral-600 mb-4">
            Your authenticated account role (<span className="font-mono font-bold">{user.role.toUpperCase()}</span>) is not authorized to access this operational view.
          </p>
          <Navigate to={`/${user.role}`} replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
