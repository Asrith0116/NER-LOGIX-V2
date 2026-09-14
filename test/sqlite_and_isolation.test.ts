import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OperationalDatabase } from '../server/db/sqliteStorage.ts';
import type { Incident, RoadSegment, Vehicle } from '../src/types/index.ts';

const DB_PATH = path.resolve(process.cwd(), '.data/operations.db');

test('1. SQLite initialization in memory works and seeds baseline', () => {
  const db = new OperationalDatabase(':memory:');
  const health = db.getHealthInfo();

  assert.strictEqual(health.isPersistent, false);
  assert.strictEqual(health.location, ':memory:');
  assert.ok(health.tableCounts.roadSegments > 0, 'Should seed baseline road segments');
  assert.ok(health.tableCounts.vehicles > 0, 'Should seed baseline vehicles');
  assert.ok(health.tableCounts.godowns > 0, 'Should seed baseline godowns');
});

test('2. CRITICAL: In-memory database never mutates .data/operations.db', () => {
  let initialMtime = 0;
  if (fs.existsSync(DB_PATH)) {
    initialMtime = fs.statSync(DB_PATH).mtimeMs;
  }

  const memoryDb = new OperationalDatabase(':memory:');

  // Insert test data in memory
  const testIncident: Incident = {
    id: 'INC-ISOLATION-TEST',
    type: 'landslide',
    severity: 'critical',
    location: [25.32, 93.55],
    locationName: 'Isolation Test Corridor',
    description: 'Test incident in memory only',
    reportedBy: 'Test Driver',
    reportedAt: new Date().toISOString(),
    syncStatus: 'pending_verification',
  };

  memoryDb.saveIncident(testIncident);

  // Verify memory db has it
  const retrieved = memoryDb.getIncidentById('INC-ISOLATION-TEST');
  assert.ok(retrieved, 'Memory db should contain the test incident');
  assert.strictEqual(retrieved?.id, 'INC-ISOLATION-TEST');

  // Check that the file on disk was NOT modified
  if (fs.existsSync(DB_PATH)) {
    const postMtime = fs.statSync(DB_PATH).mtimeMs;
    assert.strictEqual(
      postMtime,
      initialMtime,
      'Disk database .data/operations.db mtime must NOT change during isolated tests'
    );
  }
});

test('3. Incident insertion and retrieval preserves schema fields', () => {
  const db = new OperationalDatabase(':memory:');

  const now = new Date().toISOString();
  const testIncident: Incident = {
    id: 'INC-SCHEMA-001',
    type: 'rockfall',
    severity: 'high',
    location: [25.675, 94.108],
    locationName: 'Kohima Bypass',
    locationSource: 'DEVICE_GPS',
    description: 'Boulders on northern carriageway',
    reportedBy: 'Kezha Sema',
    reportedVehicleId: 'NL-02-C-3391',
    reportedAt: now,
    syncStatus: 'pending_verification',
    notes: 'Restricted to single lane',
  };

  db.saveIncident(testIncident);

  const found = db.getIncidentById('INC-SCHEMA-001');
  assert.ok(found, 'Incident should be found by ID');
  assert.strictEqual(found?.type, 'rockfall');
  assert.strictEqual(found?.severity, 'high');
  assert.strictEqual(found?.locationName, 'Kohima Bypass');
  assert.strictEqual(found?.syncStatus, 'pending_verification');
  assert.deepStrictEqual(found?.location, [25.675, 94.108]);
});

test('4. Operational persistence behavior: updating road and vehicle state in DB', () => {
  const db = new OperationalDatabase(':memory:');

  const road = db.getRoadSegmentById('rd-001');
  assert.ok(road, 'Baseline road rd-001 must exist');
  assert.strictEqual(road?.status, 'open');

  // Mutate road
  const updatedRoad: RoadSegment = {
    ...road!,
    status: 'blocked',
    riskLevel: 'blocked',
    lastUpdated: new Date().toISOString(),
  };
  db.saveRoadSegment(updatedRoad);

  const reReadRoad = db.getRoadSegmentById('rd-001');
  assert.strictEqual(reReadRoad?.status, 'blocked');
  assert.strictEqual(reReadRoad?.riskLevel, 'blocked');

  // Mutate vehicle
  const vehicle = db.getVehicleById('MN-04-B-1121');
  assert.ok(vehicle, 'Baseline vehicle MN-04-B-1121 must exist');

  const updatedVehicle: Vehicle = {
    ...vehicle!,
    status: 'disrupted',
    riskLevel: 'critical',
  };
  db.saveVehicle(updatedVehicle);

  const reReadVehicle = db.getVehicleById('MN-04-B-1121');
  assert.strictEqual(reReadVehicle?.status, 'disrupted');
  assert.strictEqual(reReadVehicle?.riskLevel, 'critical');
});
