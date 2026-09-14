import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReactiveWaypoints,
  findAlternateRoute,
  routeAvoidsSegment,
  nearestLocationLabel,
  DEMO_ROUTES,
} from '../src/services/reactiveRoutingService.ts';
import type { Vehicle } from '../src/types/index.ts';

test('Reactive Waypoints: starts strictly from the vehicle CURRENT position', () => {
  const currentVehiclePos: [number, number] = [25.45, 93.15];
  const templateRoute = DEMO_ROUTES.saferRoute; // Route A

  const waypoints = buildReactiveWaypoints(currentVehiclePos, templateRoute, 'Imphal');

  assert.ok(waypoints.length >= 2, 'Reroute must have at least start and destination waypoints');

  // Verify waypoints start at CURRENT vehicle position, NOT route origin (Guwahati 26.1445, 91.7362)
  assert.strictEqual(
    waypoints[0][0],
    currentVehiclePos[0],
    'First waypoint latitude must match vehicle current position'
  );
  assert.strictEqual(
    waypoints[0][1],
    currentVehiclePos[1],
    'First waypoint longitude must match vehicle current position'
  );

  assert.notDeepStrictEqual(
    waypoints[0],
    templateRoute.waypoints[0],
    'Must NOT start at template origin (Guwahati)'
  );
});

test('Reactive Waypoints: reaches destination without backwards jumps', () => {
  const currentVehiclePos: [number, number] = [25.75, 93.85];
  const templateRoute = DEMO_ROUTES.saferRoute;

  const waypoints = buildReactiveWaypoints(currentVehiclePos, templateRoute, 'Imphal');

  const destinationWp = waypoints[waypoints.length - 1];
  assert.strictEqual(destinationWp[0], 24.817, 'Destination latitude must reach Imphal');
  assert.strictEqual(destinationWp[1], 93.9368, 'Destination longitude must reach Imphal');
});

test('Route avoidance: correctly identifies corridors avoiding blocked segment', () => {
  const saferRoute = DEMO_ROUTES.saferRoute; // Route A: rd-002, rd-003
  const fasterRoute = DEMO_ROUTES.fasterRoute; // Route B: rd-001

  assert.strictEqual(routeAvoidsSegment(saferRoute, 'rd-001'), true);
  assert.strictEqual(routeAvoidsSegment(fasterRoute, 'rd-001'), false);
});

test('Alternate route resolution: vehicle with viable detour gets Route A, vehicle at cut gets undefined', () => {
  const vehicleMN04: Vehicle = {
    id: 'MN-04-B-1121',
    driverName: 'Prem Thoudam',
    type: 'Heavy Truck',
    status: 'disrupted',
    riskLevel: 'high',
    location: [25.32, 93.55],
    origin: 'Guwahati',
    destination: 'Imphal',
    cargoType: 'Emergency Pharmaceuticals',
    plannedRouteId: 'route-b',
    assignedCorridorId: 'cor-001',
    plannedSegmentIds: ['rd-001'],
  };

  const alternateMN04 = findAlternateRoute(vehicleMN04, 'rd-001');
  assert.ok(alternateMN04, 'Vehicle MN-04-B-1121 should receive alternate route');
  assert.strictEqual(alternateMN04?.id, 'route-a', 'Should reroute via Route A');

  // Vehicle NL-02 is already at the Mao Gate cut point where highway continuation is impossible
  const vehicleNL02: Vehicle = {
    id: 'NL-02-C-3391',
    driverName: 'Kezha Sema',
    type: 'Medium Truck',
    status: 'disrupted',
    riskLevel: 'critical',
    location: [25.56, 94.12],
    origin: 'Guwahati',
    destination: 'Kohima',
    cargoType: 'Relief Rations & Grain',
    plannedRouteId: 'route-b',
    assignedCorridorId: 'cor-001',
    plannedSegmentIds: ['rd-001'],
  };

  const alternateNL02 = findAlternateRoute(vehicleNL02, 'rd-001');
  assert.strictEqual(
    alternateNL02,
    undefined,
    'Vehicle at cut point with no viable alternate highway must return undefined (triggering godown buffer)'
  );
});

test('Nearest location label formatting for driver location display', () => {
  const label = nearestLocationLabel([25.6751, 94.1086]);
  assert.strictEqual(label, 'Current position — Kohima');
});
