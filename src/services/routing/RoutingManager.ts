/**
 * Routing Manager for NER-LOGIX.
 * Coordinates multi-candidate route generation between Google Routes API and Local Fallback Engine.
 */

import type { TripRequest, RouteCandidate, OperationalContext } from '@/types';
import { GoogleRoutesProvider } from './GoogleRoutesProvider';
import { LocalFallbackRoutingProvider } from './LocalFallbackRoutingProvider';

export class RoutingManager {
  private googleProvider = new GoogleRoutesProvider();
  private localProvider = new LocalFallbackRoutingProvider();

  async calculateCandidates(
    request: TripRequest,
    context: OperationalContext,
    preferredProvider: 'auto' | 'google' | 'local' = 'auto'
  ): Promise<RouteCandidate[]> {
    if (preferredProvider === 'local') {
      return this.localProvider.findCandidates(request, context);
    }

    // Try Google Routes API first when set to auto or google
    try {
      const candidates = await this.googleProvider.findCandidates(request, context);
      if (candidates && candidates.length > 0) {
        return candidates;
      }
    } catch (err) {
      console.warn('Google Routes provider failed. Falling back to local route provider:', err);
    }

    return this.localProvider.findCandidates(request, context);
  }
}

export const globalRoutingManager = new RoutingManager();
