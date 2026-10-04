import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, classify, KG_PER_LB, ML_PER_US_OZ } from '../public/calculator.js';

const sample = { weight: 75, weightUnit: 'kg', volume: 750, volumeUnit: 'ml', abv: 12, portion: 50, hours: 1 };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} ≠ ${b}`);

test('half a wine bottle has the expected alcohol mass and independently calculated BAC', () => {
  const result = calculate(sample);
  close(result.consumedMl, 375);
  close(result.alcoholGrams, 35.505);
  close(result.standardDrinks, 2.5360714285714286);
  close(result.bacLow, 0.054617647058823536);
  close(result.bacHigh, 0.07107272727272727);
  assert.equal(result.label, 'Marked impairment');
});
test('equivalent metric, imperial and liter inputs produce the same BAC', () => {
  const metric = calculate(sample);
  const imperial = calculate({ ...sample, weight: 75 / KG_PER_LB, weightUnit: 'lb', volume: 750 / ML_PER_US_OZ, volumeUnit: 'oz' });
  const liters = calculate({ ...sample, volume: 0.75, volumeUnit: 'l' });
  close(metric.bacLow, imperial.bacLow);
  close(metric.bacHigh, imperial.bacHigh);
  close(metric.alcoholGrams, liters.alcoholGrams);
});
test('zero consumption and alcohol-free drinks do not imply sobriety', () => {
  for (const input of [{ ...sample, portion: 0 }, { ...sample, abv: 0 }]) {
    const result = calculate(input);
    assert.equal(result.bacHigh, 0);
    assert.equal(result.label, 'No alcohol selected');
    assert.match(result.description, /anything else/);
  }
});
test('elapsed time floors BAC at zero without calling the user sober', () => {
  const result = calculate({ ...sample, hours: 24 });
  assert.equal(result.bacLow, 0);
  assert.equal(result.bacHigh, 0);
  assert.equal(result.label, 'Little noticeable effect');
  assert.match(result.description, /does not mean you are sober/);
});
test('time correction is applied in percentage points, and larger portions increase BAC', () => {
  const immediate = calculate({ ...sample, hours: 0 });
  const afterHour = calculate(sample);
  close(immediate.bacHigh - afterHour.bacHigh, 0.015);
  assert.ok(calculate({ ...sample, portion: 100 }).bacHigh > afterHour.bacHigh);
});
test('every classification boundary selects the correct label at, below and above the threshold', () => {
  const cases = [
    [0, 'Little noticeable effect', 'low'],
    [0.01, 'Subtle effects', 'low'],
    [0.02, 'Buzzed', 'medium'],
    [0.03, 'Lightly tipsy', 'medium'],
    [0.04, 'Reduced judgment', 'medium'],
    [0.05, 'Tipsy', 'medium'],
    [0.06, 'Increasing impairment', 'medium'],
    [0.07, 'Marked impairment', 'high'],
    [0.08, 'Drunk', 'high'],
    [0.09, 'Clearly drunk', 'high'],
    [0.10, 'Very drunk', 'high'],
    [0.12, 'Marked intoxication', 'high'],
    [0.14, 'Heavily drunk', 'high'],
    [0.15, 'Major loss of balance', 'high'],
    [0.16, 'Blackout risk', 'danger'],
    [0.18, 'Severe impairment', 'danger'],
    [0.20, 'Dangerous intoxication', 'danger'],
    [0.22, 'Extreme intoxication', 'danger'],
    [0.25, 'High poisoning risk', 'danger'],
    [0.30, 'Severe poisoning risk', 'danger'],
    [0.35, 'Critical poisoning risk', 'danger'],
  ];
  for (const [index, [bac, label, level]] of cases.entries()) {
    for (const value of [bac, bac + 0.000001]) {
      const result = classify(value, 14);
      assert.equal(result.label, label, `Label at ${value}%`);
      assert.equal(result.level, level, `Severity at ${value}%`);
      assert.ok(result.description.length > 0);
    }
    if (index > 0) assert.equal(classify(bac - 0.000001, 14).label, cases[index - 1][1], `Label below ${bac}%`);
  }
});
test('dangerous spirit consumption triggers a warning without capping the result', () => {
  const result = calculate({ ...sample, abv: 40, portion: 100, hours: 0 });
  assert.equal(result.label, 'Critical poisoning risk');
  assert.equal(result.level, 'danger');
  assert.match(result.description, /emergency services/);
  assert.ok(result.bacHigh > 0.5);
});
test('direct classification rejects invalid values and zero alcohol overrides every BAC band', () => {
  for (const value of [NaN, Infinity, -1, '0.08', undefined, null]) {
    assert.throws(() => classify(value, 14));
    assert.throws(() => classify(0.08, value));
  }
  for (const bac of [0, 0.02, 0.16, 0.35, 1]) assert.equal(classify(bac, 0).label, 'No alcohol selected');
});
test('malformed and out-of-range inputs are rejected instead of producing stale or NaN results', () => {
  for (const key of ['weight', 'volume', 'abv', 'portion', 'hours']) {
    for (const value of [NaN, Infinity, '', null, '10']) assert.throws(() => calculate({ ...sample, [key]: value }));
  }
  for (const patch of [{ weight: 0 }, { weight: -1 }, { weight: 501 }, { volume: 0 }, { volume: -1 }, { volume: 100001 }, { abv: -1 }, { abv: 101 }, { portion: -1 }, { portion: 101 }, { hours: -1 }, { hours: 25 }, { weightUnit: 'stone' }, { volumeUnit: 'constructor' }]) assert.throws(() => calculate({ ...sample, ...patch }));
});
