import { describe, expect, it } from 'vitest';
import { LOCALES, MESSAGES } from '../i18n/messages';
import { RECIPE_DEFAULTS } from './defaults';
import {
	idealMixWaterTempC,
	YEAST_PCT_HIGH,
	YEAST_PCT_LOW,
	yeastMassFactor,
	yeastPercentForPhases
} from './fermentation';
import { fitStars, recipeFitScore } from './quality';
import { COLD_MODE_THRESHOLD_MIN, computeSchedule, mixMin } from './schedule';
import { defaultInputs } from './testFixtures';
import type { DoughInputs, YeastType } from './types';

// Knead Time held against the AVPN disciplinare (2024), §2.1.2–2.1.4 (issue
// #422). The disciplinare states its dough per litre of water:
//
//   flour        1.6–1.8 kg          → hydration 1000/1800 … 1000/1600 = 55.6–62.5 %
//   salt         40–60 g             → 40/1800 … 60/1600 = 2.22–3.75 % of the flour
//   fresh yeast  0.1–3 g             (dry yeast 1 : 3, lievito madre < 10 % of the flour)
//   balls        200–280 g
//   fermentation 12–24 h in all, direct dough, no fat, no sugar, cabinets at 18–20 °C
//
// The fit score takes its salt and ball-weight bands from the disciplinare;
// the rest are documented as "contemporary Neapolitan", not AVPN. This suite
// does not judge; it PINS what the model does to a disciplinare recipe today,
// with the disciplinare figure named beside each number, so the day a band or
// a constant moves the difference to the spec shows up here instead of in a
// dough. The Get nerdy panel's info_avpn_body quotes several of these results
// and is held to them at the end of the file.

const AVPN = {
	waterG: 1000,
	flourG: { min: 1600, max: 1800 },
	saltG: { min: 40, max: 60 },
	freshYeastG: { min: 0.1, max: 3 },
	ballG: { min: 200, max: 280 },
	hours: { min: 12, max: 24 },
	cabinetC: { min: 18, max: 20 },
	lievitoMadreMaxPct: 10,
	dryToFresh: 1 / 3
} as const;

// The four corners of the per-litre table, as baker's percentages. The
// driest dough is the most flour (1.8 kg), the wettest the least (1.6 kg).
interface Corner {
	name: string;
	flourG: number;
	saltG: number;
}
const CORNERS: Corner[] = [
	{ name: '1.8 kg flour, 40 g salt', flourG: AVPN.flourG.max, saltG: AVPN.saltG.min },
	{ name: '1.8 kg flour, 60 g salt', flourG: AVPN.flourG.max, saltG: AVPN.saltG.max },
	{ name: '1.6 kg flour, 40 g salt', flourG: AVPN.flourG.min, saltG: AVPN.saltG.min },
	{ name: '1.6 kg flour, 60 g salt', flourG: AVPN.flourG.min, saltG: AVPN.saltG.max }
];
const hydrationOf = (c: Corner) => (AVPN.waterG * 100) / c.flourG;
const saltPctOf = (c: Corner) => (c.saltG * 100) / c.flourG;

// Bake at 21:00 after a 12 h day (prep at 09:00), or at 19:00 after 24 h
// (prep at 19:00 the evening before). Both keep every hands-on step out of the
// 22:00–08:00 night window, so neither schedule is bent by the night guard and
// what is pinned is the model, not the clock. TZ=UTC (npm run test) makes
// these wall-clock hours.
const WINDOW_12H = {
	readyBy: new Date('2026-05-12T21:00:00Z'),
	startAt: new Date('2026-05-12T09:00:00Z')
};
const WINDOW_24H = {
	readyBy: new Date('2026-05-12T19:00:00Z'),
	startAt: new Date('2026-05-11T19:00:00Z')
};

// The disciplinare's dough: direct (no pre-ferment), no autolyse rest (§2.1.3
// goes straight from water, salt and yeast to the flour), no fat, no sugar,
// 250 g balls, a spiral mixer, no flour stated (W is advisory and outside
// §2.1.2–2.1.4).
function avpnInputs(
	corner: Corner,
	window: { readyBy: Date; startAt: Date },
	overrides: Partial<DoughInputs> = {}
): DoughInputs {
	return defaultInputs({
		...window,
		pizzaCount: 6,
		ballWeight: 250,
		hydration: hydrationOf(corner),
		saltPercent: saltPctOf(corner),
		oilPercent: 0,
		sugarPercent: 0,
		autolyse: false,
		preFerments: [],
		flourW: null,
		...overrides
	});
}

