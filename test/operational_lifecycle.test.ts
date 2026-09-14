import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationalDatabase } from '../server/db/sqliteStorage.ts';
import { OperationalEngine } from '../server/services/operationalEngine.ts';
import {
  evaluateColdChainRisk,
  findSuitableGodownForShipment,
  isGodownCargoCompatible,
} from '../src/services/logisticsEngine.ts';

test('Incident lifecycle: initial submission enters pending_verification', () => {
  const db = new OperationalDatabase(':memory:');
  const engine = new OperationalEngine(db);

  const incident = engine.createIncident({
    type: 'landslide',
    severity: 'critical',
    location: [25.32, 93.55],
    locationName: 'NH-2 Mao Gate Segment',
    description: 'Massive slope failure blocking both lanes',
    reportedBy: 'Prem Thoudam',
    reportedVehicleId: 'MN-04-B-1121',
  });

  assert.strictEqual(incident.syncStatus, 'pending_verification');
  assert.strictEqual(incident.verifiedBy, undefined);

  // Check that road is still open prior to SDMA human verification
  const road = db.getRoadSegmentById('rd-001');
  assert.strictEqual(road?.status, 'open', 'Road must remain open before SDMA verification');
});

test('Incident rejection: SDMA officer rejection marks rejected and does NOT block road', () => {
  const db = new OperationalDatabase(':memory:');
  const engine = new OperationalEngine(db);

  const incident = engine.createIncident({
    type: 'tree_fall',
    severity: 'low',
    location: [25.32, 93.55],
    locationName: 'NH-2 Mao Gate Segment',
    description: 'Small branch on shoulder, traffic flowing',
    reportedBy: 'Field Driver',
  });

  const result = engine.verifyIncident(incident.id, false, 'SDMA Command Officer', 'Cleared by patrol');
  assert.strictEqual(result.incident.syncStatus, 'rejected');
  assert.strictEqual(result.incident.notes, 'Cleared by patrol');

  const road = db.getRoadSegmentById('rd-001');
  assert.strictEqual(road?.status, 'open');
  assert.strictEqual(result.disruption, undefined);
});

test('Incident approval & road blockage association: SDMA verification triggers active disruption', () => {
  const db = new OperationalDatabase(':memory:');
  const engine = new OperationalEngine(db);

  const incident = engine.createIncident({
    type: 'landslide',
    severity: 'critical',
    location: [25.32, 93.55],
    locationName: 'NH-2 Mao Gate Segment',
    description: 'Massive landslide at Mao Gate NH-2 completely blocking highway',
    reportedBy: 'Field Driver',
  });

  const result = engine.verifyIncident(incident.id, true, 'Officer R. Sharma (Manipur SDMA)');
  assert.strictEqual(result.incident.syncStatus, 'verified');
  assert.strictEqual(result.incident.verifiedBy, 'Officer R. Sharma (Manipur SDMA)');

  // Road should now be blocked
  assert.ok(result.affectedRoad, 'Associated road segment should be found');
  assert.strictEqual(result.affectedRoad?.id, 'rd-001');
  assert.strictEqual(result.affectedRoad?.status, 'blocked');
  assert.strictEqual(result.affectedRoad?.riskLevel, 'blocked');

  // Disruption record created
  assert.ok(result.disruption, 'Disruption record must be generated');
  assert.strictEqual(result.disruption?.status, 'active');
  assert.strictEqual(result.disruption?.affectedSegmentId, 'rd-001');
});

test('Fleet impact propagation: vehicles routed through blocked road are marked disrupted', () => {
  const db = new OperationalDatabase(':memory:');
  const engine = new OperationalEngine(db);

  const incident = engine.createIncident({
    type: 'landslide',
    severity: 'critical',
    location: [25.32, 93.55],
    locationName: 'NH-2 Mao Gate Segment',
    description: 'Landslide at Mao Gate',
    reportedBy: 'Prem Thoudam',
  });

  const result = engine.verifyIncident(incident.id, true, 'SDMA Command');

  // MN-04-B-1121 and NL-02-C-3391 both use route-b which includes rd-001
  const affectedIds = result.affectedVehicles.map((v) => v.id);
  assert.ok(
    affectedIds.includes('MN-04-B-1121'),
    'Vehicle MN-04-B-1121 on route-b must be detected as affected'
  );

  const vehicleInDb = db.getVehicleById('MN-04-B-1121');
  assert.strictEqual(vehicleInDb?.status, 'disrupted');
  assert.ok(vehicleInDb?.affectedByDisruptionId, 'Must be linked to active disruption');
});

