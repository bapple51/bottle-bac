export const KG_PER_LB = 0.45359237;
export const ML_PER_US_OZ = 29.5735295625;
const VOLUME_FACTORS = { ml: 1, l: 1000, oz: ML_PER_US_OZ };

/**
 * @param {number} bac Estimated BAC in percent: 0.08 means 0.08%.
 * @param {number} alcoholGrams Alcohol in the selected portion, in grams.
 * @returns {{
 *   label: string,
 *   description: string,
 *   level: 'low' | 'medium' | 'high' | 'danger'
 * }}
 *
 * These bands are descriptive UI ranges, not validated clinical stages.
 * Never use this estimate to determine fitness to drive or rule out poisoning.
 */
export function classify(bac, alcoholGrams) {
  if (!Number.isFinite(bac) || !Number.isFinite(alcoholGrams)) {
    throw new TypeError('bac and alcoholGrams must be finite numbers.');
  }

  if (bac < 0 || alcoholGrams < 0) {
    throw new RangeError('bac and alcoholGrams must be non-negative.');
  }

  if (alcoholGrams === 0) return {
    label: 'No alcohol selected',
    description: 'The selected portion contains no alcohol. This does not account for anything else you have drunk.',
    level: 'low'
  };

  // Added classification.
  if (bac >= 0.35) return {
    label: 'Critical poisoning risk',
    description: 'Potentially fatal alcohol poisoning is possible, including loss of consciousness and dangerously slow breathing. Do not drink this amount. If already consumed, call emergency services now.',
    level: 'danger'
  };

  if (bac >= 0.30) return {
    label: 'Severe poisoning risk',
    description: 'This is a potentially life-threatening estimate. Do not drink this amount. If it has already been consumed, seek urgent medical help.',
    level: 'danger'
  };

  // Added classification.
  if (bac >= 0.25) return {
    label: 'High poisoning risk',
    description: 'Severe intoxication can involve vomiting, profound confusion, or loss of consciousness. Do not drink this amount. If already consumed, seek urgent medical help.',
    level: 'danger'
  };

  if (bac >= 0.22) return {
    label: 'Extreme intoxication',
    description: 'Severe confusion, poor coordination, and memory gaps may occur. Alcohol poisoning is possible. Do not drink this amount; seek urgent medical help if it has already been consumed.',
    level: 'danger'
  };

  // Added classification.
  if (bac >= 0.20) return {
    label: 'Dangerous intoxication',
    description: 'Severe impairment and alcohol poisoning are possible. Do not drink this amount. If someone is hard to wake, has seizures, or breathes slowly or irregularly, call emergency services immediately.',
    level: 'danger'
  };

  // Added classification.
  if (bac >= 0.18) return {
    label: 'Severe impairment',
    description: 'Judgment, coordination, and memory may be profoundly impaired. Do not drink this amount; being awake or able to talk does not rule out a blackout.',
    level: 'danger'
  };

  if (bac >= 0.16) return {
    label: 'Blackout risk',
    description: 'Memory gaps become more likely, with major impairment of judgment and coordination. A blackout is not the same as passing out. Do not drink this amount.',
    level: 'danger'
  };

  // Added classification.
  if (bac >= 0.15) return {
    label: 'Major loss of balance',
    description: 'Muscle control and balance may be substantially impaired, and vomiting can occur. Do not drink this amount.',
    level: 'high'
  };

  if (bac >= 0.14) return {
    label: 'Heavily drunk',
    description: 'Thinking, speech, and muscle control may be seriously affected. Falls and injuries are a concern, even if you still feel alert.',
    level: 'high'
  };

  // Added classification.
  if (bac >= 0.12) return {
    label: 'Marked intoxication',
    description: 'Speech may be slurred, thinking slowed, and coordination substantially reduced. Falls and other injuries become more likely.',
    level: 'high'
  };

  if (bac >= 0.10) return {
    label: 'Very drunk',
    description: 'Reaction time, balance, and clear thinking may be seriously impaired. Nausea and loss of coordination become more likely.',
    level: 'high'
  };

  if (bac >= 0.09) return {
    label: 'Clearly drunk',
    description: 'Poor coordination, slower reactions, and reduced self-control may become more noticeable. Feeling confident does not mean you can judge your impairment accurately.',
    level: 'high'
  };

  if (bac >= 0.08) return {
    label: 'Drunk',
    description: 'Judgment, coordination, concentration, and memory may be impaired. You might feel less impaired than you actually are.',
    level: 'high'
  };

  // Added classification.
  if (bac >= 0.07) return {
    label: 'Marked impairment',
    description: 'Coordination, attention, and responses to unexpected events may be impaired even without feeling very drunk. Do not drive or operate machinery.',
    level: 'high'
  };

  // Added classification.
  if (bac >= 0.06) return {
    label: 'Increasing impairment',
    description: 'Reduced alertness and slower responses may make everyday tasks less reliable. Feeling confident does not mean your judgment or coordination is intact.',
    level: 'medium'
  };

  if (bac >= 0.05) return {
    label: 'Tipsy',
    description: 'You may feel more relaxed and less inhibited, while coordination and reactions are already getting worse.',
    level: 'medium'
  };

  // Added classification.
  if (bac >= 0.04) return {
    label: 'Reduced judgment',
    description: 'Attention and judgment may be affected even when changes feel mild. Feeling relaxed or normal does not establish that you are unimpaired.',
    level: 'medium'
  };

  if (bac >= 0.03) return {
    label: 'Lightly tipsy',
    description: 'You may feel relaxed or less inhibited. Attention and judgment can be affected even when the changes feel mild.',
    level: 'medium'
  };

  if (bac >= 0.02) return {
    label: 'Buzzed',
    description: 'You may notice relaxation or a change in mood. Judgment and attention can already be affected.',
    level: 'medium'
  };

  // Added classification.
  if (bac >= 0.01) return {
    label: 'Subtle effects',
    description: 'You may notice little change, but this estimate cannot rule out impairment. Do not use it to decide whether you can drive.',
    level: 'low'
  };

  return {
    label: 'Little noticeable effect',
    description: 'You may feel little or no change, but impairment is still possible. A low estimate or feeling normal does not mean you are sober.',
    level: 'low'
  };
}

