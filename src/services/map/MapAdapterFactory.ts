/**
 * Map Adapter Factory for NER-LOGIX.
 * Manages provider selection (Google Maps vs Leaflet Fallback) transparently.
 */

import { GoogleMapsAdapter } from './GoogleMapsAdapter';
import { LeafletAdapter } from './LeafletAdapter';
import type { IMapAdapter, MapInitOptions, MapProviderState, MapProviderType } from './types';

export async function createMapAdapter(options: MapInitOptions): Promise<{
  adapter: IMapAdapter;
  effectiveProvider: MapProviderType;
  providerState: MapProviderState;
}> {
  const apiKey = options.apiKey || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string);

  // If a key is present and not a placeholder, attempt Google Maps initialization
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('YOUR_') && !apiKey.includes('PLACEHOLDER')) {
    const googleAdapter = new GoogleMapsAdapter();
    try {
      await googleAdapter.initialize(options);
      return {
        adapter: googleAdapter,
        effectiveProvider: 'google',
        providerState: 'google_live',
      };
    } catch (err) {
      console.warn('Google Maps initialization failed or timed out. Falling back to local Leaflet engine:', err);
    }
  }

  // Guaranteed fallback: Leaflet Local Engine
  const leafletAdapter = new LeafletAdapter();
  await leafletAdapter.initialize(options);
  return {
    adapter: leafletAdapter,
    effectiveProvider: 'leaflet',
    providerState: 'local_engine',
  };
}