// Grams of the chosen carrier per litre of the recipe's water — the unit the
// disciplinare states the yeast in. Uses the whole-recipe water, which for a
// direct fresh-yeast dough is exactly ingredients.water.
function yeastPerLitre(
	yeastType: YeastType,
	corner: Corner,
	roomTempC: number,
	window = WINDOW_12H
) {
	const schedule = computeSchedule(avpnInputs(corner, window, { yeastType, roomTempC }));
	return {
		schedule,
		gPerLitre: (schedule.ingredients.yeast / schedule.ingredients.water) * AVPN.waterG
	};
}

const DRIEST = CORNERS[0];
const WETTEST = CORNERS[2];

describe('the AVPN per-litre table, as baker’s percentages', () => {
	it('the hydration and salt corners are 55.6–62.5 % and 2.22–3.75 %', () => {
		expect(hydrationOf(DRIEST)).toBeCloseTo(55.556, 3);
		expect(hydrationOf(WETTEST)).toBe(62.5);
		expect(saltPctOf(CORNERS[0])).toBeCloseTo(2.222, 3);
		expect(saltPctOf(CORNERS[1])).toBeCloseTo(3.333, 3);
		expect(saltPctOf(CORNERS[2])).toBe(2.5);
		expect(saltPctOf(CORNERS[3])).toBe(3.75);
	});

	it('computeIngredients reproduces the table per litre of water at every corner', () => {
		// Mass balance read the disciplinare's way round: whatever the ball
		// weight, the weighed flour and salt per litre of weighed water are the
		// table's own figures, and the batch still adds up to n × ball.
		for (const corner of CORNERS) {
			for (const ballWeight of [AVPN.ballG.min, AVPN.ballG.max]) {
				const s = computeSchedule(avpnInputs(corner, WINDOW_12H, { ballWeight }));
				const { flour, water, salt, yeast, oil, sugar, totalDough } = s.ingredients;
				expect((flour / water) * AVPN.waterG, corner.name).toBeCloseTo(corner.flourG, 9);
				expect((salt / water) * AVPN.waterG, corner.name).toBeCloseTo(corner.saltG, 9);
				expect(oil + sugar).toBe(0);
				expect(totalDough).toBe(6 * ballWeight);
				expect(flour + water + salt + yeast).toBeCloseTo(totalDough, 9);
			}
		}
	});
});