function inputError(message, field) {
  return Object.assign(new Error(message), { field });
}

export function calculate(input) {
  if (!input || typeof input !== 'object') throw new Error('Enter your numbers to calculate an estimate.');
  const { weight, weightUnit, volume, volumeUnit, abv, portion, hours, consumptionMode = 'portion', shotVolume, shotUnit, shotCount } = input;
  for (const [name, value] of Object.entries({ weight, volume, abv, hours })) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw inputError(`Enter a valid number for ${name}.`, name);
  }
  if (!['lb', 'kg'].includes(weightUnit)) throw inputError('Choose lb or kg for your weight.', 'weightUnit');
  if (!Object.hasOwn(VOLUME_FACTORS, volumeUnit)) throw inputError('Choose a valid bottle volume unit.', 'volumeUnit');
  const weightKg = weight * (weightUnit === 'lb' ? KG_PER_LB : 1);
  const bottleMl = volume * VOLUME_FACTORS[volumeUnit];
  if (weightKg < 0.453 || weightKg > 500) throw inputError('Enter a positive weight up to 500 kg (about 1,102 lb).', 'weight');
  if (bottleMl <= 0 || bottleMl > 100000) throw inputError('Enter a bottle volume greater than 0 and up to 100 L.', 'volume');
  if (abv < 0 || abv > 100) throw inputError('ABV must be between 0% and 100%.', 'abv');
  if (hours < 0 || hours > 24) throw inputError('Drinking duration must be between 0 and 24 hours.', 'hours');
  let consumedMl;
  if (consumptionMode === 'portion') {
    if (typeof portion !== 'number' || !Number.isFinite(portion)) throw inputError('Enter a valid number for portion.', 'portion');
    if (portion < 0 || portion > 100) throw inputError('The amount to drink must be between 0% and 100% of the bottle.', 'portion');
    consumedMl = bottleMl * portion / 100;
  } else if (consumptionMode === 'shots') {
    if (typeof shotVolume !== 'number' || !Number.isFinite(shotVolume) || shotVolume <= 0) throw inputError('Enter a shot size greater than 0.', 'shotVolume');
    if (!['ml', 'oz'].includes(shotUnit)) throw inputError('Choose mL or US fl oz for your shot size.', 'shotUnit');
    if (typeof shotCount !== 'number' || !Number.isFinite(shotCount) || shotCount < 0) throw inputError('Enter a number of shots of 0 or more.', 'shotCount');
    const shotMl = shotVolume * VOLUME_FACTORS[shotUnit];
    if (shotMl > 100000) throw inputError('Enter a shot size no greater than 100 L.', 'shotVolume');
    consumedMl = shotMl * shotCount;
    // Unit conversion can introduce a tiny rounding difference for a full bottle.
    if (!Number.isFinite(consumedMl) || consumedMl > bottleMl + bottleMl * 1e-9) throw inputError('Those shots exceed the bottle volume. Check the shot size, shot count, or bottle volume.', 'shotCount');
    consumedMl = Math.min(consumedMl, bottleMl);
  } else {
    throw new Error('Choose bottle percentage or shots to enter the amount.');
  }
  const portionPercent = consumedMl / bottleMl * 100;
  const alcoholGrams = consumedMl * abv / 100 * 0.789;
  const adjustment = 0.015 * hours;
  const bacLow = Math.max(0, alcoholGrams / (weightKg * 1000 * 0.68) * 100 - adjustment);
  const bacHigh = Math.max(0, alcoholGrams / (weightKg * 1000 * 0.55) * 100 - adjustment);
  return { consumedMl, portionPercent, alcoholGrams, standardDrinks: alcoholGrams / 14, bacLow, bacHigh, ...classify(bacHigh, alcoholGrams) };
}
