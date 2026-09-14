import test from 'node:test';
import assert from 'node:assert/strict';
import { OsmNetworkService } from '../server/services/osmNetworkService.ts';
import { HistoricalHazardService } from '../server/services/historicalHazardService.ts';
import { VehiclePositionService } from '../server/services/vehiclePositionService.ts';
import { ElevationService } from '../server/services/elevationService.ts';
import { GeospatialSnappingService } from '../server/services/geospatialSnappingService.ts';
import { calculateTripCandidates } from '../src/services/routing/tripIntelligence.ts';
import { candidateToRiskBreakdown } from '../src/services/riskEngine.ts';
import { LOCATIONS } from '../src/services/reactiveRoutingService.ts';
import type { TripRequest, OperationalContext } from '../src/types/index.ts';

// -------------------------------------------------------------
// 1. OPENSTREETMAP ROAD / NETWORK DATA INTEGRATION
// -------------------------------------------------------------
test('1.1 OSM Network Service: parses Overpass JSON elements into domain OsmRoadSegment records', () => {
  const service = new OsmNetworkService();
  const mockOverpassJson = {
    elements: [
      {
        type: 'way',
        id: 991823,
        tags: {
          name: 'National Highway 2 (Mao - Maram Mountain Sector)',
          ref: 'NH-2',
          highway: 'primary',
          maxspeed: '40',
          surface: 'asphalt',
          lanes: '2',
        },
        geometry: [
          { lat: 25.55, lon: 94.12 },
          { lat: 25.50, lon: 94.15 },
          { lat: 25.45, lon: 94.18 },
        ],
      },
    ],
  };

  const segments = service.normalizeOverpassPayload(mockOverpassJson);
  assert.strictEqual(segments.length, 1);
  const seg = segments[0];
  assert.strictEqual(seg.id, 'osm-way-991823');
  assert.strictEqual(seg.osmId, 991823);
  assert.strictEqual(seg.name, 'National Highway 2 (Mao - Maram Mountain Sector)');
  assert.strictEqual(seg.ref, 'NH-2');
  assert.strictEqual(seg.highwayType, 'primary');
  assert.strictEqual(seg.maxSpeedKmh, 40);
  assert.strictEqual(seg.surface, 'asphalt');
  assert.strictEqual(seg.lanes, 2);
  assert.strictEqual(seg.coordinates.length, 3);
  assert.strictEqual(seg.source, 'OpenStreetMap / Overpass API');
});

test('1.2 OSM Network Service: groups road segments into corridors and calculates corridor distance', async () => {
  const service = new OsmNetworkService();
  const mockFetch = async () =>
    new Response(
      JSON.stringify({
        elements: [
          {
            type: 'way',
            id: 101,
            tags: { name: 'NH-2 Asian Highway', ref: 'NH-2', maxspeed: '45', lanes: '2' },
            geometry: [
              { lat: 25.67, lon: 94.10 },
              { lat: 25.51, lon: 94.13 },
            ],
          },
        ],
      }),
      { status: 200 }
    );

  const snapshot = await service.fetchRoadNetwork(mockFetch as any);

  assert.ok(snapshot.roadSegments.length > 0, 'Must have OSM segments');
  assert.ok(snapshot.corridors.nh2_mountain_direct, 'Must identify NH-2 corridor');
  assert.ok(snapshot.corridors.wokha_ridge, 'Must identify Wokha corridor');
  assert.ok(snapshot.corridors.southern_bypass, 'Must identify Southern bypass');

  const nh2Corridor = snapshot.corridors.nh2_mountain_direct;
  assert.strictEqual(nh2Corridor.corridorKey, 'nh2_mountain_direct');
  assert.ok(nh2Corridor.totalLengthKm > 0 || nh2Corridor.segments.length > 0, 'Corridor must contain road segments');
  assert.ok(nh2Corridor.segments.length >= 1, 'Corridor must contain road segments');
});

test('1.3 OSM Network Service: caches data to prevent rate-limit flooding', async () => {
  const service = new OsmNetworkService(60000);
  const mockFetch = async () => new Response(JSON.stringify({ elements: [] }), { status: 200 });
  const first = await service.fetchRoadNetwork(mockFetch as any);
  const second = await service.fetchRoadNetwork(mockFetch as any);

  assert.strictEqual(first.fetchedAt, second.fetchedAt, 'Cached result must have matching timestamp');
});

