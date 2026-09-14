import test from 'node:test';
import assert from 'node:assert/strict';
import { BackendWeatherService, categorizeRainfall, getWeatherDescription } from '../server/services/weatherService.ts';
import { calculateExplainableRisk } from '../src/services/riskEngine.ts';
import { calculateTripCandidates } from '../src/services/routing/tripIntelligence.ts';
import { LOCATIONS } from '../src/services/reactiveRoutingService.ts';
import type { TripRequest, OperationalConstraints, EnvironmentalSnapshot } from '../src/types/index.ts';

test('1. Open-Meteo Normalization: accurately parses raw Open-Meteo JSON into EnvironmentalSnapshot', () => {
  const service = new BackendWeatherService();
  const mockOpenMeteoJson = {
    current: {
      temperature_2m: 23.4,
      precipitation: 18.5,
      rain: 18.5,
      weather_code: 65,
      wind_speed_10m: 22.1,
    },
    hourly: {
      precipitation: [1.2, 2.5, 3.1, 4.0, 1.0, 0.5, 0.0, 0.0],
    },
  };

  const normalized = service.normalizeOpenMeteoPayload(
    'Kohima',
    25.6751,
    94.1086,
    mockOpenMeteoJson
  );

  assert.strictEqual(normalized.locationName, 'Kohima');
  assert.strictEqual(normalized.lat, 25.6751);
  assert.strictEqual(normalized.lng, 94.1086);
  assert.strictEqual(normalized.temperatureC, 23);
  assert.strictEqual(normalized.precipitationMm, 18.5);
  assert.strictEqual(normalized.rainfallCategory, 'moderate');
  assert.strictEqual(normalized.windSpeedKmh, 22);
  assert.strictEqual(normalized.weatherCode, 65);
  assert.strictEqual(normalized.weatherDescription, 'Rain showers');
  assert.strictEqual(normalized.source, 'Open-Meteo');
  assert.strictEqual(normalized.isSimulated, false);
  assert.strictEqual(normalized.availabilityState, 'live');
});

test('2. Rainfall categorization adheres to meteorological thresholds', () => {
  assert.strictEqual(categorizeRainfall(0.2), 'none');
  assert.strictEqual(categorizeRainfall(4.5), 'light');
  assert.strictEqual(categorizeRainfall(18.0), 'moderate');
  assert.strictEqual(categorizeRainfall(42.0), 'heavy');
  assert.strictEqual(categorizeRainfall(75.0), 'torrential');

  assert.strictEqual(getWeatherDescription(0), 'Clear sky');
  assert.strictEqual(getWeatherDescription(65), 'Rain showers');
  assert.strictEqual(getWeatherDescription(95), 'Thunderstorm & cloudburst');
});

test('3. Weather Caching: cached entry prevents repeated external API hits', async () => {
  const service = new BackendWeatherService(60000);
  let networkFetchCount = 0;

  const mockFetch: typeof fetch = async () => {
    networkFetchCount++;
    return {
      ok: true,
      json: async () => ({
        current: { temperature_2m: 25, precipitation: 5.0, weather_code: 61, wind_speed_10m: 10 },
      }),
    } as any;
  };

  const first = await service.fetchLocationWeather('Guwahati', mockFetch);
  assert.strictEqual(networkFetchCount, 1);
  assert.strictEqual(first.precipitationMm, 5.0);

  // Second fetch within TTL must hit cache
  const second = await service.fetchLocationWeather('Guwahati', mockFetch);
  assert.strictEqual(networkFetchCount, 1);
  assert.strictEqual(second.precipitationMm, 5.0);
});

