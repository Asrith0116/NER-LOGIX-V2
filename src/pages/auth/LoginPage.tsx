import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Truck, ShieldCheck, MapPin, Warehouse, ArrowRight, Lock, Key, AlertCircle } from 'lucide-react';
import type { UserRole } from '@/types';

interface RoleOption {
  role: UserRole;
  email: string;
  name: string;
  org: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badgeColor: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'driver',
    email: 'driver@nerlogix.in',
    name: 'Biren Gogoi (AS-01-J-4422)',
    org: 'Assam State Freight Operations',
    title: 'Driver / Field Operator',
    desc: 'Report active road hazards, view ML risk routing & execute emergency position rerouting.',
    icon: <Truck className="w-6 h-6 text-blue-600" />,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    role: 'dispatcher',
    email: 'dispatcher@nerlogix.in',
    name: 'Ankita Sharma',
    org: 'NER Logistics Control Center',
    title: 'Dispatcher / Command',
    desc: 'Monitor full regional fleet impact, optimize route candidate vectors & dispatch emergency stock.',
    icon: <MapPin className="w-6 h-6 text-amber-600" />,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    role: 'sdma',
    email: 'sdma@nerlogix.in',
    name: 'Ranjit Sharma (Officer)',
    org: 'State Disaster Management Authority',
    title: 'SDMA / Government Official',
    desc: 'Human verification queue for driver hazard reports, official road closures & multi-agency sync.',
    icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    role: 'contractor',
    email: 'contractor@nerlogix.in',
    name: 'Lalthanga Khawlhring',
    org: 'NE Emergency Relief Contractor',
    title: 'Contractor / Supply Operator',
    desc: 'Manage strategic godown inventories, approve emergency pickup requests & coordinate relief supplies.',
    icon: <Warehouse className="w-6 h-6 text-purple-600" />,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthLoading, loginError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('driver');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectRole = (r: RoleOption) => {
    setSelectedRole(r.role);
    setEmail(r.email);
    setPassword(`${r.role === 'dispatcher' ? 'dispatch' : r.role}123`);
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const targetEmailOrRole = email || selectedRole;
    const res = await login(targetEmailOrRole, password);
    setSubmitting(false);

    if (res.ok) {
      navigate(`/${selectedRole}`);
    }
  };

  const handleQuickLogin = async (r: RoleOption) => {
    setSubmitting(true);
    setSelectedRole(r.role);
    const pwd = `${r.role === 'dispatcher' ? 'dispatch' : r.role}123`;
    const res = await login(r.email, pwd);
    setSubmitting(false);

    if (res.ok) {
      navigate(`/${r.role}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-neutral-100 rounded-full border border-neutral-200 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
            Team RESILIO • Hackathon Demonstration
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">NER-LOGIX</h1>
        <p className="mt-1 text-sm text-neutral-600 max-w-sm mx-auto">
          Smart Logistics & Accessibility Intelligence Platform for the North Eastern Region
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        {/* Banner Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <Key className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <span className="font-bold uppercase tracking-wider block mb-0.5">DEMO AUTHENTICATION ACTIVE</span>
            Authenticating issues a backend-signed HMAC-SHA256 JWT token. Backend role-based access control (RBAC) enforces strict authorization boundaries across Driver, Dispatcher, SDMA, and Contractor endpoints.
          </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {ROLES.map((r) => {
            const isSelected = selectedRole === r.role;
            return (
              <div
                key={r.role}
                onClick={() => handleSelectRole(r)}
                className={`p-5 rounded-xl border transition-all cursor-pointer bg-white relative ${
                  isSelected
                    ? 'border-neutral-900 ring-2 ring-neutral-900 shadow-md'
                    : 'border-neutral-200 hover:border-neutral-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-neutral-100 rounded-lg">{r.icon}</div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">{r.title}</h3>
                      <p className="text-xs font-medium text-neutral-500">{r.org}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${r.badgeColor}`}>
                    {r.role.toUpperCase()}
                  </span>
                </div>

                <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">{r.desc}</p>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-500">{r.email}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickLogin(r);
                    }}
                    disabled={submitting || isAuthLoading}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-neutral-900 hover:text-blue-600 transition-colors"
                  >
                    <span>Authenticate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Login Form Box */}
        <div className="bg-white py-6 px-6 shadow-sm border border-neutral-200 rounded-xl">
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-neutral-600" />
              <span>Direct Credentials Login ({selectedRole.toUpperCase()})</span>
            </h3>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-md p-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Email Address or Role</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. driver@nerlogix.in"
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-neutral-500">
                Authorized role permissions are cryptographically verified on the Node/SQLite backend.
              </span>

              <button
                type="submit"
                disabled={submitting || isAuthLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-md shadow-sm text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50"
              >
                {submitting || isAuthLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