// -------------------------------------------------------------
// 2. HISTORICAL HAZARD & LANDSLIDE INVENTORY INTEGRATION
// -------------------------------------------------------------
test('2.1 Historical Hazard Service: provides authoritative NASA GLC / GSI landslide data', () => {
  const service = new HistoricalHazardService();
  const records = service.getAllRecords();

  assert.ok(records.length >= 10, 'Must contain historical landslide event records');
  
  // Verify structure of records
  const sample = records[0];
  assert.ok(sample.id);
  assert.ok(sample.source);
  assert.ok(sample.corridorProximity);
  assert.ok(sample.trigger);
  assert.ok(typeof sample.fatalities === 'number');
  assert.ok(typeof sample.estimatedVolumeM3 === 'number');
  assert.strictEqual(sample.isSimulated, false);
});

test('2.2 Historical Hazard Service: calculates seasonal hazard exposure per corridor', () => {
  const service = new HistoricalHazardService();
  
  const nh2Exposure = service.getCorridorExposure('nh2_mountain_direct');
  assert.strictEqual(nh2Exposure.corridorKey, 'nh2_mountain_direct');
  assert.ok(nh2Exposure.totalRecordedEvents >= 4, 'NH-2 has high landslide history');
  assert.ok(nh2Exposure.historicalSeasonalRiskScore >= 10, 'NH-2 must have significant historical risk score');
  assert.ok(nh2Exposure.records.length > 0, 'NH-2 must contain landslide event records');
  assert.ok(nh2Exposure.summaryExplanation.length > 0, 'Must generate exposure summary explanation');

  const southernExposure = service.getCorridorExposure('southern_bypass');
  assert.strictEqual(southernExposure.corridorKey, 'southern_bypass');
  assert.ok(
    southernExposure.historicalSeasonalRiskScore < nh2Exposure.historicalSeasonalRiskScore,
    'Southern bypass must have lower historical hazard risk than direct mountain NH-2'
  );
});

// -------------------------------------------------------------
// 3. CURRENT VEHICLE POSITION BACKEND SIGNAL BOUNDARY
// -------------------------------------------------------------
test('3.1 Vehicle Position Service: acts as authoritative backend boundary with clear honesty labels', () => {
  const service = new VehiclePositionService();
  const initial = service.getAllPositions();

  assert.ok(initial.length > 0, 'Must contain fleet positions');
  
  const v1 = service.getPosition('AS-01-J-4422');
  assert.ok(v1);
  assert.strictEqual(v1.vehicleId, 'AS-01-J-4422');
  assert.strictEqual(v1.provenance?.isHardwareTelematics, false, 'Must explicitly state not hardware telematics');
  assert.strictEqual(v1.source, 'simulated_driver_client');
});

test('3.2 Vehicle Position Service: accepts single and batch position signal updates', () => {
  const service = new VehiclePositionService();

  const updated = service.updatePosition({
    vehicleId: 'AS-01-J-4422',
    latitude: 25.6811,
    longitude: 94.1122,
    heading: 145,
    speedKmh: 42,
  });

  assert.strictEqual(updated.vehicleId, 'AS-01-J-4422');
  assert.strictEqual(updated.latitude, 25.6811);
  assert.strictEqual(updated.longitude, 94.1122);
  assert.strictEqual(updated.speedKmh, 42);

  const batch = service.batchUpdatePositions([
    { vehicleId: 'NL-02-C-3391', latitude: 25.52, longitude: 94.14 },
    { vehicleId: 'MN-04-A-1002', latitude: 25.32, longitude: 93.99 },
  ]);

  assert.strictEqual(batch.length, 2);
  assert.strictEqual(service.getPosition('NL-02-C-3391')?.latitude, 25.52);
  assert.strictEqual(service.getPosition('MN-04-A-1002')?.latitude, 25.32);
});

// -------------------------------------------------------------
// 4. TERRAIN / ELEVATION / SLOPE INTEGRATION (OPEN-METEO COPERNICUS DEM GLO-90)
// -------------------------------------------------------------
test('4.1 Elevation Service: normalizes Copernicus DEM 90m elevations into slope & gradient profile', () => {
  const service = new ElevationService();
  const mockCoordinates: [number, number][] = [
    [25.55, 94.10], // Sample A
    [25.50, 94.12], // Sample B (approx 6.0 km)
    [25.40, 94.15], // Sample C (approx 11.5 km)
  ];
  const mockElevations = [800, 1450, 2200]; // Climbing 1400m over ~17.5km

  const profile = service.calculateProfileFromElevations(
    'nh2_mountain_direct',
    'NH-2 Mountain Direct Pass',
    mockCoordinates,
    mockElevations
  );

  assert.strictEqual(profile.corridorKey, 'nh2_mountain_direct');
  assert.strictEqual(profile.minElevationM, 800);
  assert.strictEqual(profile.maxElevationM, 2200);
  assert.strictEqual(profile.elevationGainMeters, 1400);
  assert.ok(profile.averageSlopeDegrees > 0, 'Average slope must be positive');
  assert.ok(profile.terrainRiskScore > 0, 'Terrain risk score must be computed');
  assert.strictEqual(profile.source, 'Open-Meteo Elevation API — Copernicus DEM GLO-90 (90 m)');
  assert.strictEqual(profile.isSimulated, false);
});

