import { describe, expect, it } from 'vitest';
import { INFO_SECTIONS, infoSectionKeys } from './infoSections';
import { LOCALES, MESSAGES } from './i18n/messages';
import { computeIngredients, computePctSum } from './dough/bakers';
import { RECIPE_DEFAULTS } from './dough/defaults';
import {
	idealMixWaterTempC,
	PREFERMENT_MAX_HOURS,
	PREFERMENT_MIN_HOURS,
	prefermentDurationHours,
	prefermentRefHours,
	Q10,
	REF_TEMP_C,
	TARGET_FDT_C,
	TARGET_UNITS_FRESH,
	temperatureFactor,
	YEAST_PCT_HIGH,
	YEAST_PCT_LOW,
	yeastPercentForPhases
} from './dough/fermentation';
import { flourWindowHours } from './dough/flour';
import { computeSchedule } from './dough/schedule';
import { defaultInputs, findStep } from './dough/testFixtures';

// The panel is a contract: every calculation the app performs has to be
// represented there, in all five locales, and the copy has to match the code.
// Before this the contract lived only in CLAUDE.md and in whoever remembered
// to read it — the markup and the message bundle could disagree in either
// direction with a green suite. These two tests are that contract, checked.
describe('the "Get nerdy" panel and the message bundle agree', () => {
	it('renders only keys that exist, in every locale', () => {
		for (const locale of LOCALES) {
			const form = MESSAGES[locale].form as Record<string, string>;
			for (const key of infoSectionKeys()) {
				// `toBeTruthy` passed on any non-empty value, including a non-string.
				expect(typeof form[key], `${locale}.form.${key}`).toBe('string');
				expect(form[key], `${locale}.form.${key}`).not.toBe('');
			}
		}
	});

	it('renders every info_ message exactly once', () => {
		// info_heading names the disclosure itself and info_intro sits above the
		// sections — everything else is section copy and has to be on screen.
		const standalone = new Set(['info_heading', 'info_intro']);
		const inBundle = Object.keys(MESSAGES.en.form)
			.filter((k) => k.startsWith('info_'))
			.filter((k) => !standalone.has(k));
		const rendered = infoSectionKeys();

		expect([...rendered].sort()).toEqual([...inBundle].sort());
		expect(new Set(rendered).size, 'a key rendered twice').toBe(rendered.length);
	});
});

const formulas = INFO_SECTIONS.flatMap((s) =>
	s.parts.filter((p) => p.kind === 'formula').map((p) => p.formula)
);

/** The nth formula a section prints, addressed by its title key. */
function formulaOf(title: string, nth = 0): string {
	const section = INFO_SECTIONS.find((s) => s.title === title)!;
	return section.parts.filter((p) => p.kind === 'formula').map((p) => p.formula)[nth];
}

// Runs a printed formula as arithmetic. The panel's notation is the code's
// with typographic operators (·, −, ^, Σ) and `%` inside identifiers; a clamp
// clause after a comma is a statement about the result, not part of the
// expression. Everything else is deliberately valid JavaScript — the `??`, the
// parentheses, `f(T)` — which is what lets the printed text and the shipped
// function be handed the same numbers and compared.
function evaluate(formula: string, vars: Record<string, number | ((t: number) => number)>): number {
	const rhs = formula
		.split(' = ')[1]
		.split(',')[0]
		.replace(/·/g, '*')
		.replace(/−/g, '-')
		.replace(/\^/g, '**')
		.replace(/Σ /g, '')
		.replace(/%/g, 'Pct');
	return new Function(...Object.keys(vars), `return ${rhs};`)(...Object.values(vars));
}

