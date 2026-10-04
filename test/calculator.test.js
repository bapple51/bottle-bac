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
  assert.equal(result.label, 'Tipsy');
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
test('impairment transitions include buzzed, blackout risk and severe risk at boundaries', () => {
  const cases = [[0.0199, 'Little noticeable effect'], [0.02, 'Buzzed'], [0.05, 'Tipsy'], [0.08, 'Drunk'], [0.10, 'Very drunk'], [0.1599, 'Very drunk'], [0.16, 'Blackout risk'], [0.2999, 'Blackout risk'], [0.30, 'Severe poisoning risk']];
  for (const [bac, label] of cases) assert.equal(classify(bac, 14).label, label);
});
test('dangerous spirit consumption triggers a warning without capping the result', () => {
  const result = calculate({ ...sample, abv: 40, portion: 100, hours: 0 });
  assert.equal(result.label, 'Severe poisoning risk');
  assert.ok(result.bacHigh > 0.5);
});
test('malformed and out-of-range inputs are rejected instead of producing stale or NaN results', () => {
  for (const key of ['weight', 'volume', 'abv', 'portion', 'hours']) {
    for (const value of [NaN, Infinity, '', null, '10']) assert.throws(() => calculate({ ...sample, [key]: value }));
  }
  for (const patch of [{ weight: 0 }, { weight: -1 }, { weight: 501 }, { volume: 0 }, { volume: -1 }, { volume: 100001 }, { abv: -1 }, { abv: 101 }, { portion: -1 }, { portion: 101 }, { hours: -1 }, { hours: 25 }, { weightUnit: 'stone' }, { volumeUnit: 'constructor' }]) assert.throws(() => calculate({ ...sample, ...patch }));
});
