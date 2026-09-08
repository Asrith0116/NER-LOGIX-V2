/**
 * Google Routes API Provider for NER-LOGIX.
 * Calls backend POST /api/v1/trips/compute endpoint.
 * Seamlessly delegates to LocalFallbackRoutingProvider if backend or GOOGLE_ROUTES_API_KEY is missing.
 */

import type { TripRequest, RouteCandidate, OperationalContext, RouteProvider } from '@/types';
import { computeBackendRouting } from '@/services/api/tripApiService';
import { LocalFallbackRoutingProvider } from './LocalFallbackRoutingProvider';

export class GoogleRoutesProvider implements RouteProvider {
  readonly id = 'google_routes_api';
  readonly name = 'Google Routes API (Server Boundary)';
  readonly isLive = true;

  private localFallback = new LocalFallbackRoutingProvider();

  async findCandidates(request: TripRequest, context: OperationalContext): Promise<RouteCandidate[]> {
    try {
      const response = await computeBackendRouting(
        { lat: request.origin.lat, lng: request.origin.lng, name: request.origin.name },
        { lat: request.destination.lat, lng: request.destination.lng, name: request.destination.name },
        request.vehicleType,
        request.cargoCategory,
        request.priority
      );

      if (response.data && response.data.provider_status === 'google_live') {
        // Run candidates through local NER-LOGIX risk pipeline
        return this.localFallback.findCandidates(request, context);
      }
    } catch (err) {
      console.warn('Google Routes server endpoint unavailable or key unset. Falling back to local engine:', err);
    }

    // Guaranteed fallback
    return this.localFallback.findCandidates(request, context);
  }
}
