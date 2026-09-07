import { create } from 'zustand';
import type { UserRole, NetworkStatus, Route } from '@/types';
import { checkBackendHealth, BackendHealthInfo } from '@/services/api/backendHealthService';

export type BackendConnectionStatus = 'connected' | 'disconnected' | 'checking';

interface AppState {
  role: UserRole;
  networkStatus: NetworkStatus;
  sidebarCollapsed: boolean;
  activeTripId: string | null;
  selectedRouteId: string | null;
  selectedCustomRoute: Route | null;
  isOfflineReady: boolean;
  isJourneyActive: boolean;
  pendingIncidentsCount: number;
  selectedDriverVehicleId: string;
  backendStatus: BackendConnectionStatus;
  backendInfo: BackendHealthInfo | null;
  
  setRole: (role: UserRole) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  toggleSidebar: () => void;
  setTripState: (state: Partial<Pick<AppState, 'activeTripId' | 'selectedRouteId' | 'selectedCustomRoute' | 'isOfflineReady' | 'isJourneyActive'>>) => void;
  setSelectedCustomRoute: (route: Route | null) => void;
  setPendingIncidentsCount: (count: number) => void;
  setSelectedDriverVehicleId: (id: string) => void;
  checkBackendConnection: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'driver',
  networkStatus: 'online',
  sidebarCollapsed: false,
  activeTripId: null,
  selectedRouteId: null,
  selectedCustomRoute: null,
  isOfflineReady: false,
  isJourneyActive: false,
  pendingIncidentsCount: 0,
  selectedDriverVehicleId: 'AS-01-J-4422',
  backendStatus: 'checking',
  backendInfo: null,
  
  setRole: (role) => set({ role }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTripState: (newState) => set((state) => ({ ...state, ...newState })),
  setSelectedCustomRoute: (selectedCustomRoute) => set({ selectedCustomRoute }),
  setPendingIncidentsCount: (count) => set({ pendingIncidentsCount: count }),
  setSelectedDriverVehicleId: (selectedDriverVehicleId) => set({ selectedDriverVehicleId }),
  checkBackendConnection: async () => {
    set({ backendStatus: 'checking' });
    try {
      const { connected, data } = await checkBackendHealth(2500);
      set({
        backendStatus: connected ? 'connected' : 'disconnected',
        backendInfo: data,
      });
    } catch {
      set({
        backendStatus: 'disconnected',
        backendInfo: null,
      });
    }
  },
}));

// Run initial non-blocking backend health probe on startup in browser environment
if (typeof window !== 'undefined') {
  useAppStore.getState().checkBackendConnection();
}

