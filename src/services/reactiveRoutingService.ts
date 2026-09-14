import type { Route, Vehicle } from '../types/index.ts';

export const LOCATIONS: Record<string, { name: string; shortName: string; lat: number; lng: number }> = {
  guwahati: {
    name: 'Guwahati Logistics Hub',
    shortName: 'Guwahati',
    lat: 26.1445,
    lng: 91.7362,
  },
  imphal: {
    name: 'Imphal District Hospital',
    shortName: 'Imphal',
    lat: 24.817,
    lng: 93.9368,
  },
  dimapur: {
    name: 'Dimapur Supply Node',
    shortName: 'Dimapur',
    lat: 25.9093,
    lng: 93.7265,
  },
  kohima: {
    name: 'Kohima Relief Camp',
    shortName: 'Kohima',
    lat: 25.6751,
    lng: 94.1086,
  },
  silchar: {
    name: 'Silchar Distribution Center',
    shortName: 'Silchar',
    lat: 24.8268,
    lng: 92.7981,
  },
};

export const DEMO_ROUTES: Record<string, Route> = {
  saferRoute: {
    id: 'route-a',
    label: 'Route A — Safer',
    description: 'Via Dimapur Hill Road',
    riskScore: 18,
    riskLevel: 'low',
    etaMinutes: 615,
    distanceKm: 498,
    recommended: true,
    segmentIds: ['rd-002', 'rd-003'],
    waypoints: [
      [26.1445, 91.7362],
      [25.9093, 93.7265],
      [25.6751, 94.1086],
      [24.817, 93.9368],
    ],
  },
  fasterRoute: {
    id: 'route-b',
    label: 'Route B — Faster',
    description: 'Via NH-2 Direct',
    riskScore: 82,
    riskLevel: 'high',
    etaMinutes: 525,
    distanceKm: 421,
    recommended: false,
    segmentIds: ['rd-001'],
    waypoints: [
      [26.1445, 91.7362],
      [25.5, 93.2],
      [24.817, 93.9368],
    ],
  },
};

export const DEMO_ROUTE_LIST: Route[] = Object.values(DEMO_ROUTES);

export function sqDist(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

export function nearestLocationLabel(coord: [number, number]): string {
  let bestName = 'current position';
  let best = Infinity;
  for (const loc of Object.values(LOCATIONS)) {
    const d = sqDist(coord, [loc.lat, loc.lng]);
    if (d < best) {
      best = d;
      bestName = loc.shortName;
    }
  }
  return `Current position — ${bestName}`;
}

/**
 * Builds reactive detour waypoints starting strictly at the vehicle's CURRENT location [lat, lng].
 * Slices the alternate corridor from the closest forward waypoint onward, preventing backwards jumps.
 */
export function buildReactiveWaypoints(
  from: [number, number],
  template: Route,
  destination?: string
): [number, number][] {
  const destLoc = destination
    ? Object.values(LOCATIONS).find(
        (l) =>
          l.shortName.toLowerCase() === destination.toLowerCase() ||
          l.name.toLowerCase().includes(destination.toLowerCase())
      )
    : undefined;

  // Skip template origin — reactive routing starts strictly from where the vehicle is now.
  const corridor = template.waypoints.slice(1);
  if (corridor.length === 0) {
    const dest: [number, number] = destLoc
      ? [destLoc.lat, destLoc.lng]
      : template.waypoints[template.waypoints.length - 1];
    return [from, dest];
  }

  let nearestIdx = 0;
  let nearest = Infinity;
  corridor.forEach((wp, i) => {
    const d = sqDist(from, wp);
    if (d < nearest) {
      nearest = d;
      nearestIdx = i;
    }
  });

  let rest = corridor.slice(nearestIdx);

  if (destLoc) {
    const dest: [number, number] = [destLoc.lat, destLoc.lng];
    const destIdx = rest.findIndex((wp) => sqDist(wp, dest) < 0.0025);
    if (destIdx >= 0) {
      rest = rest.slice(0, destIdx + 1);
    } else if (sqDist(rest[rest.length - 1], dest) > 0.0025) {
      rest = [...rest, dest];
    }
  }

  const first = rest[0];
  const alreadyAtJoin = first && sqDist(first, from) < 0.0025;
  return alreadyAtJoin ? rest : [from, ...rest];
}

export function routeAvoidsSegment(route: Route, blockedSegmentId: string): boolean {
  if (route.segmentIds && route.segmentIds.length > 0) {
    return !route.segmentIds.includes(blockedSegmentId);
  }
  if (blockedSegmentId === 'rd-001') return route.id !== 'route-b';
  return true;
}

export function findAlternateRoute(vehicle: Vehicle, blockedSegmentId: string): Route | undefined {
  // NL-02-C-3391 is already at the Mao Gate cut where no viable highway continuation exists
  if (vehicle.id === 'NL-02-C-3391') {
    return undefined;
  }
  const currentId = vehicle.plannedRouteId || vehicle.currentRoute;
  return (
    DEMO_ROUTE_LIST.find((r) => r.id !== currentId && routeAvoidsSegment(r, blockedSegmentId)) ||
    DEMO_ROUTE_LIST.find((r) => routeAvoidsSegment(r, blockedSegmentId))
  );
}

export function getReactiveDisplayRoute(vehicle: Vehicle): Route | undefined {
  if (vehicle.rerouteStatus !== 'active' || !vehicle.rerouteFrom) return undefined;
  const template = DEMO_ROUTE_LIST.find(
    (r) => r.id === (vehicle.currentRoute || vehicle.plannedRouteId)
  );
  if (!template) return undefined;
  const waypoints =
    vehicle.rerouteWaypoints ??
    buildReactiveWaypoints(
      vehicle.rerouteFrom,
      template,
      vehicle.rerouteTo || vehicle.destination
    );
  return {
    ...template,
    id: `reactive-${vehicle.id}`,
    label: `Reactive — ${template.label}`,
    description: `From ${vehicle.rerouteFromLabel || 'current position'} to ${vehicle.rerouteTo || vehicle.destination || 'destination'}`,
    etaMinutes: vehicle.etaMinutes ?? template.etaMinutes,
    recommended: true,
    waypoints,
  };
}
