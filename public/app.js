import { calculate, KG_PER_LB, ML_PER_US_OZ } from './calculator.js';

const $ = (id) => document.getElementById(id);
const form = $('calculator-form');
const numbers = ['weight', 'volume', 'abv', 'portion', 'hours'];
const shotNumbers = ['shot-volume', 'shot-count'];
const format = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
let weightUnit = $('weight-unit').value;
let volumeUnit = $('volume-unit').value;
let shotUnit = $('shot-unit').value;
const volumeFactors = { ml: 1, l: 1000, oz: ML_PER_US_OZ };

function input() {
  const result = { weightUnit: $('weight-unit').value, volumeUnit: $('volume-unit').value, consumptionMode: form.elements['consumption-mode'].value };
  for (const key of numbers) result[key] = $(key).value.trim() === '' ? NaN : Number($(key).value);
  if (result.consumptionMode === 'shots') {
    result.shotVolume = $('shot-volume').value.trim() === '' ? NaN : Number($('shot-volume').value);
    result.shotCount = $('shot-count').value.trim() === '' ? NaN : Number($('shot-count').value);
    result.shotUnit = $('shot-unit').value;
  }
  return result;
}

function setConsumptionMode(mode) {
  form.elements['consumption-mode'].value = mode;
  $('portion-inputs').hidden = mode !== 'portion';
  $('shot-inputs').hidden = mode !== 'shots';
  $('portion-inputs').querySelectorAll('input, button').forEach((element) => { element.disabled = mode !== 'portion'; });
  $('shot-inputs').querySelectorAll('input, select').forEach((element) => { element.disabled = mode !== 'shots'; });
}