test('4.2 Elevation Service: computes profiles across all 3 key North East corridors', async () => {
  const service = new ElevationService();
  const profiles = await service.fetchCorridorProfiles();

  assert.ok(profiles.nh2_mountain_direct, 'Must include NH-2 direct pass profile');
  assert.ok(profiles.wokha_ridge, 'Must include Wokha Ridge profile');
  assert.ok(profiles.southern_bypass, 'Must include Southern bypass profile');

  // NH-2 Mountain pass should have high elevation peak and steep terrain
  assert.ok(profiles.nh2_mountain_direct.maxElevationM > 1800);
  assert.ok(profiles.nh2_mountain_direct.terrainRiskScore >= 12);
});

// -------------------------------------------------------------
// 5. GEOSPATIAL POINT-TO-ROAD SNAPPING (NO POSTGIS)
// -------------------------------------------------------------
test('5.1 Geospatial Snapping Service: computes accurate Haversine distance and orthogonal projection', () => {
  const service = new GeospatialSnappingService();
  
  // Point directly in Kohima near NH-2 (25.675, 94.108)
  const snap = service.snapCoordinateToRoad(25.675, 94.108, 15000);
  
  assert.strictEqual(snap.isWithinThreshold, true);
  assert.ok(snap.snappedSegmentId);
  assert.ok(snap.distanceMeters < 15000, 'Must be within threshold of NH-2');
  assert.ok(snap.snappedCoordinates && snap.snappedCoordinates.length === 2);
});

test('5.2 Geospatial Snapping Service: gracefully handles off-corridor points exceeding threshold', () => {
  const service = new GeospatialSnappingService();
  
  // Point far away in Bay of Bengal (20.0, 90.0)
  const snap = service.snapCoordinateToRoad(20.0, 90.0, 10000);
  
  assert.strictEqual(snap.isWithinThreshold, false);
  assert.ok(snap.distanceMeters > 50000);
  assert.strictEqual(snap.snappedSegmentId, undefined);
});

