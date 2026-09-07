import { create } from 'zustand';
import type { UserRole, NetworkStatus, Route } from '@/types';

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
  
  setRole: (role: UserRole) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  toggleSidebar: () => void;
  setTripState: (state: Partial<Pick<AppState, 'activeTripId' | 'selectedRouteId' | 'selectedCustomRoute' | 'isOfflineReady' | 'isJourneyActive'>>) => void;
  setSelectedCustomRoute: (route: Route | null) => void;
  setPendingIncidentsCount: (count: number) => void;
  setSelectedDriverVehicleId: (id: string) => void;
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
  
  setRole: (role) => set({ role }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTripState: (newState) => set((state) => ({ ...state, ...newState })),
  setSelectedCustomRoute: (selectedCustomRoute) => set({ selectedCustomRoute }),
  setPendingIncidentsCount: (count) => set({ pendingIncidentsCount: count }),
  setSelectedDriverVehicleId: (selectedDriverVehicleId) => set({ selectedDriverVehicleId }),
}));