describe('a 12 h AVPN dough solves through room mode', () => {
	it('12 h is below the cold switch, so the whole window ferments on the counter', () => {
		const s = computeSchedule(avpnInputs(DRIEST, WINDOW_12H, { roomTempC: 18 }));
		expect(s.mode).toBe('room');
		expect(s.feasible).toBe(true);
		expect(s.warnings).toEqual([]);
		// Shape, not just mode: the disciplinare puts no lengths on its two
		// fermentations, and the room leg gives the balls a third of the budget
		// capped at 90 min, so the long leg is the bulk. AVPN practice usually
		// runs the other way round (a short puntata, a long appretto in the
		// boxes) — a difference of shape that changes no gram of yeast, since the
		// solve only sees the sum at one temperature.
		expect(s.steps.map((x) => [x.kind, x.durationMinutes])).toEqual([
			['prep', 15],
			['mix', 15],
			['bulk-room', 585],
			['divide', 15],
			['final-proof', 90],
			['ready', 0]
		]);
	});

	it('fresh yeast lands at 2.6–3.4 g per litre at 18–20 °C: the 18 °C corners just over 3 g', () => {
		// The model's calibration (0.2 % fresh for 8 h at 22 °C, Q10 = 2) asks
		// for 0.1877 % at 18 °C and 0.1634 % at 20 °C over the 11.25 fermenting
		// hours of a 12 h window. Per litre of water that is 3.38 g (driest) and
		// 3.00 g (wettest) at 18 °C — both a hair over the disciplinare's 3 g
		// ceiling — and 2.94 / 2.61 g at 20 °C, inside it. The app sits at the
		// top of the spec's range on a short dough, not in the middle of it.
		const at18 = [yeastPerLitre('fresh', DRIEST, 18), yeastPerLitre('fresh', WETTEST, 18)];
		const at20 = [yeastPerLitre('fresh', DRIEST, 20), yeastPerLitre('fresh', WETTEST, 20)];

		expect(at18[0].schedule.yeastPercent).toBeCloseTo(0.187663, 6);
		expect(at20[0].schedule.yeastPercent).toBeCloseTo(0.16337, 5);

		expect(at18[0].gPerLitre).toBeCloseTo(3.378, 3);
		expect(at18[1].gPerLitre).toBeCloseTo(3.003, 3);
		expect(at20[0].gPerLitre).toBeCloseTo(2.941, 3);
		expect(at20[1].gPerLitre).toBeCloseTo(2.614, 3);

		for (const r of at18) expect(r.gPerLitre).toBeGreaterThan(AVPN.freshYeastG.max);
		for (const r of at20) expect(r.gPerLitre).toBeLessThan(AVPN.freshYeastG.max);
		// Nowhere near the floor of 0.1 g.
		for (const r of [...at18, ...at20]) expect(r.gPerLitre).toBeGreaterThan(2.5);
	});

	it('a 12 h dough at 22 °C sits inside 0.1–3 g at every corner', () => {
		// The app's own reference kitchen: 0.1422 % fresh, 2.56 g (driest) and
		// 2.28 g (wettest) per litre.
		expect(yeastPerLitre('fresh', DRIEST, 22).gPerLitre).toBeCloseTo(2.56, 3);
		expect(yeastPerLitre('fresh', WETTEST, 22).gPerLitre).toBeCloseTo(2.2756, 3);
	});
});

describe('a 24 h AVPN dough, with the fridge allowed', () => {
	it('from 16 h on the schedule switches to the fridge — the disciplinare never mentions one', () => {
		// The disciplinare allows 12–24 h at room temperature or in an 18–20 °C
		// cabinet. Knead Time's cold switch is a 16 h window (after any
		// pre-ferment), so by default the last eight of those hours are planned
		// as a cold bulk at fridgeTempC. noFridge turns that off (below).
		expect(COLD_MODE_THRESHOLD_MIN).toBe(16 * 60);
		const s = computeSchedule(avpnInputs(DRIEST, WINDOW_24H, { roomTempC: 18 }));
		expect(s.mode).toBe('cold');
		expect(s.steps.map((x) => [x.kind, x.durationMinutes])).toEqual([
			['prep', 15],
			['mix', 15],
			['bulk-room', 60],
			['bulk-cold', 1095],
			['divide', 15],
			['final-proof', 240],
			['ready', 0]
		]);
	});

	it('so its yeast is the cold solve: 2.8–3.2 g per litre at 18–20 °C', () => {
		// 5 h on the counter plus 18.25 h at 4 °C. The fridge leg is worth
		// little (f(4 °C) ≈ 0.29), so a 24 h cold dough needs about as much
		// yeast as a 12 h room one: 0.1772 % at 18 °C, 0.1668 % at 20 °C.
		const r18 = [
			yeastPerLitre('fresh', DRIEST, 18, WINDOW_24H),
			yeastPerLitre('fresh', WETTEST, 18, WINDOW_24H)
		];
		const r20 = [
			yeastPerLitre('fresh', DRIEST, 20, WINDOW_24H),
			yeastPerLitre('fresh', WETTEST, 20, WINDOW_24H)
		];
		expect(r18[0].schedule.yeastPercent).toBeCloseTo(0.177183, 6);
		expect(r20[0].schedule.yeastPercent).toBeCloseTo(0.166776, 6);
		expect(r18[0].gPerLitre).toBeCloseTo(3.1893, 3);
		expect(r18[1].gPerLitre).toBeCloseTo(2.8349, 3);
		expect(r20[0].gPerLitre).toBeCloseTo(3.002, 3);
		expect(r20[1].gPerLitre).toBeCloseTo(2.6684, 3);
	});
});

