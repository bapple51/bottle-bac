# Bottle BAC

A small, responsive alcohol impairment calculator for GitHub Pages. Enter body weight, bottle volume, ABV, the percentage of the bottle to drink, and drinking duration. The main result is a plain-language label such as **Buzzed**, **Tipsy**, **Drunk**, **Very drunk**, or **Blackout risk**, with an estimated BAC range and US standard drink count underneath.

**Live site:** https://bapple51.github.io/bottle-bac/

All calculations run in the browser. There are no dependencies, analytics, input storage, or backend requests. The site itself is hosted by GitHub; GitHub's normal hosting access logging still applies.

## Run locally

```sh
python3 -m http.server 8080 --directory public
```

Open http://localhost:8080. A local HTTP server is needed for JavaScript modules; opening the HTML directly as a file may not work.

## Verify

With Node.js 22 or newer:

```sh
npm run check
npm test
```

No dependency installation is needed. Tests cover independently computed alcohol/BAC values, unit equivalence, duration, zero-alcohol cases, classification boundaries, extreme values, and input validation.

## GitHub Pages

In the repository's **Settings → Pages**, choose **GitHub Actions** as the source. The included workflow checks syntax and runs the tests, then publishes only `public/` on pushes to `main`. Pull requests run verification without deployment. Assets use relative paths so the site works under a repository subpath.

## Calculation and limitations

```text
consumed mL = bottle mL × portion / 100
alcohol grams = consumed mL × ABV / 100 × 0.789
BAC percent = max(0, alcohol grams / (weight kg × 1000 × r) × 100 − 0.015 × hours)
US standard drinks = alcohol grams / 14
```

The range uses two conventional distribution factors (`r = 0.68` and `r = 0.55`), not a personalized estimate or statistical confidence interval. Actual BAC can be outside this range. The label uses the upper model estimate. Labels are educational shorthand rather than clinical diagnoses, and blackout or overdose can occur at lower BACs than these thresholds.

| Upper model BAC | Label |
| --- | --- |
| Below 0.02% | Little noticeable effect |
| 0.02–<0.05% | Buzzed |
| 0.05–<0.08% | Tipsy |
| 0.08–<0.10% | Drunk |
| 0.10–<0.16% | Very drunk |
| 0.16–<0.30% | Blackout risk |
| 0.30% and above | Severe poisoning risk |

Zero alcohol in the selected portion has its own label and does not imply overall sobriety. The model assumes full absorption and no pre-existing alcohol. It does not model individual sips, food, delayed absorption, age, health, medications, tolerance, or individual metabolism. It is an adult population model. BAC can rise after drinking stops. Never use this tool to decide whether to drive or when someone will be sober. Call emergency services immediately for inability to wake, slow/irregular breathing, or seizures.

Sources:

- [UK government review: Widmark model and alcohol density](https://www.gov.uk/government/consultations/updating-labelling-guidance-for-no-and-low-alcohol-alternatives/potential-health-impacts-of-changing-the-alcohol-free-descriptor-evidence-review)
- [Research paper: conventional Widmark factors and elimination rate](https://pmc.ncbi.nlm.nih.gov/articles/PMC7564564/)
- [NHTSA: BAC and impairment](https://www.nhtsa.gov/risky-driving/drunk-driving)
- [NIAAA: alcohol-induced blackouts](https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/interrupted-memories-alcohol-induced-blackouts)
- [NIAAA: alcohol overdose and US standard drink definition](https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-dangers-of-alcohol-overdose)

In experimental browsers supporting `document.modelContext`, the page also exposes a `set_alcohol_estimate_inputs` tool that validates all inputs before updating the same visible calculator. Unsupported browsers simply use the normal interface.

## License

MIT. See [LICENSE](LICENSE).
