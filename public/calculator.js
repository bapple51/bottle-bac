export const KG_PER_LB = 0.45359237;
export const ML_PER_US_OZ = 29.5735295625;
const VOLUME_FACTORS = { ml: 1, l: 1000, oz: ML_PER_US_OZ };

export function classify(bac, alcoholGrams) {
  if (alcoholGrams === 0) return { label: 'No alcohol selected', description: 'The selected portion contains no alcohol. This does not account for anything else you have drunk.', level: 'low' };
  if (bac >= 0.30) return { label: 'Severe poisoning risk', description: 'This is a potentially life-threatening estimate. Do not drink this amount. If it has already been consumed, seek urgent medical help.', level: 'danger' };
  if (bac >= 0.16) return { label: 'Blackout risk', description: 'Memory gaps become more likely, with major impairment of judgment and coordination. A blackout is not the same as passing out. Do not drink this amount.', level: 'danger' };
  if (bac >= 0.10) return { label: 'Very drunk', description: 'Reaction time, balance, and clear thinking may be seriously impaired. Nausea and loss of coordination become more likely.', level: 'high' };
  if (bac >= 0.08) return { label: 'Drunk', description: 'Judgment, coordination, concentration, and memory may be impaired. You might feel less impaired than you actually are.', level: 'high' };
  if (bac >= 0.05) return { label: 'Tipsy', description: 'You may feel more relaxed and less inhibited, while coordination and reactions are already getting worse.', level: 'medium' };
  if (bac >= 0.02) return { label: 'Buzzed', description: 'You may notice relaxation or a change in mood. Judgment and attention can already be affected.', level: 'medium' };
  return { label: 'Little noticeable effect', description: 'You may feel little or no change, but impairment is still possible. A low estimate or feeling normal does not mean you are sober.', level: 'low' };
}

export function calculate(input) {
  if (!input || typeof input !== 'object') throw new Error('Enter your numbers to calculate an estimate.');
  const { weight, weightUnit, volume, volumeUnit, abv, portion, hours } = input;
  for (const [name, value] of Object.entries({ weight, volume, abv, portion, hours })) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Enter a valid number for ${name}.`);
  }
  if (!['lb', 'kg'].includes(weightUnit)) throw new Error('Choose lb or kg for your weight.');
  if (!Object.hasOwn(VOLUME_FACTORS, volumeUnit)) throw new Error('Choose a valid bottle volume unit.');
  const weightKg = weight * (weightUnit === 'lb' ? KG_PER_LB : 1);
  const bottleMl = volume * VOLUME_FACTORS[volumeUnit];
  if (weightKg < 0.453 || weightKg > 500) throw new Error('Enter a positive weight up to 500 kg (about 1,102 lb).');
  if (bottleMl <= 0 || bottleMl > 100000) throw new Error('Enter a bottle volume greater than 0 and up to 100 L.');
  if (abv < 0 || abv > 100) throw new Error('ABV must be between 0% and 100%.');
  if (portion < 0 || portion > 100) throw new Error('The amount to drink must be between 0% and 100% of the bottle.');
  if (hours < 0 || hours > 24) throw new Error('Drinking duration must be between 0 and 24 hours.');
  const consumedMl = bottleMl * portion / 100;
  const alcoholGrams = consumedMl * abv / 100 * 0.789;
  const adjustment = 0.015 * hours;
  const bacLow = Math.max(0, alcoholGrams / (weightKg * 1000 * 0.68) * 100 - adjustment);
  const bacHigh = Math.max(0, alcoholGrams / (weightKg * 1000 * 0.55) * 100 - adjustment);
  return { consumedMl, alcoholGrams, standardDrinks: alcoholGrams / 14, bacLow, bacHigh, ...classify(bacHigh, alcoholGrams) };
}