// The disciplinare's own shape: the whole 24 h on the counter (issue #422).
function noFridgePerLitre(corner: Corner, roomTempC: number) {
	const schedule = computeSchedule(avpnInputs(corner, WINDOW_24H, { roomTempC, noFridge: true }));
	return {
		schedule,
		gPerLitre: (schedule.ingredients.yeast / schedule.ingredients.water) * AVPN.waterG
	};
}

describe('a 24 h AVPN dough with no fridge', () => {
	it('stays on the counter for all 24 h', () => {
		const { schedule: s } = noFridgePerLitre(DRIEST, 18);
		expect(s.mode).toBe('room');
		expect(s.warnings).toEqual([]);
		expect(s.steps.map((x) => [x.kind, x.durationMinutes])).toEqual([
			['prep', 15],
			['mix', 15],
			['bulk-room', 1305],
			['divide', 15],
			['final-proof', 90],
			['ready', 0]
		]);
	});

	it('solves to 1.26–1.63 g of fresh yeast per litre at 18–20 °C, well inside 0.1–3 g', () => {
		// The 23.25 fermenting hours (24 h minus prep, mix and divide) at 18 or
		// 20 °C, exactly the room solve: the model agrees with the spec once the
		// cold switch is out of the way.
		const fermentingHours = 24 - (15 + mixMin('spiral') + 15) / 60;
		expect(fermentingHours).toBe(23.25);
		const at18 = noFridgePerLitre(DRIEST, 18);
		const at20 = noFridgePerLitre(WETTEST, 20);
		expect(at18.schedule.yeastPercent).toBe(
			yeastPercentForPhases('fresh', [{ hours: fermentingHours, tempC: 18 }])
		);
		expect(at18.schedule.yeastPercent).toBeCloseTo(0.090805, 6);
		expect(at20.schedule.yeastPercent).toBeCloseTo(0.07905, 5);
		expect(at18.gPerLitre).toBeCloseTo(1.6345, 3);
		expect(at20.gPerLitre).toBeCloseTo(1.2648, 3);
		for (const corner of CORNERS) {
			for (const t of [AVPN.cabinetC.min, AVPN.cabinetC.max]) {
				const g = noFridgePerLitre(corner, t).gPerLitre;
				expect(g).toBeGreaterThan(AVPN.freshYeastG.min);
				expect(g).toBeLessThan(AVPN.freshYeastG.max);
			}
		}
	});
});

describe('the fit score on an AVPN-compliant recipe', () => {
	it('the 1.8 kg corners lose 4 points to hydration-off, and nothing else costs a point', () => {
		// hydration-off: the band is 60–80 %, the disciplinare's driest dough is
		// 55.6 % — 4.44 points outside at 1 point each. Salt and ball weight are
		// the disciplinare's own bands (2.2–3.75 %, 200–280 g) since issue #422,
		// so the saltiest corner no longer loses a point; 18–20 °C sits inside
		// the 14–30 °C room band. None of it costs a star.
		const expected = [
			{ score: 96, factors: [{ factor: 'hydration-off', delta: 60 - 100000 / 1800 }] },
			{ score: 96, factors: [{ factor: 'hydration-off', delta: 60 - 100000 / 1800 }] },
			{ score: 100, factors: [] },
			{ score: 100, factors: [] }
		];
		CORNERS.forEach((corner, i) => {
			for (const window of [WINDOW_12H, WINDOW_24H]) {
				for (const roomTempC of [AVPN.cabinetC.min, AVPN.cabinetC.max]) {
					for (const ballWeight of [AVPN.ballG.min, AVPN.ballG.max]) {
						const inputs = avpnInputs(corner, window, { roomTempC, ballWeight });
						const fit = recipeFitScore(computeSchedule(inputs), inputs);
						expect(fit.score, corner.name).toBe(expected[i].score);
						expect(fit.factors.map((f) => f.factor)).toEqual(
							expected[i].factors.map((f) => f.factor)
						);
						fit.factors.forEach((f, j) =>
							expect(f.delta).toBeCloseTo(expected[i].factors[j].delta, 9)
						);
						expect(fitStars(fit.score)).toBe(5);
					}
				}
			}
		});
	});

	it('the yeast band is the app’s, not the disciplinare’s: 0.8–27 g per litre against 0.1–3 g', () => {
		// YEAST_PCT_LOW / HIGH (0.05 / 1.5 % fresh) in the disciplinare's unit.
		// The floor sits eight times higher than its 0.1 g; the ceiling nine
		// times higher than its 3 g. So a 12 h dough at 18 °C, over 3 g, raises
		// no yeast warning and no yeast-extreme factor (pinned above: no
		// warnings, no factor beyond hydration/salt).
		const gPerLitre = (pct: number, c: Corner) => (pct / hydrationOf(c)) * AVPN.waterG;
		expect(YEAST_PCT_LOW).toBe(0.05);
		expect(YEAST_PCT_HIGH).toBe(1.5);
		expect(gPerLitre(YEAST_PCT_LOW, WETTEST)).toBeCloseTo(0.8, 9);
		expect(gPerLitre(YEAST_PCT_LOW, DRIEST)).toBeCloseTo(0.9, 9);
		expect(gPerLitre(YEAST_PCT_HIGH, WETTEST)).toBeCloseTo(24, 9);
		expect(gPerLitre(YEAST_PCT_HIGH, DRIEST)).toBeCloseTo(27, 9);
		// And the disciplinare's band as fresh percent of the flour.
		expect((AVPN.freshYeastG.min / AVPN.flourG.max) * 100).toBeCloseTo(0.00556, 5);
		expect((AVPN.freshYeastG.max / AVPN.flourG.min) * 100).toBeCloseTo(0.1875, 9);
	});
});

