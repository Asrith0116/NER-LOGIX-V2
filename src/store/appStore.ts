import { create } from 'zustand';
import type { UserRole, NetworkStatus, Route } from '@/types';
import { checkBackendHealth, BackendHealthInfo } from '@/services/api/backendHealthService';

export type BackendConnectionStatus = 'connected' | 'disconnected' | 'checking';

export interface DriverTripContext {
  tripId?: string;
  vehicleId: string;
  originKey: string;
  originName: string;
  destinationKey: string;
  destKey?: string;
  destinationName: string;
  cargoCategory?: string;
  cargoType?: string;
  priority?: string;
  selectedRouteId?: string | null;
  selectedRoute?: Route | null;
  committedRoute?: Route | null;
  isCommitted: boolean;
  isJourneyActive: boolean;
  etaMinutes?: number;
}

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
  vehicleTripContexts: Record<string, DriverTripContext>;
  
  setRole: (role: UserRole) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  toggleSidebar: () => void;
  setTripState: (state: Partial<Pick<AppState, 'activeTripId' | 'selectedRouteId' | 'selectedCustomRoute' | 'isOfflineReady' | 'isJourneyActive'>>) => void;
  setSelectedCustomRoute: (route: Route | null) => void;
  setPendingIncidentsCount: (count: number) => void;
  setSelectedDriverVehicleId: (id: string) => void;
  setVehicleTripDraft: (vehicleId: string, draft: Partial<DriverTripContext>) => void;
  commitVehicleTrip: (vehicleId: string, trip: Partial<DriverTripContext>) => void;
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
  vehicleTripContexts: {},
  
  setRole: (role) => set({ role }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTripState: (newState) => set((state) => ({ ...state, ...newState })),
  setSelectedCustomRoute: (selectedCustomRoute) => set({ selectedCustomRoute }),
  setPendingIncidentsCount: (count) => set({ pendingIncidentsCount: count }),
  setSelectedDriverVehicleId: (selectedDriverVehicleId) => set({ selectedDriverVehicleId }),
  
  setVehicleTripDraft: (vehicleId: string, draft: Partial<DriverTripContext>) => {
    set((state) => {
      const existing = state.vehicleTripContexts[vehicleId] || {
        vehicleId,
        originKey: 'guwahati',
        originName: 'Guwahati Logistics Hub',
        destinationKey: 'imphal',
        destinationName: 'Imphal District Hospital',
        isCommitted: false,
        isJourneyActive: false,
      };
      return {
        vehicleTripContexts: {
          ...state.vehicleTripContexts,
          [vehicleId]: {
            ...existing,
            ...draft,
            vehicleId,
          },
        },
      };
    });
  },

  commitVehicleTrip: (vehicleId: string, trip: Partial<DriverTripContext>) => {
    set((state) => {
      const existing = state.vehicleTripContexts[vehicleId] || {
        vehicleId,
        originKey: 'guwahati',
        originName: 'Guwahati',
        destinationKey: 'imphal',
        destKey: 'imphal',
        destinationName: 'Imphal',
        isCommitted: false,
        isJourneyActive: false,
      };
      const updated: DriverTripContext = {
        ...existing,
        ...trip,
        destKey: trip.destKey || trip.destinationKey || existing.destKey || existing.destinationKey || 'imphal',
        destinationKey: trip.destinationKey || trip.destKey || existing.destinationKey || existing.destKey || 'imphal',
        vehicleId,
        isCommitted: true,
        isJourneyActive: true,
      };
      return {
        activeTripId: updated.tripId || 'TRIP-DEMO-001',
        selectedRouteId: updated.selectedRouteId || null,
        selectedCustomRoute: updated.committedRoute || updated.selectedRoute || null,
        isOfflineReady: true,
        isJourneyActive: true,
        vehicleTripContexts: {
          ...state.vehicleTripContexts,
          [vehicleId]: updated,
        },
      };
    });
  },

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

