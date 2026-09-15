import { create } from 'zustand';
import type { UserRole } from '@/types';
import { apiGet, apiPost } from '@/services/api/apiClient';
import { useAppStore } from './appStore';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  vehicleId?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  loginError: string | null;

  login: (emailOrRole: string, password?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  initAuth: () => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const STORAGE_KEY = 'nerlogix_auth_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthLoading: true,
  loginError: null,

  updateUser: (partial: Partial<AuthUser>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    }));
  },

  login: async (emailOrRole: string, password?: string) => {
    set({ isAuthLoading: true, loginError: null });
    try {
      const res = await apiPost<{ ok: boolean; token: string; user: AuthUser; error?: string }>(
        '/api/v1/auth/login',
        { email: emailOrRole, password }
      );

      if (res.ok && res.data?.ok && res.data.token && res.data.user) {
        const { token, user } = res.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, token);
        }
        // Authoritatively sync user workspace role on successful login
        useAppStore.getState().setRole(user.role);
        set({
          user,
          token,
          isAuthenticated: true,
          isAuthLoading: false,
          loginError: null,
        });
        return { ok: true };
      }

      const errorMsg = res.data?.error || res.error || 'Authentication failed. Please check credentials.';
      set({ isAuthLoading: false, loginError: errorMsg });
      return { ok: false, error: errorMsg };
    } catch (err) {
      const msg = (err as Error).message || 'Network error during login';
      set({ isAuthLoading: false, loginError: msg });
      return { ok: false, error: msg };
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthLoading: false,
      loginError: null,
    });
  },

  initAuth: async () => {
    if (typeof window === 'undefined') {
      set({ isAuthLoading: false });
      return;
    }

    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (!storedToken) {
      set({ user: null, token: null, isAuthenticated: false, isAuthLoading: false });
      return;
    }

    set({ isAuthLoading: true });
    try {
      const res = await apiGet<{ ok: boolean; user: AuthUser }>(
        '/api/v1/auth/me',
        { headers: { Authorization: `Bearer ${storedToken}` } }
      );

      if (res.ok && res.data?.ok && res.data.user) {
        // Authoritatively sync user workspace role on successful session initialization
        useAppStore.getState().setRole(res.data.user.role);
        set({
          user: res.data.user,
          token: storedToken,
          isAuthenticated: true,
          isAuthLoading: false,
        });
        return;
      }
    } catch {
      // Backend temporarily unreachable (e.g. offline simulation or network drop)
    }

    // Resilient offline fallback: decode JWT token payload if valid
    try {
      const parts = storedToken.split('.');
      if (parts.length === 3) {
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        if (payload.role && payload.email) {
          const fallbackUser: AuthUser = {
            id: payload.sub || 'usr-offline',
            email: payload.email,
            name: payload.name || payload.email,
            role: payload.role as UserRole,
            organization: payload.organization || 'NER Logistics Operations',
            vehicleId: payload.vehicleId,
          };
          useAppStore.getState().setRole(fallbackUser.role);
          set({
            user: fallbackUser,
            token: storedToken,
            isAuthenticated: true,
            isAuthLoading: false,
          });
          return;
        }
      }
    } catch {
      // Invalid token format
    }

    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null, isAuthenticated: false, isAuthLoading: false });
  },
}));
