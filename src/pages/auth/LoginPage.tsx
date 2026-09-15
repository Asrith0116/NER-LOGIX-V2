import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Truck, Users, ShieldCheck, Package, ArrowRight, KeyRound, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { UserRole } from '@/types';
import naturalBgImage from '@/assets/images/mountain_winding_road_1789468517387.jpg';

interface RoleCardItem {
  role: UserRole;
  email: string;
  defaultPassword: string;
  name: string;
  title: string;
  tagline: string;
  org: string;
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  buttonBg: string;
  buttonHoverBg: string;
}

const ROLE_ITEMS: RoleCardItem[] = [
  {
    role: 'driver',
    email: 'driver@nerlogix.in',
    defaultPassword: 'driver123',
    name: 'Biren Gogoi',
    title: 'Driver',
    tagline: 'Report • Navigate • Stay Safe',
    org: 'Assam State Freight Operations',
    icon: <Truck className="w-8 h-8 text-[#2563eb]" />,
    iconBg: 'bg-blue-50',
    accentColor: 'text-[#2563eb]',
    buttonBg: 'bg-[#2563eb]',
    buttonHoverBg: 'hover:bg-blue-700',
  },
  {
    role: 'dispatcher',
    email: 'dispatcher@nerlogix.in',
    defaultPassword: 'dispatch123',
    name: 'Ankita Sharma',
    title: 'Dispatcher',
    tagline: 'Monitor • Coordinate • Optimize',
    org: 'NER Logistics Control Center',
    icon: <Users className="w-8 h-8 text-[#10b981]" />,
    iconBg: 'bg-emerald-50',
    accentColor: 'text-[#10b981]',
    buttonBg: 'bg-[#10b981]',
    buttonHoverBg: 'hover:bg-emerald-700',
  },
  {
    role: 'sdma',
    email: 'sdma@nerlogix.in',
    defaultPassword: 'sdma123',
    name: 'Ranjit Sharma (Officer)',
    title: 'Government (SDMA)',
    tagline: 'Verify • Manage • Respond',
    org: 'State Disaster Management Authority',
    icon: <ShieldCheck className="w-8 h-8 text-[#8b5cf6]" />,
    iconBg: 'bg-purple-50',
    accentColor: 'text-[#8b5cf6]',
    buttonBg: 'bg-[#8b5cf6]',
    buttonHoverBg: 'hover:bg-purple-700',
  },
  {
    role: 'contractor',
    email: 'contractor@nerlogix.in',
    defaultPassword: 'contractor123',
    name: 'Lalthanga Khawlhring',
    title: 'Contractor',
    tagline: 'Deliver • Support • Serve',
    org: 'NE Emergency Relief Contractor',
    icon: <Package className="w-8 h-8 text-[#f59e0b]" />,
    iconBg: 'bg-amber-50',
    accentColor: 'text-[#f59e0b]',
    buttonBg: 'bg-[#f59e0b]',
    buttonHoverBg: 'hover:bg-amber-600',
  },
];