// -------------------------------------------------------------
// 6. DOWNSTREAM INTELLIGENCE & ROUTING DECISION INFLUENCE
// -------------------------------------------------------------
test('6.1 Downstream Routing: real historical hazard exposure and elevation profiles influence candidate risk scores', () => {
  const tripRequest: TripRequest = {
    origin: LOCATIONS.guwahati,
    destination: LOCATIONS.imphal,
    vehicleId: 'AS-01-J-4422',
    vehicleType: 'Refrigerated Truck (Cold Chain)',
    driverName: 'Arjun Baruah',
    cargoCategory: 'Cold-Chain Vaccines',
    cargoSensitivity: 'critical',
    priority: 'emergency',
    departureWindow: 'immediate',
    constraints: {
      avoidHighRiskCorridors: false,
      requireColdChain: true,
      maxElevationMeters: 2500,
      riskTolerance: 'balanced',
      avoidUnpavedSections: false,
    },
  };

  const hazardService = new HistoricalHazardService();
  const hazardSummary = hazardService.getSummary();
  
  const operationalContext: OperationalContext = {
    roadSegments: [
      {
        id: 'rd-001',
        name: 'NH-2 Mao Gate - Maram Cut',
        fromLocation: 'Mao Gate',
        toLocation: 'Maram',
        status: 'open',
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rd-002',
        name: 'NH-29 Dimapur - Kohima Pass',
        fromLocation: 'Dimapur',
        toLocation: 'Kohima',
        status: 'open',
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
      },
    ],
    disruptions: [],
    activeIncidents: [],
    weatherData: {
      Guwahati: {
        locationName: 'Guwahati',
        lat: 26.1445,
        lng: 91.7362,
        temperatureC: 28,
        precipitationMm: 2.0,
        rainfallCategory: 'light',
        windSpeedKmh: 10,
        weatherCode: 1,
        weatherDescription: 'Mainly clear',
        source: 'Open-Meteo',
        isSimulated: false,
        availabilityState: 'live',
        lastUpdated: new Date().toISOString(),
      },
      Imphal: {
        locationName: 'Imphal',
        lat: 24.817,
        lng: 93.9368,
        temperatureC: 24,
        precipitationMm: 12.0,
        rainfallCategory: 'moderate',
        windSpeedKmh: 14,
        weatherCode: 63,
        weatherDescription: 'Moderate rain',
        source: 'Open-Meteo',
        isSimulated: false,
        availabilityState: 'live',
        lastUpdated: new Date().toISOString(),
      },
    },
    historicalHazards: hazardSummary.corridors,
    elevationProfiles: {
      nh2_mountain_direct: {
        corridorKey: 'nh2_mountain_direct',
        corridorName: 'NH-2 Mountain Direct Pass',
        minElevationM: 450,
        maxElevationM: 2350,
        totalClimbM: 1900,
        totalDescentM: 500,
        maxSlopePercent: 32.1,
        averageSlopeDegrees: 26.4,
        peakLocationName: 'Mao Summit (2,350m)',
        terrainRiskScore: 22,
        profilePoints: [],
        source: 'Open-Meteo Elevation API — Copernicus DEM GLO-90 (90 m)',
        isSimulated: false,
        availabilityState: 'live',
        calculatedAt: new Date().toISOString(),
      },
    },
  };

  const candidates = calculateTripCandidates(tripRequest, operationalContext);
  assert.ok(candidates.length >= 3, 'Must produce multi-candidate corridor comparisons');

  const nh2Candidate = candidates.find((c) => c.corridorKey === 'nh2_mountain_direct' || c.id === 'route-b');
  assert.ok(nh2Candidate, 'NH-2 candidate must be generated');

  // Verify that feature breakdown ingested the real elevation slope (26.4°) and historical landslide events
  assert.strictEqual(nh2Candidate.featureBreakdown.terrainSlopeDegrees, 26.4);
  assert.strictEqual(nh2Candidate.featureBreakdown.riskComponents.terrain, 22);

  // Generate explainable risk assessment
  const breakdown = candidateToRiskBreakdown(nh2Candidate);
  assert.strictEqual(breakdown.factors.slopeTerrain.score, 22);
  assert.ok(breakdown.factors.slopeTerrain.value.includes('26.4°'));
  assert.ok(breakdown.plainLanguageExplanation.length > 0);
});

test('6.2 Multi-Node Pair Route Geometry: Kohima to Silchar candidate waypoints start strictly at Kohima and end at Silchar', () => {
  const kohimaLoc = LOCATIONS.kohima;
  const silcharLoc = LOCATIONS.silchar;

  const tripRequest: TripRequest = {
    origin: kohimaLoc,
    destination: silcharLoc,
    vehicleId: 'AS-01-J-4422',
    vehicleType: 'Refrigerated Truck',
    driverName: 'Arjun Baruah',
    cargoCategory: 'Essential Medicines',
    cargoSensitivity: 'critical',
    priority: 'standard',
    departureWindow: 'immediate',
    constraints: {
      avoidHighRiskCorridors: false,
      requireColdChain: true,
      maxElevationMeters: 2500,
      riskTolerance: 'balanced',
      avoidUnpavedSections: false,
    },
  };

  const operationalContext: OperationalContext = {
    roadSegments: [],
    disruptions: [],
    activeIncidents: [],
    weatherData: {},
  };

  const candidates = calculateTripCandidates(tripRequest, operationalContext);
  assert.ok(candidates.length === 4, 'Must produce 4 corridor candidates for Kohima -> Silchar');

  for (const candidate of candidates) {
    const startWp = candidate.waypoints[0];
    const endWp = candidate.waypoints[candidate.waypoints.length - 1];

    assert.strictEqual(startWp[0], kohimaLoc.lat, `${candidate.label} start lat must match Kohima lat`);
    assert.strictEqual(startWp[1], kohimaLoc.lng, `${candidate.label} start lng must match Kohima lng`);

    assert.strictEqual(endWp[0], silcharLoc.lat, `${candidate.label} end lat must match Silchar lat`);
    assert.strictEqual(endWp[1], silcharLoc.lng, `${candidate.label} end lng must match Silchar lng`);

    assert.ok(candidate.distanceKm > 150 && candidate.distanceKm < 350, `${candidate.label} distance (${candidate.distanceKm} km) must reflect Kohima-Silchar corridor scale`);
  }
});
