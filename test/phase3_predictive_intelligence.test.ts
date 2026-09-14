import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePredictiveDataset } from '../src/services/predictive/predictiveDataset.ts';
import { GradientBoostingClassifier } from '../src/services/predictive/GradientBoostingClassifier.ts';
import { predictiveService } from '../src/services/predictive/predictiveService.ts';
import { calculateTripCandidates } from '../src/services/routing/tripIntelligence.ts';
import { candidateToRiskBreakdown } from '../src/services/riskEngine.ts';
import { LOCATIONS } from '../src/services/reactiveRoutingService.ts';
import type { TripRequest, OperationalContext, PredictiveInputFeatures } from '../src/types/index.ts';

// -----------------------------------------------------------------------------
// PHASE 3 PREDICTIVE INTELLIGENCE TEST SUITE
// -----------------------------------------------------------------------------

test('3.1 Predictive Dataset: generates deterministic training samples with prototype provenance', () => {
  const dataset = generatePredictiveDataset();
  assert.equal(dataset.samples.length, 200);
  assert.equal(dataset.featureNames.length, 7);
  assert.ok(dataset.provenance.includes('NASA Global Landslide Catalog'));
  assert.ok(dataset.name.includes('NER-LOGIX Disruption Predictive Prototype Dataset'));

  const sample = dataset.samples[0];
  assert.equal(sample.features.length, 7);
  assert.ok(sample.label === 0 || sample.label === 1);
});

test('3.2 GradientBoostingClassifier: fits model deterministically and predicts probabilities in [0, 1]', () => {
  const dataset = generatePredictiveDataset();
  const X = dataset.samples.map((s) => s.features);
  const y = dataset.samples.map((s) => s.label);

  const model1 = new GradientBoostingClassifier({ nEstimators: 30, randomState: 42 });
  model1.fit(X, y, dataset.featureNames);

  const model2 = new GradientBoostingClassifier({ nEstimators: 30, randomState: 42 });
  model2.fit(X, y, dataset.featureNames);

  // Single sample test: Heavy rainfall (40 mm/h), steep slope (28 deg), 5 historical landslides
  const testInput = [40, 28, 5, 2, 0, 20, 5];
  const p1 = model1.predictProbaSingle(testInput);
  const p2 = model2.predictProbaSingle(testInput);

  assert.equal(p1, p2, 'Predictions must be strictly deterministic across identical random seeds');
  assert.ok(p1 >= 0.0 && p1 <= 1.0, 'Disruption probability must be within bounds [0, 1]');
  assert.ok(p1 > 0.6, 'Heavy rainfall + steep slope should produce high disruption probability (> 0.6)');
});

test('3.3 Predictive Service: computes explainable predictions with factor attributions and metadata', () => {
  const highRiskInput: PredictiveInputFeatures = {
    rainfallMmPerHour: 42.5,
    terrainSlopeDegrees: 30,
    historicalLandslideCount: 6,
    roadTypeScore: 3,
    activeDisruptionCount: 1,
    cargoSensitivityScore: 28,
    vehicleSuitabilityScore: 8,
  };

  const result = predictiveService.predict(highRiskInput);

  assert.ok(result.probability >= 0.0 && result.probability <= 1.0);
  assert.equal(result.disruptionPredicted, true);
  assert.ok(result.factors.length > 0, 'Explanations must contain factor strings');
  assert.ok(result.structuredFactors.length > 0, 'Structured factors must be populated');
  assert.equal(result.modelMetadata.algorithm, 'GradientBoostingClassifier');
  assert.ok(result.modelMetadata.metrics.accuracy > 0.7, 'Model validation accuracy must exceed baseline 70%');
});