describe('yeast carriers against the disciplinare', () => {
	it('instant dry converts at the disciplinare’s 1 : 3; active dry at 1 : 2.5', () => {
		// The disciplinare names one dry yeast at 1/3 of the fresh mass. Instant
		// matches it exactly; active dry is the app's own 0.4, a distinction the
		// disciplinare does not make. At 12 h / 20 °C, driest corner, that is
		// 0.98 g instant against 1.18 g active dry per litre.
		expect(yeastMassFactor('instant')).toBe(AVPN.dryToFresh);
		expect(yeastMassFactor('active-dry')).toBe(0.4);
		expect(1 / yeastMassFactor('active-dry')).toBe(2.5);
		expect(yeastPerLitre('instant', DRIEST, 20).gPerLitre).toBeCloseTo(0.9802, 3);
		expect(yeastPerLitre('active-dry', DRIEST, 20).gPerLitre).toBeCloseTo(1.1763, 3);
	});

	it('a 12 h sourdough at 18–20 °C needs 16–19 % starter, over the disciplinare’s 10 %', () => {
		// The disciplinare caps lievito madre below 10 % of the flour. The solve
		// (20 % starter for 8 h at 22 °C) asks for 18.77 % at 18 °C and 16.34 %
		// at 20 °C on a 12 h window — and judges it in fresh-equivalent terms
		// (0.19 / 0.16 %), so no warning and no fit factor says so.
		const at18 = computeSchedule(
			avpnInputs(DRIEST, WINDOW_12H, { yeastType: 'sourdough', roomTempC: 18 })
		);
		const at20 = computeSchedule(
			avpnInputs(DRIEST, WINDOW_12H, { yeastType: 'sourdough', roomTempC: 20 })
		);
		expect(at18.yeastPercent).toBeCloseTo(18.766, 3);
		expect(at20.yeastPercent).toBeCloseTo(16.337, 3);
		for (const s of [at18, at20]) {
			expect(s.yeastPercent).toBeGreaterThan(AVPN.lievitoMadreMaxPct);
			expect(s.warnings).toEqual([]);
		}
	});
});

