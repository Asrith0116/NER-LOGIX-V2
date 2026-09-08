/**
 * Local Fallback Routing Provider.
 * Wraps SeededCorridorRouteProvider to guarantee offline/local corridor candidate generation.
 */

import type { TripRequest, RouteCandidate, OperationalContext, RouteProvider } from '@/types';
import { defaultRouteProvider } from './tripIntelligence';

export class LocalFallbackRoutingProvider implements RouteProvider {
  readonly id = 'local_fallback_engine';
  readonly name = 'NER-LOGIX Deterministic Local Engine';
  readonly isLive = false;

  findCandidates(request: TripRequest, context: OperationalContext): Promise<RouteCandidate[]> | RouteCandidate[] {
    return defaultRouteProvider.findCandidates(request, context);
  }
}