function render() {
  try {
    const values = input();
    const result = calculate(values);
    $('form-error').hidden = true;
    $('result-content').classList.remove('invalid');
    document.querySelector('.result').dataset.level = result.level;
    $('drunk-label').textContent = result.label;
    $('effect-description').textContent = result.description;
    $('bac-value').textContent = `${result.bacLow.toFixed(3)}–${result.bacHigh.toFixed(3)}%`;
    $('drink-count').textContent = format(result.standardDrinks);
    $('alcohol-grams').textContent = format(result.alcoholGrams);
    const amount = `${format(result.consumedMl)} mL (${format(result.consumedMl / ML_PER_US_OZ)} US fl oz)`;
    $('pour-note').textContent = values.consumptionMode === 'shots'
      ? `${values.shotCount} ${values.shotCount === 1 ? 'shot' : 'shots'} = ${amount} · ${format(result.portionPercent)}% of your bottle.`
      : `That’s ${amount} of your bottle.`;
    $('scale-marker').style.left = `${Math.min(100, result.bacHigh / 0.24 * 100)}%`;
    if (values.consumptionMode === 'portion') {
      $('portion-slider').value = values.portion;
      $('portion-slider').setAttribute('aria-valuetext', `${values.portion}% of the bottle`);
      $('portion-slider').style.setProperty('--portion', `${values.portion}%`);
      document.querySelectorAll('[data-portion]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.portion) === values.portion)));
    }
    return result;
  } catch (error) {
    $('form-error').textContent = error.message;
    $('form-error').hidden = false;
    $('result-content').classList.add('invalid');
    $('drunk-label').textContent = 'Check your inputs';
    $('effect-description').textContent = 'Complete the fields with valid numbers to see your estimate.';
    for (const id of ['bac-value', 'drink-count', 'alcohol-grams']) $(id).textContent = '—';
    $('pour-note').textContent = 'Enter valid numbers to calculate your pour.';
    document.querySelector('.result').dataset.level = 'low';
    return null;
  }
}

form.addEventListener('submit', (event) => event.preventDefault());
form.addEventListener('input', (event) => {
  if (event.target.name === 'consumption-mode') setConsumptionMode(event.target.value);
  if (event.target.id === 'portion-slider') $('portion').value = event.target.value;
  // Selects are handled separately so unit changes preserve the quantity.
  if (event.target.tagName !== 'SELECT') render();
});
$('shot-unit').addEventListener('change', () => {
  const nextUnit = $('shot-unit').value;
  if ($('shot-volume').value.trim() !== '') $('shot-volume').value = Number((Number($('shot-volume').value) * volumeFactors[shotUnit] / volumeFactors[nextUnit]).toFixed(12));
  shotUnit = nextUnit;
  render();
});
$('weight-unit').addEventListener('change', () => {
  const nextUnit = $('weight-unit').value;
  if ($('weight').value.trim() !== '') {
    const kilograms = Number($('weight').value) * (weightUnit === 'lb' ? KG_PER_LB : 1);
    $('weight').value = Number((kilograms / (nextUnit === 'lb' ? KG_PER_LB : 1)).toFixed(4));
  }
  weightUnit = nextUnit;
  $('weight').max = nextUnit === 'kg' ? '500' : '1102';
  $('weight').min = nextUnit === 'kg' ? '0.453' : '1';
  render();
});
$('volume-unit').addEventListener('change', () => {
  const nextUnit = $('volume-unit').value;
  if ($('volume').value.trim() !== '') $('volume').value = Number((Number($('volume').value) * volumeFactors[volumeUnit] / volumeFactors[nextUnit]).toFixed(12));
  volumeUnit = nextUnit;
  $('volume').max = String(100000 / volumeFactors[nextUnit]);
  $('volume').min = '0.000001';
  render();
});
document.querySelectorAll('[data-portion]').forEach((button) => button.addEventListener('click', () => {
  $('portion').value = button.dataset.portion;
  render();
}));
document.querySelectorAll('[data-volume]').forEach((button) => button.addEventListener('click', () => {
  $('volume').value = Number((Number(button.dataset.volume) / volumeFactors[volumeUnit]).toFixed(12));
  $('abv').value = button.dataset.abv;
  render();
}));
setConsumptionMode('portion');
render();

// Optional browser agent integration. No network calls or persistent storage.
const context = document.modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  try {
    Promise.resolve(context.registerTool({
      name: 'set_alcohol_estimate_inputs',
      title: 'Set alcohol estimate inputs',
      description: 'Update the visible calculator using bottle percentage or a shot size and shot count, then return an educational BAC and impairment estimate. It cannot establish sobriety or driving safety.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: {
        type: 'object', additionalProperties: false,
        properties: {
          weight: { type: 'number', exclusiveMinimum: 0 }, weightUnit: { type: 'string', enum: ['kg', 'lb'] },
          volume: { type: 'number', exclusiveMinimum: 0 }, volumeUnit: { type: 'string', enum: ['ml', 'l', 'oz'] },
          abv: { type: 'number', minimum: 0, maximum: 100 }, portion: { type: 'number', minimum: 0, maximum: 100 },
          hours: { type: 'number', minimum: 0, maximum: 24 },
          consumptionMode: { type: 'string', enum: ['portion', 'shots'] },
          shotVolume: { type: 'number', exclusiveMinimum: 0 }, shotUnit: { type: 'string', enum: ['ml', 'oz'] },
          shotCount: { type: 'number', minimum: 0 },
        }, required: ['weight', 'weightUnit', 'volume', 'volumeUnit', 'abv', 'hours'],
        oneOf: [
          { properties: { consumptionMode: { const: 'portion' } }, required: ['portion'] },
          { properties: { consumptionMode: { const: 'shots' } }, required: ['consumptionMode', 'shotVolume', 'shotUnit', 'shotCount'] },
        ],
      },
      execute(values) {
        const result = calculate(values); // Validate before changing the page.
        for (const key of numbers) if (values[key] !== undefined) $(key).value = values[key];
        if (values.consumptionMode === 'shots') {
          for (const id of shotNumbers) $(id).value = id === 'shot-volume' ? values.shotVolume : values.shotCount;
          shotUnit = values.shotUnit;
          $('shot-unit').value = shotUnit;
        }
        weightUnit = values.weightUnit;
        volumeUnit = values.volumeUnit;
        $('weight-unit').value = weightUnit;
        $('volume-unit').value = volumeUnit;
        $('weight').min = weightUnit === 'kg' ? '0.453' : '1';
        $('weight').max = weightUnit === 'kg' ? '500' : '1102';
        $('volume').min = '0.000001';
        $('volume').max = String(100000 / volumeFactors[volumeUnit]);
        setConsumptionMode(values.consumptionMode ?? 'portion');
        render();
        return { ...result, limitation: 'Actual BAC can be outside the model range. Never use this result to decide whether to drive.' };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
  } catch { /* The calculator works without experimental browser support. */ }
}
