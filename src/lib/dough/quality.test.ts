import { describe, expect, it } from 'vitest';
import { PREFERMENT_MAX_HOURS, PREFERMENT_MIN_HOURS } from './fermentation';
import { fitStars, recipeFitScore, stepQualityFlags, type FitFactor } from './quality';
import { COLD_BULK_CEIL_MIN, COLD_BULK_FLOOR_MIN, computeSchedule } from './schedule';
import { defaultInputs as inputs } from './testFixtures';
import type { ComputedSchedule, DoughInputs, ScheduleStep, ScheduleWarning } from './types';

// Default inputs (testFixtures.defaultInputs): 6 h room-mode window, daytime,
// no pre-ferment — every KPI sits in the contemporary Neapolitan band, so
// the fit score lands at 100 unless a test overrides a field.

function step(kind: ScheduleStep['kind'], atLocalHHMM: string, durationMinutes = 0): ScheduleStep {
	const [h, m] = atLocalHHMM.split(':').map(Number);
	return { kind, at: new Date(2026, 4, 14, h, m, 0, 0), durationMinutes };
}

function factorKinds(factors: { factor: FitFactor }[]): FitFactor[] {
	return factors.map((f) => f.factor);
}

describe('stepQualityFlags — night', () => {
	const i = inputs();
	const s = computeSchedule(i);

	it('flags a baker-action step starting at 22:00', () => {
		expect(stepQualityFlags(step('mix', '22:00', 15), s)).toContain('night');
	});

	it('flags a baker-action step starting at 03:00', () => {
		expect(stepQualityFlags(step('prep', '03:00', 15), s)).toContain('night');
	});

	it('does not flag a baker-action step at 08:00 (window is half-open)', () => {
		expect(stepQualityFlags(step('prep', '08:00', 15), s)).not.toContain('night');
	});

	it('does not flag a baker-action step at 21:59', () => {
		expect(stepQualityFlags(step('mix', '21:59', 15), s)).not.toContain('night');
	});

	it('does not flag a passive step at night (final-proof can sit overnight)', () => {
		expect(stepQualityFlags(step('final-proof', '23:00', 240), s)).not.toContain('night');
	});

	it('does not flag ready at night (it is just a marker)', () => {
		expect(stepQualityFlags(step('ready', '02:00', 0), s)).not.toContain('night');
	});
});

