import { describe, expect, it } from 'vitest';
import { recipeFitScore, stepQualityFlags, type FitFactor } from './quality';
import { computeSchedule } from './schedule';
import type { ComputedSchedule, DoughInputs, ScheduleStep, ScheduleWarning } from './types';

// Default inputs are a 6 h room-mode window that lands cleanly in daytime —
// no cold mode (no shift / no clamp possible), no pre-ferment, no night
// warning, every KPI in the contemporary Neapolitan band → 100 score.
// Each test overrides only the field it's exercising.
function inputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return {
		readyBy: new Date('2026-05-12T19:00:00Z'),
		startAt: new Date('2026-05-12T13:00:00Z'),
		pizzaCount: 6,
		ballWeight: 280,
		hydration: 70,
		saltPercent: 3,
		yeastType: 'fresh',
		starterHydration: 100,
		roomTempC: 22,
		fridgeTempC: 4,
		preFerment: null,
		...overrides
	};
}

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
			preFerment: { type: 'biga', flourPercent: 30 }
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
			preFerment: { type: 'biga', flourPercent: 30 }
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
			preFerment: { type: 'biga', flourPercent: 30 }
		});
		const s = computeSchedule(i);
		const pf = s.steps.find((st) => st.kind === 'preferment-mix')!;
		expect(stepQualityFlags(pf, s)).toContain('preferment-clamped-long');
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
			preFerment: { type: 'biga', flourPercent: 30 }
		});
		const s = computeSchedule(i);
		const fit = recipeFitScore(s, i);
		expect(factorKinds(fit.factors)).toContain('preferment-clamped-short');
	});

	it('deducts when the pre-ferment is long-clamped (10 °C biga)', () => {
		const i = inputs({
			startAt: new Date('2026-05-10T07:00:00Z'),
			readyBy: new Date('2026-05-12T19:00:00Z'),
			roomTempC: 10,
			preFerment: { type: 'biga', flourPercent: 30 }
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
		// Night-step alone deducts 30 → score = 70.
		expect(fit.score).toBe(70);
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
	it('deducts for hydration outside [60, 80] %', () => {
		const lowH = inputs({ hydration: 55 });
		const highH = inputs({ hydration: 88 });
		expect(factorKinds(recipeFitScore(computeSchedule(lowH), lowH).factors)).toContain(
			'hydration-off'
		);
		expect(factorKinds(recipeFitScore(computeSchedule(highH), highH).factors)).toContain(
			'hydration-off'
		);
	});

	it('returns the band-distance as the delta for hydration', () => {
		const i = inputs({ hydration: 85 });
		const fit = recipeFitScore(computeSchedule(i), i);
		const f = fit.factors.find((x) => x.factor === 'hydration-off')!;
		expect(f.delta).toBe(5);
	});

	it('deducts for salt outside [2, 3.5] %', () => {
		const i = inputs({ saltPercent: 5 });
		expect(factorKinds(recipeFitScore(computeSchedule(i), i).factors)).toContain('salt-off');
	});

	it('deducts for ball weight outside [200, 320] g', () => {
		const tiny = inputs({ ballWeight: 150 });
		const huge = inputs({ ballWeight: 450 });
		expect(factorKinds(recipeFitScore(computeSchedule(tiny), tiny).factors)).toContain(
			'ball-weight-off'
		);
		expect(factorKinds(recipeFitScore(computeSchedule(huge), huge).factors)).toContain(
			'ball-weight-off'
		);
	});

	it('deducts for room temperature outside [14, 30] °C', () => {
		const cold = inputs({ roomTempC: 10 });
		const hot = inputs({ roomTempC: 34 });
		expect(factorKinds(recipeFitScore(computeSchedule(cold), cold).factors)).toContain(
			'room-temp-off'
		);
		expect(factorKinds(recipeFitScore(computeSchedule(hot), hot).factors)).toContain(
			'room-temp-off'
		);
	});

	it('deducts for fridge temperature outside [2, 8] °C', () => {
		const warm = inputs({ fridgeTempC: 12 });
		expect(factorKinds(recipeFitScore(computeSchedule(warm), warm).factors)).toContain(
			'fridge-temp-off'
		);
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

	it('caps each factor at its per-factor max so one extreme value cannot pin the score to 0', () => {
		// 1 kg dough balls (huge): grams-out-of-band = 680. At 0.2 pts/g
		// uncapped that would be -136; the cap clamps to -10.
		const i = inputs({ ballWeight: 1000 });
		const fit = recipeFitScore(computeSchedule(i), i);
		// At least 100 - 10 (the cap). Other factors may apply on top.
		expect(fit.score).toBeGreaterThanOrEqual(90 - 50);
		expect(fit.score).toBeLessThanOrEqual(90);
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