describe('what else the disciplinare fixes, and what the app does instead', () => {
	it('mix: 15 / 20 / 25 min, inside “about 10 min to punto di pasta, then at most 20 more”', () => {
		for (const method of ['spiral', 'stand', 'hand'] as const) {
			expect(mixMin(method)).toBeLessThanOrEqual(10 + 20);
		}
		expect([mixMin('spiral'), mixMin('stand'), mixMin('hand')]).toEqual([15, 20, 25]);
	});

	it('mix water at 18–20 °C on a spiral is 5–9 °C, below the disciplinare’s 16–22 °C', () => {
		// The app aims the finished dough at 23 °C (desired-dough-temperature
		// rule with 24 °C of spiral friction); the disciplinare states the water
		// itself, 16–22 °C. They answer different questions, but a baker reading
		// both sees two different numbers.
		expect(idealMixWaterTempC(18, 'spiral')).toBe(9);
		expect(idealMixWaterTempC(20, 'spiral')).toBe(5);
		expect(idealMixWaterTempC(20, 'hand')).toBe(24);
	});

	it('the defaults: no fat, no sugar, 3 % salt inside the spec; 70 % hydration and the autolyse outside it', () => {
		expect(RECIPE_DEFAULTS.oilPercent).toBe(0);
		expect(RECIPE_DEFAULTS.sugarPercent).toBe(0);
		expect(RECIPE_DEFAULTS.saltPercent).toBeGreaterThanOrEqual(saltPctOf(CORNERS[0]));
		expect(RECIPE_DEFAULTS.saltPercent).toBeLessThanOrEqual(saltPctOf(CORNERS[3]));
		expect(RECIPE_DEFAULTS.ballWeight).toBe(AVPN.ballG.max);
		// 70 % is 1.43 kg of flour per litre, below the disciplinare's 1.6 kg.
		expect(RECIPE_DEFAULTS.hydration).toBe(70);
		expect(RECIPE_DEFAULTS.hydration).toBeGreaterThan(hydrationOf(WETTEST));
		// §2.1.3 mixes water, salt, yeast and flour in one go; the app's default
		// rests flour and water for 30 min first.
		expect(RECIPE_DEFAULTS.autolyse).toBe(true);
	});
});

describe('the Get nerdy panel states these results in every locale', () => {
	// info_avpn_body quotes the solve's own output. Derive each figure here and
	// look for it in each locale's decimal notation, so the copy cannot keep a
	// number the model has stopped producing.
	const dec = (x: number) => String(x).replace('.', '[.,]');

	it('quotes the disciplinare’s figures and the app’s answers to them', () => {
		const fresh = [18, 20].flatMap((t) =>
			[DRIEST, WETTEST].map((c) => yeastPerLitre('fresh', c, t).gPerLitre)
		);
		const lo = Math.floor(Math.min(...fresh) * 10) / 10;
		const hi = Math.ceil(Math.max(...fresh) * 10) / 10;
		expect([lo, hi]).toEqual([2.6, 3.4]);

		const starter = [18, 20].map(
			(roomTempC) =>
				computeSchedule(avpnInputs(DRIEST, WINDOW_12H, { yeastType: 'sourdough', roomTempC }))
					.yeastPercent
		);
		const sdLo = Math.floor(Math.min(...starter));
		const sdHi = Math.ceil(Math.max(...starter));
		expect([sdLo, sdHi]).toEqual([16, 19]);

		const counter = [18, 20].flatMap((t) =>
			[DRIEST, WETTEST].map((c) => noFridgePerLitre(c, t).gPerLitre)
		);
		const nfLo = Math.floor(Math.min(...counter) * 10) / 10;
		const nfHi = Math.ceil(Math.max(...counter) * 10) / 10;
		expect([nfLo, nfHi]).toEqual([1.2, 1.7]);

		const patterns = [
			new RegExp(`${dec(55.6)}–${dec(62.5)} %`),
			new RegExp(`${dec(2.2)}–${dec(3.75)} %`),
			new RegExp(`${AVPN.ballG.min}–${AVPN.ballG.max} g`),
			new RegExp(`${AVPN.hours.min}–${AVPN.hours.max} h`),
			new RegExp(`${AVPN.cabinetC.min}–${AVPN.cabinetC.max} °C`),
			new RegExp(`${COLD_MODE_THRESHOLD_MIN / 60} h`),
			new RegExp(`${dec(lo)}–${dec(hi)} g`),
			new RegExp(`${dec(nfLo)}–${dec(nfHi)} g`),
			new RegExp(`${sdLo}–${sdHi} %`),
			new RegExp(`${dec(YEAST_PCT_LOW)}–${dec(YEAST_PCT_HIGH)} %`),
			/1:3/,
			new RegExp(`1:${dec(1 / yeastMassFactor('active-dry'))}`)
		];
		for (const locale of LOCALES) {
			const body = MESSAGES[locale].form.info_avpn_body;
			for (const p of patterns) expect(body, `${locale}: ${p}`).toMatch(p);
		}
	});
});