test('4. Graceful Fallback: network timeout or error triggers deterministic regional baseline', async () => {
  const service = new BackendWeatherService();

  const failingFetch: typeof fetch = async () => {
    throw new Error('Connection timeout to api.open-meteo.com');
  };

  const fallbackData = await service.fetchLocationWeather('Dimapur', failingFetch);
  assert.strictEqual(fallbackData.locationName, 'Dimapur');
  assert.strictEqual(fallbackData.source, 'Fallback / Demo');
  assert.strictEqual(fallbackData.isSimulated, true);
  assert.strictEqual(fallbackData.availabilityState, 'fallback');
  assert.strictEqual(typeof fallbackData.precipitationMm, 'number');
  assert.strictEqual(fallbackData.precipitationMm, 18.2); // Dimapur default
});

test('5. Downstream Intelligence: live rainfall directly scales route risk score and explainability', () => {
  // Scenario A: Dry / light precipitation
  const dryWeather: EnvironmentalSnapshot = {
    locationName: 'Kohima',
    lat: 25.6751,
    lng: 94.1086,
    temperatureC: 22,
    precipitationMm: 1.0,
    rainfallCategory: 'light',
    windSpeedKmh: 10,
    weatherCode: 1,
    weatherDescription: 'Clear',
    forecast24hMm: 2.0,
    updatedAt: new Date().toISOString(),
    observedAt: new Date().toISOString(),
    source: 'Open-Meteo',
    freshness: 'Live',
    availabilityState: 'live',
    isSimulated: false,
    precipitationIntensity: 'light',
  };

  const riskLow = calculateExplainableRisk({
    weather: dryWeather,
    slopeDegrees: 15,
    historicalDisruptionsCount: 2,
    activeHazards: [],
  });

  // Scenario B: Severe monsoonal downpour from Open-Meteo (30 mm/h)
  const wetWeather: EnvironmentalSnapshot = {
    ...dryWeather,
    precipitationMm: 30.0,
    rainfallCategory: 'heavy',
    precipitationIntensity: 'heavy',
    weatherCode: 82,
    weatherDescription: 'Heavy monsoonal rain',
  };

  const riskHigh = calculateExplainableRisk({
    weather: wetWeather,
    slopeDegrees: 15,
    historicalDisruptionsCount: 2,
    activeHazards: [],
  });

  // Precipitation must directly drive the rainfall factor score higher
  assert.ok(
    riskHigh.factors.rainfall.score > riskLow.factors.rainfall.score,
    `Wet rainfall score (${riskHigh.factors.rainfall.score}) should exceed dry score (${riskLow.factors.rainfall.score})`
  );
  assert.strictEqual(riskLow.factors.rainfall.score, 4);
  assert.strictEqual(riskHigh.factors.rainfall.score, 24);
  assert.ok(riskHigh.totalScore > riskLow.totalScore);
});

