import { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { useNetworkStore } from '@/store/networkStore';
import { useAuthStore } from '@/store/authStore';
import { DEMO_DRIVER } from '@/data/demo';
import type { Vehicle } from '@/types';

export interface CurrentDriverInfo {
  vehicle: Vehicle | undefined;
  driverName: string;
  vehicleId: string;
  origin: string;
  destination: string;
  isRerouted: boolean;
  status: string;
  cargoType: string;
}

/**
 * Unified selector for active driver identity across Driver Cockpit, TopBar, Sidebar, and reporting views.
 * Ensures driver name and vehicle registration match identically everywhere in the app.
 */
export function useCurrentDriver(): CurrentDriverInfo {
  const selectedDriverVehicleId = useAppStore((state) => state.selectedDriverVehicleId);
  const activeVehicles = useNetworkStore((state) => state.activeVehicles);
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    // 1. Try selected vehicle from application state
    let matchedVehicle = activeVehicles.find((v) => v.id === selectedDriverVehicleId);

    // 2. Fallback to vehicle registered to authenticated user session
    if (!matchedVehicle && user?.vehicleId) {
      matchedVehicle = activeVehicles.find((v) => v.id === user.vehicleId);
    }

    // 3. Fallback to primary default vehicle AS-01-J-4422 or first active vehicle
    if (!matchedVehicle) {
      matchedVehicle =
        activeVehicles.find((v) => v.id === 'AS-01-J-4422') ||
        activeVehicles.find((v) => v.id === DEMO_DRIVER.vehicleId) ||
        activeVehicles[0];
    }

    const driverName =
      matchedVehicle?.driverName ||
      (user?.role === 'driver' && user.name ? user.name : DEMO_DRIVER.name);

    const vehicleId =
      matchedVehicle?.id ||
      (user?.role === 'driver' && user.vehicleId ? user.vehicleId : DEMO_DRIVER.vehicleId);

    const origin = matchedVehicle?.origin || 'Guwahati';
    const destination = matchedVehicle?.destination || 'Imphal';
    const isRerouted = matchedVehicle?.rerouteStatus === 'active';
    const status = matchedVehicle?.status || 'idle';
    const cargoType = matchedVehicle?.cargoType || 'Cold-Chain Medical Supplies';

    return {
      vehicle: matchedVehicle,
      driverName,
      vehicleId,
      origin,
      destination,
      isRerouted,
      status,
      cargoType,
    };
  }, [activeVehicles, selectedDriverVehicleId, user]);
}