describe('stepQualityFlags — cold-bulk and preferment', () => {
	it('flags a bulk-cold row when it was shifted to dodge night', () => {
		// 18 h window with readyBy at 19:00 → natural prepAt at 01:00 (night).
		// Since issue #78 the adjuster can only shrink coldMin (extending would
		// pull the first step before startAt), lifting prep into the morning —
		// the actual cold-bulk duration < natural.
		const i = inputs({
			startAt: new Date('2026-05-12T01:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const s = computeSchedule(i);
		const bulkCold = s.steps.find((st) => st.kind === 'bulk-cold')!;
		expect(stepQualityFlags(bulkCold, s)).toContain('cold-bulk-shifted');
	});

	it('flags a bulk-cold row when the desired duration is below the floor', () => {
		// 17 h window → desired (~11 h) below the 12 h floor.
		const i = inputs({
			startAt: new Date('2026-05-11T20:00:00Z'),
			readyBy: new Date('2026-05-12T13:00:00Z')
		});
		const s = computeSchedule(i);
		const bulkCold = s.steps.find((st) => st.kind === 'bulk-cold')!;
		expect(stepQualityFlags(bulkCold, s)).toContain('cold-bulk-clamped-short');
	});

	it('flags a bulk-cold row when the desired duration is above the ceiling', () => {
		// 5+ days window → desired (>50 h) above the 48 h ceiling.
		const i = inputs({
			startAt: new Date('2026-05-10T07:00:00Z'),
			readyBy: new Date('2026-05-15T19:00:00Z')
		});
		const s = computeSchedule(i);
		const bulkCold = s.steps.find((st) => st.kind === 'bulk-cold')!;
		expect(stepQualityFlags(bulkCold, s)).toContain('cold-bulk-clamped-long');
	});

	it('flags a preferment-mix row when its natural duration is below the 8 h floor', () => {
		// At 32 °C the math wants ~7 h for biga → clamped to 8 h.
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			roomTempC: 32,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const s = computeSchedule(i);
		const pf = s.steps.find((st) => st.kind === 'preferment-mix')!;
		expect(stepQualityFlags(pf, s)).toContain('preferment-clamped-short');
	});

	it('flags a preferment-mix row when time forced its actual duration below the 8 h floor', () => {
		// 7 h room-mode window with biga (14 h natural at 22 °C). With only
		// 7 h − 45 min = 6.25 h available for the pre-ferment after fixed
		// steps, its actual duration ends up well below the 8 h floor.
		const i = inputs({
			startAt: new Date('2026-05-12T11:00:00Z'),
			readyBy: new Date('2026-05-12T18:00:00Z'),
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const s = computeSchedule(i);
		const pf = s.steps.find((st) => st.kind === 'preferment-mix')!;
		expect(pf.durationMinutes).toBeLessThan(8 * 60);
		expect(stepQualityFlags(pf, s)).toContain('preferment-clamped-short');
	});

	it('flags a preferment-mix row when its natural duration is above the 24 h ceiling', () => {
		// At 10 °C the math wants ~28 h for biga → clamped to 24 h.
		const i = inputs({
			startAt: new Date('2026-05-10T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			roomTempC: 10,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const s = computeSchedule(i);
		const pf = s.steps.find((st) => st.kind === 'preferment-mix')!;
		expect(stepQualityFlags(pf, s)).toContain('preferment-clamped-long');
	});

	it('flags each parallel pre-ferment against its own natural duration', () => {
		// At 26 °C biga wants ~10.6 h (inside the band) while poolish wants
		// ~9.1 h (also inside) — but at 32 °C both drop below the 8 h floor.
		// Verify the flags are computed per step, not from a shared value.
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			roomTempC: 32,
			preFerments: [
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			]
		});
		const s = computeSchedule(i);
		const pfSteps = s.steps.filter((st) => st.kind === 'preferment-mix');
		expect(pfSteps).toHaveLength(2);
		for (const step of pfSteps) {
			expect(stepQualityFlags(step, s)).toContain('preferment-clamped-short');
		}
	});

	it('returns no clamp flags for a bulk-cold within the [floor, ceiling] band', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const s = computeSchedule(i);
		const bulkCold = s.steps.find((st) => st.kind === 'bulk-cold')!;
		const flags = stepQualityFlags(bulkCold, s);
		expect(flags).not.toContain('cold-bulk-clamped-short');
		expect(flags).not.toContain('cold-bulk-clamped-long');
	});
});

describe('recipeFitScore — schedule imperfection', () => {
	function withWarnings(schedule: ComputedSchedule, warnings: ScheduleWarning[]): ComputedSchedule {
		return { ...schedule, warnings };
	}

	it('returns 100 and no factors for a defaults-only recipe in room mode', () => {
		const i = inputs();
		const fit = recipeFitScore(computeSchedule(i), i);
		expect(fit.score).toBe(100);
		expect(fit.factors).toEqual([]);
	});

	it('deducts per hour of cold-bulk shift', () => {
		const i = inputs({
			startAt: new Date('2026-05-12T01:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const s = computeSchedule(i);
		const fit = recipeFitScore(s, i);
		expect(factorKinds(fit.factors)).toContain('cold-bulk-shifted');
		const shiftFactor = fit.factors.find((f) => f.factor === 'cold-bulk-shifted')!;
		expect(shiftFactor.delta).toBeGreaterThan(0);
		expect(fit.score).toBeLessThan(100);
	});

	it('deducts when bulk-cold is short-clamped (desired below 12 h floor)', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T20:00:00Z'),
			readyBy: new Date('2026-05-12T13:00:00Z')
		});
		const s = computeSchedule(i);
		const fit = recipeFitScore(s, i);
		expect(factorKinds(fit.factors)).toContain('cold-bulk-clamped-short');
		expect(fit.score).toBeLessThan(100);
	});

	it('deducts when bulk-cold is long-clamped (desired above 48 h ceiling)', () => {
		const i = inputs({
			startAt: new Date('2026-05-10T07:00:00Z'),
			readyBy: new Date('2026-05-15T19:00:00Z')
		});
		const s = computeSchedule(i);
		const fit = recipeFitScore(s, i);
		expect(factorKinds(fit.factors)).toContain('cold-bulk-clamped-long');
	});

	it('deducts when the pre-ferment is short-clamped (32 °C biga)', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			roomTempC: 32,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const s = computeSchedule(i);
		const fit = recipeFitScore(s, i);
		expect(factorKinds(fit.factors)).toContain('preferment-clamped-short');
	});

	it('deducts once per clamped pre-ferment — the factor appears twice with biga + poolish', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			roomTempC: 32,
			preFerments: [
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			]
		});
		const s = computeSchedule(i);
		const fit = recipeFitScore(s, i);
		const shortClamps = fit.factors.filter((f) => f.factor === 'preferment-clamped-short');
		expect(shortClamps).toHaveLength(2);
		// Biga's natural duration is farther below the floor than poolish's, so
		// its delta must be strictly larger — each entry carries its own gap.
		expect(shortClamps[0].delta).not.toBeCloseTo(shortClamps[1].delta, 6);
	});

	it('ignores sub-minute pre-ferment band overshoots (noise floor)', () => {
		// A natural duration a fraction of a minute outside the [8, 24] h band
		// is rounding noise — it must not emit a ≈ 0.001 h factor row. Same
		// synthetic-schedule trick as the low-yeast test: keep the real steps,
		// override the natural durations.
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const s = computeSchedule(i);
		const tinyHours = 0.5 / 60;
		const overLong: ComputedSchedule = {
			...s,
			naturalPreferments: [{ type: 'biga', naturalHours: PREFERMENT_MAX_HOURS + tinyHours }]
		};
		expect(factorKinds(recipeFitScore(overLong, i).factors)).not.toContain(
			'preferment-clamped-long'
		);
		const overShort: ComputedSchedule = {
			...s,
			naturalPreferments: [{ type: 'biga', naturalHours: PREFERMENT_MIN_HOURS - tinyHours }]
		};
		expect(factorKinds(recipeFitScore(overShort, i).factors)).not.toContain(
			'preferment-clamped-short'
		);
	});

	it('deducts when the pre-ferment is long-clamped (10 °C biga)', () => {
		const i = inputs({
			startAt: new Date('2026-05-10T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			roomTempC: 10,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const s = computeSchedule(i);
		const fit = recipeFitScore(s, i);
		expect(factorKinds(fit.factors)).toContain('preferment-clamped-long');
	});

	it('deducts the full night-step penalty when the warning is present', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const fit = recipeFitScore(withWarnings(s, ['night-step']), i);
		expect(factorKinds(fit.factors)).toContain('night-step');
		// Night-step alone deducts 20 → score = 80 (4 stars).
		expect(fit.score).toBe(80);
	});

	it('deducts the infeasibility penalty when the schedule is too short to ferment', () => {
		const i = inputs({
			startAt: new Date('2026-05-12T18:30:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const s = computeSchedule(i);
		expect(s.feasible).toBe(false);
		const fit = recipeFitScore(s, i);
		expect(factorKinds(fit.factors)).toContain('infeasible');
	});
});

describe('recipeFitScore — recipe-input KPI deviations', () => {
	it.each([
		{ field: 'hydration', value: 55, expected: 'hydration-off' as const },
		{ field: 'hydration', value: 88, expected: 'hydration-off' as const },
		{ field: 'saltPercent', value: 5, expected: 'salt-off' as const },
		{ field: 'ballWeight', value: 150, expected: 'ball-weight-off' as const },
		{ field: 'ballWeight', value: 450, expected: 'ball-weight-off' as const },
		{ field: 'roomTempC', value: 10, expected: 'room-temp-off' as const },
		{ field: 'roomTempC', value: 34, expected: 'room-temp-off' as const },
		{ field: 'fridgeTempC', value: 12, expected: 'fridge-temp-off' as const }
	])('$field=$value flags $expected', ({ field, value, expected }) => {
		const i = inputs({ [field]: value } as Partial<DoughInputs>);
		expect(factorKinds(recipeFitScore(computeSchedule(i), i).factors)).toContain(expected);
	});

	it('returns the band-distance as the delta for hydration', () => {
		const i = inputs({ hydration: 85 });
		const fit = recipeFitScore(computeSchedule(i), i);
		const f = fit.factors.find((x) => x.factor === 'hydration-off')!;
		expect(f.delta).toBe(5);
	});

	it('deducts when solved yeast lands outside the typical [0.05, 1.5] % band', () => {
		// Very cold kitchen + short window pushes solved yeast above 1.5 %.
		const i = inputs({
			roomTempC: 5,
			startAt: new Date('2026-05-12T16:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const fit = recipeFitScore(computeSchedule(i), i);
		expect(factorKinds(fit.factors)).toContain('yeast-extreme');
	});

	it('also flags the symmetric low-yeast case via a synthetic schedule', () => {
		const i = inputs();
		const s = computeSchedule(i);
		const fit = recipeFitScore({ ...s, yeastPercent: 0.01 }, i);
		expect(factorKinds(fit.factors)).toContain('yeast-extreme');
	});

	it('judges the yeast band in fresh-equivalent terms — a normal sourdough is not extreme', () => {
		// A ~20% starter equals ~0.2% fresh yeast: squarely inside the band.
		// Before the fresh-equivalent conversion every sourdough recipe was
		// flagged extreme because its raw percent sits far above 1.5.
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			yeastType: 'sourdough'
		});
		const s = computeSchedule(i);
		expect(s.yeastPercent).toBeGreaterThan(1.5);
		expect(factorKinds(recipeFitScore(s, i).factors)).not.toContain('yeast-extreme');
	});

	it('does not flag instant dry yeast for its smaller gram scale', () => {
		const i = inputs({
			startAt: new Date('2026-05-11T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			yeastType: 'instant'
		});
		const s = computeSchedule(i);
		expect(factorKinds(recipeFitScore(s, i).factors)).not.toContain('yeast-extreme');
	});

	it('caps each factor at its per-factor max so one extreme value cannot pin the score to 0', () => {
		// 1 kg dough balls (huge): grams-out-of-band = 680. At 0.1 pts/g
		// uncapped that would be -68; the cap clamps to -8. Ball weight is the
		// only factor a 6 h room-mode default trips, so the cap is the whole
		// deduction and the score is exact — a range here left the cap free to
		// move without failing anything.
		const i = inputs({ ballWeight: 1000 });
		const fit = recipeFitScore(computeSchedule(i), i);
		expect(factorKinds(fit.factors)).toEqual(['ball-weight-off']);
		expect(fit.score).toBe(92);
	});

	it('floors the score at 0 when every penalty stacks', () => {
		const i = inputs({
			hydration: 100,
			saltPercent: 0,
			ballWeight: 1000,
			roomTempC: 40,
			fridgeTempC: 20,
			startAt: new Date('2026-05-12T18:30:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		});
		const fit = recipeFitScore(computeSchedule(i), i);
		// 10 + 8 + 8 + 8 + 8 (capped KPIs) + 60 (infeasible) + 8 (yeast-extreme)
		// = 110 points of deduction against a 100-point scale.
		expect(fit.score).toBe(0);
	});
});

// What each factor COSTS, not merely that it fires. Every rate and per-factor
// cap in quality.ts could be doubled without a single test failing: the suite
// pinned which factors appear and left the arithmetic — the thing the user
// actually sees, as stars — completely free. The deltas below are chosen so
// exactly one factor is in play, so each expectation is that factor's rate.
describe('recipeFitScore — the deduction table', () => {
	// A 6 h room-mode default scores 100 with no factors, so a single overridden
	// KPI turns the score into "100 − that factor's deduction" and nothing else.
	it.each([
		// hydration: 1 point per percentage point outside 60–80, capped at 10.
		{ label: 'hydration 85 %', overrides: { hydration: 85 }, factor: 'hydration-off', score: 95 },
		{
			label: 'hydration 100 % (capped)',
			overrides: { hydration: 100 },
			factor: 'hydration-off',
			score: 90
		},
		// salt: 4 points per percentage point outside 2–3.5, capped at 10.
		{ label: 'salt 5 %', overrides: { saltPercent: 5 }, factor: 'salt-off', score: 94 },
		{ label: 'salt 7 % (capped)', overrides: { saltPercent: 7 }, factor: 'salt-off', score: 90 },
		// ball weight: 0.1 points per gram outside 200–320, capped at 8.
		{
			label: 'ball weight 350 g',
			overrides: { ballWeight: 350 },
			factor: 'ball-weight-off',
			score: 97
		},
		// fridge temperature: 1.5 points per degree outside 2–8, capped at 8.
		// Inert in the room-mode solve, so it isolates cleanly.
		{ label: 'fridge 12 °C', overrides: { fridgeTempC: 12 }, factor: 'fridge-temp-off', score: 94 },
		{
			label: 'fridge 20 °C (capped)',
			overrides: { fridgeTempC: 20 },
			factor: 'fridge-temp-off',
			score: 92
		},
		// room temperature: 1.5 points per degree outside 14–30, capped at 8.
		{ label: 'room 10 °C', overrides: { roomTempC: 10 }, factor: 'room-temp-off', score: 94 },
		{
			label: 'room 40 °C (capped)',
			overrides: { roomTempC: 40 },
			factor: 'room-temp-off',
			score: 92
		}
	] as const)('$label → $score', ({ overrides, factor, score }) => {
		const i = inputs(overrides as Partial<DoughInputs>);
		const fit = recipeFitScore(computeSchedule(i), i);
		expect(factorKinds(fit.factors)).toEqual([factor]);
		expect(fit.score).toBe(score);
	});

	// The schedule-imperfection factors need a schedule that actually deviated,
	// which is easier to state exactly by overriding the pre-shift/pre-clamp
	// signals on a clean one — the same synthetic-schedule trick the noise-floor
	// and low-yeast tests use.
	const coldWindow = {
		startAt: new Date('2026-05-11T19:00:00Z'),
		readyBy: new Date('2026-05-12T19:00:00Z')
	};

	function cleanCold(): { i: DoughInputs; s: ComputedSchedule } {
		const i = inputs(coldWindow);
		const s = computeSchedule(i);
		// Precondition: nothing is deviating yet, so every delta below is the
		// override's alone.
		expect(recipeFitScore(s, i).factors).toEqual([]);
		return { i, s };
	}

	it('charges 3 points per hour of night-shifted cold bulk, capped at 20', () => {
		const { i, s } = cleanCold();
		const actual = s.steps.find((st) => st.kind === 'bulk-cold')!.durationMinutes;
		const shifted = (byMin: number) => ({ ...s, naturalColdBulkMin: actual + byMin });
		expect(recipeFitScore(shifted(120), i).score).toBe(94);
		expect(recipeFitScore(shifted(300), i).score).toBe(85);
		// 60 h of shift would be 180 points uncapped.
		expect(recipeFitScore(shifted(60 * 60), i).score).toBe(80);
	});

	it('charges 4 points per hour of clamped cold bulk, capped at 20', () => {
		const { i, s } = cleanCold();
		// desiredColdBulkMin drives the clamp factors; naturalColdBulkMin is left
		// alone so the shift factor stays quiet.
		const short = { ...s, desiredColdBulkMin: COLD_BULK_FLOOR_MIN - 120 };
		expect(factorKinds(recipeFitScore(short, i).factors)).toEqual(['cold-bulk-clamped-short']);
		expect(recipeFitScore(short, i).score).toBe(92);

		const long = { ...s, desiredColdBulkMin: COLD_BULK_CEIL_MIN + 180 };
		expect(factorKinds(recipeFitScore(long, i).factors)).toEqual(['cold-bulk-clamped-long']);
		expect(recipeFitScore(long, i).score).toBe(88);

		const wayLong = { ...s, desiredColdBulkMin: COLD_BULK_CEIL_MIN + 60 * 60 };
		expect(recipeFitScore(wayLong, i).score).toBe(80);
	});

	it('charges the same 4 points per hour for a clamped pre-ferment', () => {
		const i = inputs({ ...coldWindow, preFerments: [{ type: 'biga', flourPercent: 30 }] });
		const s = computeSchedule(i);
		expect(recipeFitScore(s, i).factors).toEqual([]);

		const overLong = {
			...s,
			naturalPreferments: [{ type: 'biga' as const, naturalHours: PREFERMENT_MAX_HOURS + 3 }]
		};
		expect(recipeFitScore(overLong, i).score).toBe(88);

		const overShort = {
			...s,
			naturalPreferments: [{ type: 'biga' as const, naturalHours: PREFERMENT_MIN_HOURS - 2 }]
		};
		expect(recipeFitScore(overShort, i).score).toBe(92);
	});

	it('charges 20 for a residual night step, 60 for infeasibility and 8 for extreme yeast', () => {
		const { i, s } = cleanCold();
		expect(recipeFitScore({ ...s, warnings: ['night-step'] }, i).score).toBe(80);
		expect(recipeFitScore({ ...s, feasible: false }, i).score).toBe(40);
		expect(recipeFitScore({ ...s, yeastPercent: 0.01 }, i).score).toBe(92);
	});

	// The promise CLAUDE.md makes about the rates: generous enough that one
	// moderate deviation still reads as five stars, and only stacked problems
	// fall below four.
	it('keeps a single moderate deviation at five stars', () => {
		for (const overrides of [
			{ hydration: 82 },
			{ saltPercent: 4 },
			{ ballWeight: 340 },
			{ roomTempC: 32 },
			{ fridgeTempC: 10 }
		]) {
			const i = inputs(overrides as Partial<DoughInputs>);
			expect(fitStars(recipeFitScore(computeSchedule(i), i).score), JSON.stringify(overrides)).toBe(
				5
			);
		}
	});

	it('drops below four stars only once problems stack', () => {
		const i = inputs({ hydration: 95, saltPercent: 5, ballWeight: 450, roomTempC: 36 });
		expect(fitStars(recipeFitScore(computeSchedule(i), i).score)).toBeLessThan(4);
	});
});

describe('fitStars', () => {
	it.each([
		{ score: 100, stars: 5 },
		{ score: 90, stars: 5 },
		{ score: 80, stars: 4 },
		{ score: 55, stars: 3 },
		{ score: 20, stars: 1 },
		{ score: 0, stars: 0 }
	])('maps a score of $score to $stars stars', ({ score, stars }) => {
		expect(fitStars(score)).toBe(stars);
	});
});

describe('recipeFitScore — flour-window-off', () => {
	// A 24 h cold window, which Caputo Pizzeria (W 265, band 16-40 h) covers.
	const window24h = {
		startAt: new Date('2026-05-11T19:00:00Z'),
		readyBy: new Date('2026-05-12T19:00:00Z')
	};

	function score(overrides: Partial<DoughInputs>) {
		const i = inputs({ ...window24h, ...overrides });
		return recipeFitScore(computeSchedule(i), i);
	}

	it('does not fire when the window is inside the flour band', () => {
		expect(factorKinds(score({ flourW: 265 }).factors)).not.toContain('flour-window-off');
	});

	it('does not fire when no flour is stated', () => {
		expect(factorKinds(score({ flourW: null }).factors)).not.toContain('flour-window-off');
	});

	it('fires with the hours outside the band as its delta', () => {
		const fit = score({ flourW: 180 });
		const factor = fit.factors.find((f) => f.factor === 'flour-window-off');
		// Supermarket 00 tolerates 12 h cold; the window is 24 h.
		expect(factor?.delta).toBeCloseTo(12, 6);
	});

	it('deducts 1.5 points per hour outside the band', () => {
		// 44 h window against Caputo Pizzeria's 16-40 h cold band = 4 h over.
		// Comparing against the same window with no flour isolates the factor
		// from whatever else a 44 h schedule costs.
		const long44h = {
			startAt: new Date('2026-05-10T23:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		};
		const withFlour = score({ ...long44h, flourW: 265 });
		const withoutFlour = score({ ...long44h, flourW: null });
		expect(withoutFlour.score - withFlour.score).toBe(Math.round(4 * 1.5));
	});

	it('caps the deduction so one wrong flour cannot sink the score alone', () => {
		// A 4 d window on the weakest flour runs ~84 h past the band; uncapped
		// that would be 126 points, which would zero the score by itself.
		const veryLong = {
			startAt: new Date('2026-05-08T19:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z')
		};
		const withFlour = score({ ...veryLong, flourW: 150 });
		const withoutFlour = score({ ...veryLong, flourW: null });
		expect(withoutFlour.score - withFlour.score).toBe(12);
	});

	it('keeps a default Caputo recipe at a full five stars', () => {
		expect(fitStars(score({ flourW: 265 }).score)).toBe(5);
	});
});
