import { describe, expect, it } from 'vitest';
import { PREFERMENT_MAX_HOURS, PREFERMENT_MIN_HOURS } from './fermentation';
import { fitStars, recipeFitScore, stepQualityFlags, type FitFactor } from './quality';
import { computeSchedule } from './schedule';
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
		// 18 h window with readyBy at 19:00 → natural prepAt at 01:15 (night).
		// The adjuster moves coldMin up to push prepAt into the previous
		// evening. The actual cold-bulk duration > natural.
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
		// uncapped that would be -68; the cap clamps to -8.
		const i = inputs({ ballWeight: 1000 });
		const fit = recipeFitScore(computeSchedule(i), i);
		// At least 100 - 8 (the cap). Other factors may apply on top.
		expect(fit.score).toBeGreaterThanOrEqual(92 - 50);
		expect(fit.score).toBeLessThanOrEqual(92);
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
		expect(fit.score).toBeGreaterThanOrEqual(0);
		expect(fit.score).toBeLessThanOrEqual(50);
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
