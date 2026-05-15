import { describe, expect, it } from 'vitest';
import { recipeFitScore, stepQualityFlags } from './quality';
import { computeSchedule } from './schedule';
import type { ComputedSchedule, DoughInputs, ScheduleStep, ScheduleWarning } from './types';

function inputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return {
		readyBy: new Date('2026-05-13T19:00:00Z'),
		startAt: new Date('2026-05-12T07:00:00Z'),
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
	// Constructs a local-time Date for `atLocalHHMM` (HH:MM on 2026-05-14) so
	// the night-window check (which reads .getHours() in local time) is
	// deterministic regardless of TZ=UTC vs the developer's box.
	const [h, m] = atLocalHHMM.split(':').map(Number);
	return { kind, at: new Date(2026, 4, 14, h, m, 0, 0), durationMinutes };
}

describe('stepQualityFlags — night', () => {
	it('flags a baker-action step starting at 22:00', () => {
		expect(stepQualityFlags(step('mix', '22:00', 15))).toContain('night');
	});

	it('flags a baker-action step starting at 03:00', () => {
		expect(stepQualityFlags(step('prep', '03:00', 15))).toContain('night');
	});

	it('does not flag a baker-action step at 08:00 (window is half-open)', () => {
		expect(stepQualityFlags(step('prep', '08:00', 15))).not.toContain('night');
	});

	it('does not flag a baker-action step at 21:59', () => {
		expect(stepQualityFlags(step('mix', '21:59', 15))).not.toContain('night');
	});

	it('does not flag a passive step at night (final-proof can sit overnight)', () => {
		expect(stepQualityFlags(step('final-proof', '23:00', 240))).not.toContain('night');
	});

	it('does not flag ready at night (it is just a marker)', () => {
		expect(stepQualityFlags(step('ready', '02:00', 0))).not.toContain('night');
	});
});

describe('stepQualityFlags — preferment clamps', () => {
	it('flags preferment-mix at the 8 h floor', () => {
		expect(stepQualityFlags(step('preferment-mix', '07:00', 8 * 60))).toContain('clamped-short');
	});

	it('flags preferment-mix at the 24 h ceiling', () => {
		expect(stepQualityFlags(step('preferment-mix', '07:00', 24 * 60))).toContain('clamped-long');
	});

	it('does not flag preferment-mix at 14 h (the biga reference)', () => {
		const flags = stepQualityFlags(step('preferment-mix', '07:00', 14 * 60));
		expect(flags).not.toContain('clamped-short');
		expect(flags).not.toContain('clamped-long');
	});
});

describe('stepQualityFlags — bulk-cold clamps', () => {
	it('flags bulk-cold at the 12 h floor', () => {
		expect(stepQualityFlags(step('bulk-cold', '07:00', 12 * 60))).toContain('clamped-short');
	});

	it('flags bulk-cold at the 48 h ceiling', () => {
		expect(stepQualityFlags(step('bulk-cold', '07:00', 48 * 60))).toContain('clamped-long');
	});

	it('does not flag bulk-cold at 24 h', () => {
		const flags = stepQualityFlags(step('bulk-cold', '07:00', 24 * 60));
		expect(flags).not.toContain('clamped-short');
		expect(flags).not.toContain('clamped-long');
	});

	it('does not flag a step kind that has no clamp model (mix)', () => {
		// Even a tiny mix-step duration is fine — quality only inspects clamps for
		// the two phases that have wall-clock bounds.
		const flags = stepQualityFlags(step('mix', '10:00', 5));
		expect(flags).not.toContain('clamped-short');
		expect(flags).not.toContain('clamped-long');
	});
});