// Natural high-resolution scenic photography of lush Himalayan/North East river valley mountain highway
const NATURAL_BACKGROUND_URL =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthLoading, loginError } = useAuthStore();

  const [showManualLogin, setShowManualLogin] = useState(false);
  const [manualEmail, setManualEmail] = useState('driver@nerlogix.in');
  const [manualPassword, setManualPassword] = useState('driver123');
  const [manualRole, setManualRole] = useState<UserRole>('driver');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const credentialsSectionRef = useRef<HTMLDivElement>(null);

  // Role card selection: selects role, pre-fills static credentials, opens form, and focuses
  const handleSelectRoleCard = (item: RoleCardItem) => {
    setManualRole(item.role);
    setManualEmail(item.email);
    setManualPassword(item.defaultPassword);
    setShowManualLogin(true);
    setTimeout(() => {
      credentialsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleManualFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualSubmitting(true);
    try {
      const targetEmail = manualEmail.trim() || manualRole;
      const res = await login(targetEmail, manualPassword);
      if (res.ok) {
        const authenticatedUser = useAuthStore.getState().user;
        const targetRole = authenticatedUser?.role || manualRole;
        navigate(`/${targetRole}`);
      }
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Authentic Natural Mountain Valley & Highway Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={naturalBgImage || NATURAL_BACKGROUND_URL}
          alt="North Eastern Region natural mountain landscape"
          className="w-full h-full object-cover object-center scale-100 filter brightness-[1.0] contrast-[1.02]"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = NATURAL_BACKGROUND_URL;
          }}
        />
        {/* Minimal sheer gradient for text contrast without obscuring the background landscape */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Top Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center max-w-2xl mx-auto mb-6 sm:mb-8"
        >
          {/* Stylized Dual Peak Mountain Logo */}
          <div className="flex justify-center mb-3">
            <div className="relative w-16 h-12 flex items-center justify-center drop-shadow-[0_4px_12px_rgba(16,185,129,0.5)]">
              <svg viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Left Emerald Peak */}
                <path
                  d="M10 40L28 10L39 28"
                  stroke="#10B981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Right Cyan/Blue Peak */}
                <path
                  d="M27 34L45 8L62 40"
                  stroke="#06B6D4"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Base Connection line */}
                <path
                  d="M20 40H52"
                  stroke="#38BDF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
            </div>
          </div>

          {/* App Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
            NER-LOGIX
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-sm sm:text-base text-white font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] px-2">
            Smart Logistics &amp; Accessibility Intelligence for the North Eastern Region
          </p>

          {/* Tagline with bullets */}
          <div className="mt-2 flex items-center justify-center flex-wrap gap-2 text-xs sm:text-sm font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            <span>Safer Roads</span>
            <span className="text-cyan-300">•</span>
            <span>Resilient Communities</span>
            <span className="text-cyan-300">•</span>
            <span>Connected North East</span>
          </div>

          {/* Glowing Rainbow / Cyan Horizontal Divider */}
          <div className="mt-4 mx-auto w-48 sm:w-72 h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
        </motion.div>

        {/* Transparent Role Selection Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="w-full max-w-2xl bg-black/15 hover:bg-black/20 border border-white/25 rounded-3xl p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-300"
        >
          {/* Card Title */}
          <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-5 tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Choose Your Role to Continue
          </h2>

          {/* Error Message if any */}
          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-xs text-red-200 flex items-center space-x-2 backdrop-blur-sm"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{loginError}</span>
            </motion.div>
          )}

          {/* 2x2 Grid of 4 Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {ROLE_ITEMS.map((item) => {
              const isSelected = manualRole === item.role;
              return (
                <div
                  key={item.role}
                  id={`role-card-${item.role}`}
                  onClick={() => handleSelectRoleCard(item)}
                  className={`group relative bg-white/85 hover:bg-white active:scale-[0.98] rounded-2xl p-4 sm:p-4.5 transition-all duration-200 shadow-md hover:shadow-xl cursor-pointer border flex items-center justify-between overflow-hidden backdrop-blur-[2px] ${
                    isSelected ? 'ring-2 ring-cyan-400 border-cyan-400 bg-white shadow-lg' : 'border-white/60'
                  }`}
                >
                  {/* Left Side: Icon + Title + Subtitle */}
                  <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                    <div className="p-2 rounded-xl flex-shrink-0 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-600 font-medium tracking-tight truncate mt-0.5">
                        {item.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Circular Arrow Button */}
                  <div className="flex-shrink-0 pl-1">
                    <div
                      className={`w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full ${item.buttonBg} ${item.buttonHoverBg} text-white flex items-center justify-center transition-all duration-200 shadow-sm group-hover:shadow-md group-hover:scale-105`}
                    >
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collapsible Direct Credentials / Officer Login Option */}
          <div ref={credentialsSectionRef} id="officer-credentials-section" className="mt-5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowManualLogin(!showManualLogin)}
              className="w-full flex items-center justify-center space-x-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors py-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Officer Manual Sign-In / Custom Credentials</span>
              {showManualLogin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <AnimatePresence>
              {showManualLogin && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleManualFormSubmit}
                  className="mt-3 space-y-3 bg-black/20 border border-white/20 rounded-xl p-3.5 backdrop-blur-md"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-white/80 mb-1">Role / Email</label>
                      <input
                        type="text"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="e.g. driver@nerlogix.in"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-white/80 mb-1">Password</label>
                      <input
                        type="password"
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1 text-[10px] text-white/60">
                      {ROLE_ITEMS.map((r) => (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => {
                            setManualRole(r.role);
                            setManualEmail(r.email);
                            setManualPassword(r.defaultPassword);
                          }}
                          className={`px-1.5 py-0.5 rounded border transition-colors ${
                            manualRole === r.role
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {r.role}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={manualSubmitting || isAuthLoading}
                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1 disabled:opacity-50"
                    >
                      {manualSubmitting ? (
                        <span>Authenticating...</span>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Footer Tagline */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-xs sm:text-sm font-medium text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] tracking-wide">
          Every Road Connected. Every Community Stronger.
        </p>
      </footer>
    </div>
  );
};