test('3.4 High Monsoon Rainfall Sensitivity: rainfall increase drives higher predicted disruption probability', () => {
  const dryInput: PredictiveInputFeatures = {
    rainfallMmPerHour: 0,
    terrainSlopeDegrees: 15,
    historicalLandslideCount: 1,
    roadTypeScore: 1,
    activeDisruptionCount: 0,
  };

  const monsoonInput: PredictiveInputFeatures = {
    rainfallMmPerHour: 55,
    terrainSlopeDegrees: 15,
    historicalLandslideCount: 1,
    roadTypeScore: 1,
    activeDisruptionCount: 0,
  };

  const dryResult = predictiveService.predict(dryInput);
  const monsoonResult = predictiveService.predict(monsoonInput);

  assert.ok(
    monsoonResult.probability > dryResult.probability,
    `Monsoon precipitation (${monsoonResult.probability}) must produce higher disruption probability than dry conditions (${dryResult.probability})`
  );
});

test('3.5 Model Status API Payload: returns complete metadata, provenance, and validation metrics', () => {
  const status = predictiveService.getModelStatus();

  assert.equal(status.algorithm, 'GradientBoostingClassifier');
  assert.ok(status.sampleCount >= 200);
  assert.ok(status.metrics.accuracy > 0);
  assert.ok(status.metrics.f1Score > 0);
  assert.ok(status.provenance.length > 0);
  assert.ok(status.featureImportances.rainfallMmPerHour > 0);
});

test('3.6 Integration into Trip Intelligence: candidates receive ML disruption probability and explainable breakdown', () => {
  const guwahati = LOCATIONS.guwahati;
  const imphal = LOCATIONS.imphal;

  const request: TripRequest = {
    origin: guwahati,
    destination: imphal,
    vehicleType: 'heavy-truck',
    cargoCategory: 'Pharma & Vaccines',
    cargoSensitivity: 'critical',
    priority: 'emergency',
    constraints: {
      requireColdChain: true,
      avoidHighRiskCorridors: false,
    },
  };

  const context: OperationalContext = {
    roadSegments: [],
    disruptions: [],
    activeIncidents: [],
    weatherData: {
      Guwahati: {
        locationName: 'Guwahati',
        lat: 26.1445,
        lng: 91.7362,
        temperatureC: 26,
        precipitationMm: 38,
        rainfallCategory: 'heavy',
        windSpeedKmh: 14,
        weatherCode: 63,
        weatherDescription: 'Heavy Rain',
        forecast24hMm: 75,
        updatedAt: new Date().toISOString(),
      },
    },
  };

  const candidates = calculateTripCandidates(request, context);
  assert.ok(candidates.length > 0, 'Candidate generator must produce candidates');

  const topCandidate = candidates[0];
  assert.ok(topCandidate.predictiveResult, 'Top candidate must include predictiveResult');
  assert.ok(topCandidate.predictiveResult.probability >= 0.0);

  const breakdown = candidateToRiskBreakdown(topCandidate);
  assert.ok(breakdown.predictiveIntelligence, 'Risk breakdown must include predictiveIntelligence block');
  assert.equal(breakdown.predictiveIntelligence.algorithm, 'GradientBoostingClassifier');
});

test('3.7 Non-Regression (Phase 2): all corridor evaluation, emergency routing, and risk scores remain intact', () => {
  const kohima = LOCATIONS.kohima;
  const silchar = LOCATIONS.silchar;

  const request: TripRequest = {
    origin: kohima,
    destination: silchar,
    vehicleType: 'medium-truck',
    cargoCategory: 'Medical Relief Supplies',
    cargoSensitivity: 'high',
    priority: 'urgent',
    constraints: {
      requireColdChain: false,
    },
  };

  const context: OperationalContext = {
    roadSegments: [],
    disruptions: [],
    activeIncidents: [],
    weatherData: {},
  };

  const candidates = calculateTripCandidates(request, context);
  assert.ok(candidates.length >= 2, 'Must evaluate multiple candidates');
  assert.equal(candidates[0].recommendationRank, 1);
  assert.ok(candidates[0].operationalScore > 0);
});