describe('recipeFitScore', () => {
	function withWarnings(schedule: ComputedSchedule, warnings: ScheduleWarning[]): ComputedSchedule {
		return { ...schedule, warnings };
	}

	it('returns 5 stars and no factors for an unproblematic recipe', () => {
		const s = computeSchedule(inputs());
		const fit = recipeFitScore(s);
		expect(fit.score).toBe(5);
		expect(fit.factors).toEqual([]);
	});

	it('subtracts one star for a night-step warning', () => {
		const s = computeSchedule(inputs());
		const fit = recipeFitScore(withWarnings(s, ['night-step']));
		expect(fit.score).toBe(4);
		expect(fit.factors).toContain('night');
	});

	it('subtracts one star for a clamped preferment', () => {
		// At 32 °C the biga clamps to its 8 h floor.
		const s = computeSchedule(
			inputs({
				roomTempC: 32,
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const fit = recipeFitScore(s);
		expect(fit.factors).toContain('clamp-preferment');
	});

	it('subtracts one star for a long-clamped preferment too', () => {
		// At 10 °C the biga clamps to its 24 h ceiling.
		const s = computeSchedule(
			inputs({
				roomTempC: 10,
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const fit = recipeFitScore(s);
		expect(fit.factors).toContain('clamp-preferment');
	});

	it('subtracts one star for a bulk-cold floor clamp (just over the 16 h cold threshold)', () => {
		// 17 h total → cold mode (>= 16 h) but the bulk-cold leg lands at its
		// 12 h floor. The readyBy is chosen so the resulting prepAt at the floor
		// (~19:15) is in waking hours; otherwise the night-window adjuster
		// would lift the cold leg off the floor and mask the clamp.
		const s = computeSchedule(
			inputs({
				startAt: new Date('2026-05-11T20:00:00Z'),
				readyBy: new Date('2026-05-12T13:00:00Z')
			})
		);
		expect(s.mode).toBe('cold');
		const fit = recipeFitScore(s);
		expect(fit.factors).toContain('clamp-bulk-cold');
	});

	it('subtracts one star for a bulk-cold ceiling clamp on a very long window', () => {
		// 5+ days available → cold leg pushes to its 48 h ceiling.
		const s = computeSchedule(
			inputs({
				startAt: new Date('2026-05-10T07:00:00Z'),
				readyBy: new Date('2026-05-15T19:00:00Z')
			})
		);
		expect(s.mode).toBe('cold');
		const fit = recipeFitScore(s);
		expect(fit.factors).toContain('clamp-bulk-cold');
	});

	it('subtracts one star when solved yeast is extremely high (cold kitchen)', () => {
		// At 5 °C the temperature factor is ~0.31, so a 3 h window solves to a
		// yeast % above the typical band.
		const s = computeSchedule(
			inputs({
				roomTempC: 5,
				startAt: new Date('2026-05-12T16:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		const fit = recipeFitScore(s);
		expect(fit.factors).toContain('extreme-yeast');
	});

	it('subtracts one star when solved yeast is extremely low (very long room ferment)', () => {
		// A real long room-mode window can't push yeast below 0.05 % without
		// also hitting cold mode. Synthesise the corner explicitly.
		const s = computeSchedule(inputs());
		const fit = recipeFitScore({ ...s, yeastPercent: 0.01 });
		expect(fit.factors).toContain('extreme-yeast');
	});

	it('subtracts one star when total fermentation window is too short', () => {
		const s = computeSchedule(
			inputs({
				startAt: new Date('2026-05-12T16:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		const fit = recipeFitScore(s);
		expect(fit.factors).toContain('window');
	});

	it('floors the score at 1 even with many factors', () => {
		// Synthetic worst case: every factor at once.
		const s = computeSchedule(
			inputs({
				startAt: new Date('2026-05-12T16:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		const withNight = withWarnings(s, ['night-step']);
		const fit = recipeFitScore(withNight);
		expect(fit.score).toBe(Math.max(1, 5 - fit.factors.length));
		expect(fit.score).toBeGreaterThanOrEqual(1);
	});

	it('only deducts once for clamp-preferment even if multiple preferment-mix steps somehow exist', () => {
		const s = computeSchedule(inputs());
		const synthetic: ComputedSchedule = {
			...s,
			steps: [
				{ kind: 'preferment-mix', at: new Date(), durationMinutes: 8 * 60 },
				{ kind: 'preferment-mix', at: new Date(), durationMinutes: 8 * 60 }
			]
		};
		const fit = recipeFitScore(synthetic);
		const prefermentFactors = fit.factors.filter((f) => f === 'clamp-preferment');
		expect(prefermentFactors.length).toBe(1);
	});

	it('only deducts once for clamp-bulk-cold even if multiple bulk-cold steps somehow exist', () => {
		const s = computeSchedule(inputs());
		const synthetic: ComputedSchedule = {
			...s,
			steps: [
				{ kind: 'bulk-cold', at: new Date(), durationMinutes: 12 * 60 },
				{ kind: 'bulk-cold', at: new Date(), durationMinutes: 12 * 60 }
			]
		};
		const fit = recipeFitScore(synthetic);
		const bulkFactors = fit.factors.filter((f) => f === 'clamp-bulk-cold');
		expect(bulkFactors.length).toBe(1);
	});

	it('skips the window factor for a degenerate one-step schedule', () => {
		const s = computeSchedule(inputs());
		const synthetic: ComputedSchedule = {
			...s,
			steps: [{ kind: 'ready', at: new Date(), durationMinutes: 0 }]
		};
		const fit = recipeFitScore(synthetic);
		expect(fit.factors).not.toContain('window');
	});
});