describe('the formulas the panel prints', () => {
	it('are pinned word for word', () => {
		// This pins the TEXT: a formula cannot be reworded, reordered or dropped
		// without showing up here. It does NOT read the code — these literals are
		// copies of the ones in infoSections.ts, so a constant that moves in
		// src/lib/dough/ leaves the panel and this list stale together. That is
		// exactly how `f(roomTempC)` outlived the pre-ferment temperature from
		// v4.0, and how `flour = total / pctSum` (off by a factor of 100 against
		// bakers.ts) shipped at all. The suites below are the half that reads the
		// code: one asserts every numeric literal in a formula against the
		// constant it stands for, the other runs the formula and the function it
		// describes on the same inputs.
		expect(formulas).toEqual([
			'f(T) = 2^((T − 22) / 10)',
			'yeast% = target / Σ (w · hours · f(T))',
			'T = preFermentTempC ?? roomTempC',
			'wallHours = refHours / f(T),  8 ≤ wallHours ≤ 24',
			'water = 3·23 − 2·room − friction',
			'flour = total · 100 / pctSum',
			'pctSum = 100 + hydration + salt% + yeast% + oil% + sugar%',
			'pctSum = 100 + hydration + salt% + oil% + sugar%',
			'hours(W) = lo · (hi/lo)^((W − Wlo) / (Whi − Wlo))'
		]);
	});

	// Every numeric literal that appears inside a printed formula, held against
	// the constant it stands for. The full enumeration: 2 and 22 (Q10 and its
	// reference temperature) plus the 10 °C interval that gives Q10 its name;
	// 8 and 24 (the pre-ferment wall-clock clamp); 3 and 23 (the
	// desired-dough-temperature rule's three-way average and its target) and
	// the 2 that folds flour-at-room-temperature into it; and 100, the
	// baker's-percentage base, in all three mass-balance lines. Everything else
	// in a formula is a name. The prose beside them carries many more numbers,
	// but that is translated five ways and lives in messages.ts — one of those,
	// the one found wrong, is pinned at the end of this file.
	describe('print the numbers the code uses', () => {
		it('Q10 model: the base and the reference temperature', () => {
			expect(formulaOf('info_q10_title')).toBe(`f(T) = ${Q10}^((T − ${REF_TEMP_C}) / 10)`);
			// The 10 is what "Q10" means, so it is pinned as behaviour rather than
			// as a literal: one interval above the reference, the factor is the base.
			expect(temperatureFactor(REF_TEMP_C)).toBe(1);
			expect(temperatureFactor(REF_TEMP_C + 10)).toBe(Q10);
		});

		it('pre-ferment wall clock: the clamp band', () => {
			const clamp = formulaOf('info_preferment_title', 1).match(/(\d+) ≤ wallHours ≤ (\d+)/)!;
			expect(Number(clamp[1])).toBe(PREFERMENT_MIN_HOURS);
			expect(Number(clamp[2])).toBe(PREFERMENT_MAX_HOURS);
			expect(prefermentDurationHours('biga', 35)).toBe(PREFERMENT_MIN_HOURS);
			expect(prefermentDurationHours('biga', 4)).toBe(PREFERMENT_MAX_HOURS);
		});

		it('mix water: the desired-dough-temperature target', () => {
			expect(formulaOf('info_water_title')).toBe(`water = 3·${TARGET_FDT_C} − 2·room − friction`);
		});

		it("mass balance: the baker's-percentage base", () => {
			expect(
				computePctSum({
					hydration: 0,
					saltPercent: 0,
					oilPercent: 0,
					sugarPercent: 0,
					yeastPercent: 0,
					yeastType: 'fresh'
				})
			).toBe(100);
			expect(formulaOf('info_mass_title', 0)).toContain('· 100 /');
			expect(formulaOf('info_mass_title', 1)).toMatch(/^pctSum = 100 \+/);
			expect(formulaOf('info_mass_title', 2)).toMatch(/^pctSum = 100 \+/);
		});
	});

	// The other direction: hand each printed formula the same inputs as the
	// function it describes and require the same answer. This is the check the
	// literal pin cannot make — a formula that reads plausibly and computes the
	// wrong thing. `flour = total / pctSum` stood for six major versions: next
	// to `pctSum = 100 + …` it claims 1680 g of dough at pctSum 173.5 takes
	// 9.7 g of flour, and nothing could fail on it because no test ever ran the
	// text it printed.
	describe('compute what the code computes', () => {
		it('f(T) is temperatureFactor', () => {
			for (const T of [4, 17, 22, 28, 32]) {
				expect(evaluate(formulaOf('info_q10_title'), { T })).toBeCloseTo(temperatureFactor(T), 12);
			}
		});

		it('yeast% is the fresh-yeast solve over one shared phase (w = 1)', () => {
			// Σ over a single term is the term; the multi-phase sum itself is
			// pinned against yeastPercentForPhases in fermentation.test.ts.
			const phase = { hours: 8, tempC: 28 };
			const printed = evaluate(formulaOf('info_units_title'), {
				target: TARGET_UNITS_FRESH,
				w: 1,
				hours: phase.hours,
				T: phase.tempC,
				f: temperatureFactor
			});
			expect(printed).toBeCloseTo(yeastPercentForPhases('fresh', [phase]), 12);
		});

		it('wallHours runs at the pre-ferment temperature, falling back to the room', () => {
			// The formula said f(roomTempC) from v4.0 to v7.1 while the code — and
			// the prose printed directly above it — had used
			// preFermentTempC ?? roomTempC all along. A 17 °C cellar under a 28 °C
			// kitchen is where the two answers differ by half a day.
			const tempOf = (preFermentTempC: number | null, roomTempC: number) =>
				evaluate(formulaOf('info_preferment_title', 0), {
					preFermentTempC: preFermentTempC as number,
					roomTempC
				});
			const wall = formulaOf('info_preferment_title', 1);
			const f = temperatureFactor;

			const cellar = evaluate(wall, {
				refHours: prefermentRefHours('biga'),
				T: tempOf(17, 28),
				f
			});
			expect(cellar).toBeCloseTo(prefermentDurationHours('biga', 17), 12);
			expect(cellar).not.toBeCloseTo(prefermentDurationHours('biga', 28), 0);

			// null is what "no pre-ferment temperature set" is in DoughInputs, and
			// `??` in the printed formula is the operator the code actually uses.
			// 24 °C keeps the poolish inside the clamp band, where the formula
			// (which has no clamp) and the function have to agree exactly.
			expect(tempOf(null, 24)).toBe(24);
			const room = evaluate(wall, {
				refHours: prefermentRefHours('poolish'),
				T: tempOf(null, 24),
				f
			});
			expect(room).toBeCloseTo(prefermentDurationHours('poolish', 24), 12);

			// And the schedule really reserves that duration, at that temperature.
			const schedule = computeSchedule(
				defaultInputs({
					startAt: new Date('2026-05-09T19:00:00Z'),
					preFerments: [{ type: 'biga', flourPercent: 30 }],
					preFermentTempC: 17,
					roomTempC: 28
				})
			);
			expect(findStep(schedule, 'preferment-mix').durationMinutes).toBe(
				Math.round(prefermentDurationHours('biga', 17) * 60)
			);
		});

		it('water is idealMixWaterTempC inside the clamp band', () => {
			// Friction per method is prose (24 / 18 / 5 °C), so it is passed in by
			// hand; a 18 °C kitchen keeps all three answers inside [4, 35] °C,
			// where the printed rule and the clamped, rounded function agree exactly.
			const formula = formulaOf('info_water_title');
			for (const [method, friction] of [
				['spiral', 24],
				['stand', 18],
				['hand', 5]
			] as const) {
				expect(evaluate(formula, { room: 18, friction })).toBe(idealMixWaterTempC(18, method));
			}
		});

		it('flour is total · 100 / pctSum, not total / pctSum', () => {
			const args = { ...RECIPE_DEFAULTS, yeastPercent: 0.5, preFerments: [] };
			const ingredients = computeIngredients(args);
			const pctSum = computePctSum(args);
			// The defaults-plus-half-a-percent recipe the wrong formula misreads.
			expect(pctSum).toBeCloseTo(173.5, 12);
			expect(
				evaluate(formulaOf('info_mass_title', 0), { total: ingredients.totalDough, pctSum })
			).toBeCloseTo(ingredients.flour, 9);
		});

		it('pctSum adds the yeast for fresh and drops it for sourdough', () => {
			const vars = { hydration: 70, saltPct: 3, yeastPct: 0.5, oilPct: 2, sugarPct: 1 };
			const args = {
				hydration: vars.hydration,
				saltPercent: vars.saltPct,
				oilPercent: vars.oilPct,
				sugarPercent: vars.sugarPct,
				yeastPercent: vars.yeastPct
			};
			expect(evaluate(formulaOf('info_mass_title', 1), vars)).toBe(
				computePctSum({ ...args, yeastType: 'fresh' })
			);
			expect(evaluate(formulaOf('info_mass_title', 2), vars)).toBe(
				computePctSum({ ...args, yeastType: 'sourdough' })
			);
		});

		it('hours(W) is the log-hours interpolation flourWindowHours runs', () => {
			// The anchors themselves are prose (W 180 / 265 / 310); both band edges
			// are read back out of the function, so only the printed shape is on trial.
			const [Wlo, Whi] = [180, 265];
			for (const edge of ['min', 'max'] as const) {
				const lo = flourWindowHours(Wlo, 'cold')[edge];
				const hi = flourWindowHours(Whi, 'cold')[edge];
				expect(evaluate(formulaOf('info_flour_title'), { lo, hi, W: 220, Wlo, Whi })).toBeCloseTo(
					flourWindowHours(220, 'cold')[edge],
					12
				);
			}
		});
	});

	it('the fridge-versus-room slowdown in the switch copy is the Q10 figure', () => {
		// Every locale said "4 °C ≈ 16× slower than 22 °C". Under Q10 = 2 the
		// factor at 4 °C is 2^(−1.8) ≈ 0.29, so the fridge is about 3.5× slower;
		// 16× would need a 40 °C gap. The number lived in prose, translated five
		// ways, with nothing deriving it from temperatureFactor — so it was free
		// to be wrong in all five at once. Derived here, then looked for in each
		// locale's own decimal notation.
		const fridge = RECIPE_DEFAULTS.fridgeTempC;
		const slower = Math.round(2 / temperatureFactor(fridge)) / 2;
		expect(slower).toBe(3.5);
		const figure = new RegExp(`${fridge} °C ≈ ${String(slower).replace('.', '[.,]')}× `);
		for (const locale of LOCALES) {
			expect(MESSAGES[locale].form.info_switch_body, locale).toMatch(figure);
			expect(MESSAGES[locale].form.info_switch_body, locale).toContain(`${REF_TEMP_C} °C`);
		}
	});

	it('the yeast band in the fit copy and the factor copy is the one the code judges', () => {
		// The band lived in three places: quality.ts (0.05 / 1.5), schedule.ts's
		// warnings (0.02 / 2) and this prose in five locales. The two code copies
		// disagreed for several releases and nothing noticed, because the prose
		// was pinned to neither. Both now read fermentation.ts's pair; the copy
		// is held to it here in each locale's own decimal notation.
		const figure = new RegExp(
			`${String(YEAST_PCT_LOW).replace('.', '[.,]')}–${String(YEAST_PCT_HIGH).replace('.', '[.,]')}%`
		);
		for (const locale of LOCALES) {
			expect(MESSAGES[locale].form.info_fit_body, locale).toMatch(figure);
			expect(MESSAGES[locale].quality.factor_yeast_extreme, locale).toMatch(figure);
		}
	});
});
