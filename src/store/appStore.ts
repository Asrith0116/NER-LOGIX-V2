import { create } from 'zustand';
import type { UserRole, NetworkStatus } from '@/types';

interface AppState {
  role: UserRole;
  networkStatus: NetworkStatus;
  sidebarCollapsed: boolean;
  activeTripId: string | null;
  selectedRouteId: string | null;
  isOfflineReady: boolean;
  isJourneyActive: boolean;
  pendingIncidentsCount: number;
  
  setRole: (role: UserRole) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  toggleSidebar: () => void;
  setTripState: (state: Partial<Pick<AppState, 'activeTripId' | 'selectedRouteId' | 'isOfflineReady' | 'isJourneyActive'>>) => void;
  setPendingIncidentsCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'driver',
  networkStatus: 'online',
  sidebarCollapsed: false,
  activeTripId: null,
  selectedRouteId: null,
  isOfflineReady: false,
  isJourneyActive: false,
  pendingIncidentsCount: 0,
  
  setRole: (role) => set({ role }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTripState: (newState) => set((state) => ({ ...state, ...newState })),
  setPendingIncidentsCount: (count) => set({ pendingIncidentsCount: count }),
}));