test('Shipment impact & cold-chain risk evaluation', () => {
  const db = new OperationalDatabase(':memory:');
  const engine = new OperationalEngine(db);

  // Trigger disruption on rd-001
  const incident = engine.createIncident({
    type: 'landslide',
    severity: 'critical',
    location: [25.32, 93.55],
    locationName: 'NH-2 Mao Gate Segment',
    description: 'Complete blockage',
  });
  engine.verifyIncident(incident.id, true, 'SDMA Command');

  const snapshot = engine.getSnapshot();
  const shipment = snapshot.shipments.find((s) => s.vehicleId === 'MN-04-B-1121');

  assert.ok(shipment, 'Shipment for MN-04-B-1121 must exist');
  assert.strictEqual(shipment?.currentStatus, 'delayed');
  assert.strictEqual(shipment?.continuityStatus, 'at_risk');
  assert.strictEqual(shipment?.affected, true);
  assert.strictEqual(shipment?.coldChainRequired, true);

  // Cold-chain risk function verification
  const thermalCheck = evaluateColdChainRisk(shipment!, 120);
  assert.strictEqual(thermalCheck.hasRisk, true);
  assert.ok(thermalCheck.message.includes('Cold-chain risk'));
});

test('Godown suitability matching for emergency buffer diversion', () => {
  const db = new OperationalDatabase(':memory:');
  const godowns = db.getAllGodowns();
  assert.ok(godowns.length > 0, 'Godowns must exist in baseline');

  // Verify compatibility checker
  const dimapurGodown = godowns.find((g) => g.id === 'gd-dimapur')!;
  assert.ok(
    isGodownCargoCompatible(dimapurGodown, 'Emergency Pharmaceuticals'),
    'Dimapur should accept pharmaceuticals'
  );

  const vehicle = db.getVehicleById('MN-04-B-1121')!;
  const shipment = db.getShipmentByVehicleId('MN-04-B-1121')!;

  const matched = findSuitableGodownForShipment(vehicle, shipment, godowns, 20);
  assert.ok(matched, 'Should identify suitable godown');
  assert.ok(matched.godown.availableStock >= 20);
});

test('Emergency supply & pickup lifecycle: request -> approve -> atomic stock reservation', () => {
  const db = new OperationalDatabase(':memory:');
  const engine = new OperationalEngine(db);

  const initialGodown = db.getGodownById('gd-dimapur')!;
  const initialStock = initialGodown.availableStock;

  // 1. Create pickup request
  const request = engine.createPickupRequest({
    vehicleId: 'MN-04-B-1121',
    driverName: 'Prem Thoudam',
    cargoType: 'Emergency Pharmaceuticals',
    godownId: 'gd-dimapur',
    quantity: 15,
    reason: 'NH-2 impassable',
  });

  assert.strictEqual(request.status, 'requested');
  assert.strictEqual(request.quantity, 15);

  // Vehicle status should be marked no_alternative
  const vehicleDuringReq = db.getVehicleById('MN-04-B-1121');
  assert.strictEqual(vehicleDuringReq?.rerouteStatus, 'no_alternative');

  // 2. Approve pickup request
  const approval = engine.approvePickupRequest(request.id, 'Resilio Logistics Contractor');
  assert.strictEqual(approval.request.status, 'dispatched');
  assert.strictEqual(approval.request.contractorName, 'Resilio Logistics Contractor');

  // 3. Verify stock decremented atomically
  const postGodown = db.getGodownById('gd-dimapur')!;
  assert.strictEqual(
    postGodown.availableStock,
    initialStock - 15,
    'Godown stock must decrement by requested quantity'
  );

  // 4. Vehicle rerouted to godown
  const postVehicle = db.getVehicleById('MN-04-B-1121');
  assert.strictEqual(postVehicle?.status, 'emergency_pickup');
  assert.ok(postVehicle?.destination?.includes('Dimapur'));
});