test('6. Trip Candidate Generator responds to real weather data along corridor', () => {
  const constraints: OperationalConstraints = {
    requireColdChain: false,
    avoidHighRiskCorridors: false,
    maxDelayTolerance: 'moderate',
    riskTolerance: 'balanced',
    avoidUnpavedSections: false,
  };

  const tripRequest: TripRequest = {
    origin: LOCATIONS.guwahati,
    destination: LOCATIONS.imphal,
    vehicleId: 'TRK-01',
    vehicleType: 'Medium Commercial Reefer',
    driverName: 'Arjun Baruah',
    cargoCategory: 'Essential Medicines & Vaccines',
    cargoSensitivity: 'high',
    priority: 'standard',
    departureWindow: 'Immediate',
    constraints,
  };

  // Weather with torrential downpour over Mao Pass / NH-2 corridor
  const testWeatherMap: Record<string, EnvironmentalSnapshot> = {
    Guwahati: {
      locationName: 'Guwahati',
      lat: 26.1445,
      lng: 91.7362,
      temperatureC: 26,
      precipitationMm: 12.0,
      rainfallCategory: 'moderate',
      precipitationIntensity: 'moderate',
      windSpeedKmh: 14,
      weatherCode: 61,
      weatherDescription: 'Moderate rain',
      forecast24hMm: 24,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
    'Mao Pass': {
      locationName: 'Mao Pass',
      lat: 25.32,
      lng: 93.55,
      temperatureC: 18,
      precipitationMm: 48.0, // Torrential
      rainfallCategory: 'torrential',
      precipitationIntensity: 'torrential',
      windSpeedKmh: 35,
      weatherCode: 95,
      weatherDescription: 'Torrential downpour',
      forecast24hMm: 120,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
    Kohima: {
      locationName: 'Kohima',
      lat: 25.6751,
      lng: 94.1086,
      temperatureC: 20,
      precipitationMm: 42.0,
      rainfallCategory: 'heavy',
      precipitationIntensity: 'heavy',
      windSpeedKmh: 28,
      weatherCode: 82,
      weatherDescription: 'Heavy rain',
      forecast24hMm: 90,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
    Imphal: {
      locationName: 'Imphal',
      lat: 24.817,
      lng: 93.9368,
      temperatureC: 24,
      precipitationMm: 15.0,
      rainfallCategory: 'moderate',
      precipitationIntensity: 'moderate',
      windSpeedKmh: 16,
      weatherCode: 61,
      weatherDescription: 'Rain',
      forecast24hMm: 30,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
  };

  const candidates = calculateTripCandidates(tripRequest, {
    disruptions: [],
    roadSegments: [],
    activeIncidents: [],
    weatherData: testWeatherMap,
  }) as any[];

  assert.ok(candidates.length > 0, 'Should generate route candidates');
  const nh2Candidate = candidates.find((c) => c.id === 'corridor-beta-direct');
  assert.ok(nh2Candidate, 'NH-2 candidate should be present');

  // Weather risk component on NH-2 must reflect the heavy rainfall along the corridor
  assert.ok(
    nh2Candidate.featureBreakdown.rainfallMmPerHour >= 40,
    `Sampled rainfall should reflect corridor weather (${nh2Candidate.featureBreakdown.rainfallMmPerHour} mm/h)`
  );
  assert.ok(
    nh2Candidate.featureBreakdown.riskComponents.weather >= 25,
    `Weather risk component (${nh2Candidate.featureBreakdown.riskComponents.weather}) should reflect high precipitation`
  );
});

test('7. Downstream Corridor Integration: Route C accurately uses live regional weather for Halflong, Silchar, Shillong, Imphal', () => {
  const constraints: OperationalConstraints = {
    requireColdChain: true,
    avoidHighRiskCorridors: false,
    maxDelayTolerance: 'moderate',
    riskTolerance: 'balanced',
    avoidUnpavedSections: false,
  };

  const tripRequest: TripRequest = {
    origin: LOCATIONS.guwahati,
    destination: LOCATIONS.imphal,
    vehicleId: 'AS-01-J-4422',
    vehicleType: 'Refrigerated Truck',
    driverName: 'Arjun Baruah',
    cargoCategory: 'Essential Pharmaceuticals & Vaccines',
    cargoSensitivity: 'critical',
    priority: 'standard',
    departureWindow: 'Immediate',
    constraints,
  };

  // Scenario 1: Dry/mild weather along Route C (southern_bypass)
  // Even though Shillong default is 28.6 and Silchar default is 41.5, live data has low precipitation
  const liveMildRegionalWeather: Record<string, EnvironmentalSnapshot> = {
    Halflong: {
      locationName: 'Halflong',
      lat: 25.18,
      lng: 93.02,
      temperatureC: 24,
      precipitationMm: 1.2,
      rainfallCategory: 'light',
      precipitationIntensity: 'light',
      windSpeedKmh: 12,
      weatherCode: 61,
      weatherDescription: 'Light rain',
      forecast24hMm: 5,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
    Silchar: {
      locationName: 'Silchar',
      lat: 24.8268,
      lng: 92.7981,
      temperatureC: 28,
      precipitationMm: 2.0,
      rainfallCategory: 'light',
      precipitationIntensity: 'light',
      windSpeedKmh: 10,
      weatherCode: 61,
      weatherDescription: 'Light rain',
      forecast24hMm: 8,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
    Shillong: {
      locationName: 'Shillong',
      lat: 25.5788,
      lng: 91.8933,
      temperatureC: 19,
      precipitationMm: 0.8, // Overrides defaultRain: 28.6!
      rainfallCategory: 'light',
      precipitationIntensity: 'light',
      windSpeedKmh: 8,
      weatherCode: 1,
      weatherDescription: 'Clear',
      forecast24hMm: 2,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
    Imphal: {
      locationName: 'Imphal',
      lat: 24.817,
      lng: 93.9368,
      temperatureC: 23,
      precipitationMm: 0.5,
      rainfallCategory: 'none',
      precipitationIntensity: 'none',
      windSpeedKmh: 6,
      weatherCode: 0,
      weatherDescription: 'Clear',
      forecast24hMm: 1,
      updatedAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      source: 'Open-Meteo',
      freshness: 'Live',
      availabilityState: 'live',
      isSimulated: false,
    },
  };

  const candidatesMild = calculateTripCandidates(tripRequest, {
    disruptions: [],
    roadSegments: [],
    activeIncidents: [],
    weatherData: liveMildRegionalWeather,
  }) as any[];

  const routeCMild = candidatesMild.find((c) => c.label.includes('Route C') || c.corridorKey === 'southern_bypass');
  assert.ok(routeCMild, 'Route C should be present');

  // Verify that live max precipitation (2.0 mm/h from Silchar) is used, NOT the 28.6 or 41.5 baseline
  assert.strictEqual(
    routeCMild.featureBreakdown.rainfallMmPerHour,
    2.0,
    `Route C rainfall should be 2.0 mm/h from live feed, got ${routeCMild.featureBreakdown.rainfallMmPerHour}`
  );
  assert.strictEqual(
    routeCMild.featureBreakdown.riskComponents.weather,
    1,
    `Weather risk score should be 1 for 2.0 mm/h, got ${routeCMild.featureBreakdown.riskComponents.weather}`
  );

  // Scenario 2: Severe monsoon storm over Halflong & Shillong (e.g. 46.0 mm/h)
  const liveStormRegionalWeather: Record<string, EnvironmentalSnapshot> = {
    ...liveMildRegionalWeather,
    Halflong: {
      ...liveMildRegionalWeather.Halflong,
      precipitationMm: 46.0,
      rainfallCategory: 'heavy',
      precipitationIntensity: 'heavy',
    },
  };

  const candidatesStorm = calculateTripCandidates(tripRequest, {
    disruptions: [],
    roadSegments: [],
    activeIncidents: [],
    weatherData: liveStormRegionalWeather,
  }) as any[];

  const routeCStorm = candidatesStorm.find((c) => c.label.includes('Route C') || c.corridorKey === 'southern_bypass');
  assert.ok(routeCStorm, 'Route C storm candidate should be present');

  // Verify that rainfall score increases from 1 to 32
  assert.strictEqual(routeCStorm.featureBreakdown.rainfallMmPerHour, 46.0);
  assert.ok(
    routeCStorm.featureBreakdown.riskComponents.weather > routeCMild.featureBreakdown.riskComponents.weather,
    'Storm rainfall risk score must exceed mild rainfall risk score'
  );
  assert.strictEqual(routeCStorm.featureBreakdown.riskComponents.weather, 32);
});

test('8. Regression Prevention: Regional weather fallback preserves deterministic baseline when backend is unreachable', async () => {
  const service = new BackendWeatherService();
  const failingFetch: typeof fetch = async () => {
    throw new Error('Network error connecting to Open-Meteo');
  };

  const regional = await service.fetchRegionalWeather(failingFetch);
  assert.ok(regional['Shillong'], 'Shillong node should exist in fallback');
  assert.strictEqual(regional['Shillong'].source, 'Fallback / Demo');
  assert.strictEqual(regional['Shillong'].isSimulated, true);
  assert.strictEqual(regional['Shillong'].availabilityState, 'fallback');
  assert.strictEqual(regional['Shillong'].precipitationMm, 28.6);
  assert.strictEqual(regional['Silchar'].precipitationMm, 41.5);
});

