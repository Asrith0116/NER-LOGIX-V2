import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDeterministicFallback } from '../server/geminiPlugin.ts';

test('Deterministic NLP Fallback: classifies major landslide on NH-2', () => {
  const result = generateDeterministicFallback({
    typed_description: 'Massive landslide blocking NH-2 near Mao Gate completely',
    location_name: 'Mao Gate',
    vehicle_id: 'MN-04-B-1121',
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.provider, 'Local NLP · Deterministic Fallback');
  assert.strictEqual(result.model, 'local-deterministic-nlp');
  assert.strictEqual(result.data.hazard_category, 'landslide');
  assert.strictEqual(result.data.estimated_severity, 'critical');
  assert.strictEqual(result.data.road_impact, 'fully_blocked');
  assert.ok(result.data.extracted_entities.includes('NH-2') || result.data.extracted_entities.includes('Mao Gate'));
});

test('Deterministic NLP Fallback: classifies bridge damage and severe washout', () => {
  const result = generateDeterministicFallback({
    typed_description: 'Doyyang River bridge cracked pier, road washed out by river overflow',
    location_name: 'Doyyang Bridge',
  });

  assert.strictEqual(result.ok, true);
  assert.ok(
    result.data.hazard_category === 'road_washout' || result.data.hazard_category === 'bridge_damage'
  );
  assert.strictEqual(result.data.estimated_severity, 'critical');
});

test('Deterministic NLP Fallback: negation handling prevents false positive alerts', () => {
  const result = generateDeterministicFallback({
    typed_description: 'Road is completely clear, no landslide and zero blockage observed on highway',
    location_name: 'Kohima Bypass',
  });

  assert.strictEqual(result.ok, true);
  assert.notStrictEqual(result.data.hazard_category, 'landslide', 'Negated hazard must not trigger false positive landslide');
});

test('Deterministic NLP Fallback: handles voice transcript fallback when typed text is empty', () => {
  const result = generateDeterministicFallback({
    voice_transcript: 'Heavy rockfall boulders fallen on NH-39 single lane passable',
    location_name: 'NH-39 Maram Section',
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.data.hazard_category, 'rockfall');
  assert.strictEqual(result.data.estimated_severity, 'moderate');
  assert.strictEqual(result.data.road_impact, 'single_lane');
});
