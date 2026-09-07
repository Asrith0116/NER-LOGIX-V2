import type { LocationSnapshot, LocationSource } from '@/types';

export interface LocationProvider {
  getCurrentLocation(fallbackCoords?: { lat: number; lng: number; name: string }): Promise<LocationSnapshot>;
}

export class HybridLocationProvider implements LocationProvider {
  async getCurrentLocation(fallbackCoords?: { lat: number; lng: number; name: string }): Promise<LocationSnapshot> {
    const fallback: LocationSnapshot = {
      lat: fallbackCoords?.lat ?? 26.1445,
      lng: fallbackCoords?.lng ?? 91.7362,
      locationName: fallbackCoords?.name ?? 'Guwahati Logistics Hub (NH-27)',
      accuracyMeters: 15,
      source: 'SIMULATED' as LocationSource,
      timestamp: new Date().toISOString(),
    };

    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return fallback;
    }

    return new Promise<LocationSnapshot>((resolve) => {
      // 3.5 second timeout for browser geolocation to prevent UI hanging
      const timeoutId = setTimeout(() => {
        resolve(fallback);
      }, 3500);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutId);
          resolve({
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
            locationName: fallbackCoords?.name || 'Live GPS Coordinates',
            accuracyMeters: Math.round(pos.coords.accuracy || 10),
            source: 'DEVICE_GPS' as LocationSource,
            timestamp: new Date(pos.timestamp).toISOString(),
          });
        },
        () => {
          clearTimeout(timeoutId);
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
      );
    });
  }
}

export const locationProvider = new HybridLocationProvider();
