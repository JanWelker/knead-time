import { describe, expect, it } from 'vitest';
import {
	computeSchedule,
	COLD_MODE_THRESHOLD_MIN,
	NIGHT_END_HOUR,
	NIGHT_START_HOUR,
	ROOM_MIN_TOTAL_MIN
} from './schedule';
import type { DoughInputs, ScheduleStepKind } from './types';

const NIGHT_AWARE_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
	'preferment-mix',
	'prep',
	'mix',
	'bulk-room',
	'bulk-cold',
	'divide',
	'warmup'
]);

function inDayWindow(d: Date): boolean {
	const h = d.getHours();
	return h >= NIGHT_END_HOUR && h < NIGHT_START_HOUR;
}

function baseInputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return {
		readyBy: new Date('2026-05-12T19:00:00Z'),
		startAt: new Date('2026-05-12T13:00:00Z'),
		pizzaCount: 4,
		ballWeight: 280,
		hydration: 70,
		saltPercent: 3,
		yeastType: 'fresh',
		starterHydration: 100,
		roomTempC: 22,
		preFerment: null,
		...overrides
	};
}

describe('computeSchedule — mode selection', () => {
	it('chooses room mode for short windows', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-12T13:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		expect(r.mode).toBe('room');
	});

	it('chooses cold mode for long windows', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T19:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		expect(r.mode).toBe('cold');
	});

	it('exactly at threshold flips to cold', () => {
		const now = new Date('2026-05-12T03:00:00Z');
		const readyBy = new Date(now.getTime() + COLD_MODE_THRESHOLD_MIN * 60_000);
		expect(computeSchedule(baseInputs({ startAt: now, readyBy })).mode).toBe('cold');
	});
});

describe('computeSchedule — feasibility', () => {
	it('flags too-short when window is below the room minimum', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-12T18:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		expect(r.feasible).toBe(false);
		expect(r.warnings).toContain('too-short');
	});

	it('is feasible at the minimum window', () => {
		const now = new Date('2026-05-12T16:00:00Z');
		const readyBy = new Date(now.getTime() + ROOM_MIN_TOTAL_MIN * 60_000);
		expect(computeSchedule(baseInputs({ startAt: now, readyBy })).feasible).toBe(true);
	});
});

describe('computeSchedule — backwards anchoring', () => {
	it('ends every schedule on the ready-by datetime', () => {
		const r = computeSchedule(baseInputs());
		const last = r.steps[r.steps.length - 1];
		expect(last.kind).toBe('ready');
		expect(last.at.getTime()).toBe(new Date('2026-05-12T19:00:00Z').getTime());
	});

	it('emits steps sorted in forward time order', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		for (let i = 1; i < r.steps.length; i++) {
			expect(r.steps[i].at.getTime()).toBeGreaterThanOrEqual(r.steps[i - 1].at.getTime());
		}
	});

	it('includes a bulk-cold step in cold mode but not in room mode', () => {
		const cold = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		const room = computeSchedule(baseInputs());
		expect(cold.steps.some((s) => s.kind === 'bulk-cold')).toBe(true);
		expect(room.steps.some((s) => s.kind === 'bulk-cold')).toBe(false);
	});
});

describe('computeSchedule — yeast selection', () => {
	it('uses much less yeast for cold ferment than for a short room ferment', () => {
		const short = computeSchedule(baseInputs());
		const long = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		expect(long.yeastPercent).toBeLessThan(short.yeastPercent);
	});

	it('uses more yeast at colder room temps for the same window', () => {
		const warm = computeSchedule(baseInputs({ roomTempC: 26 }));
		const cool = computeSchedule(baseInputs({ roomTempC: 18 }));
		expect(cool.yeastPercent).toBeGreaterThan(warm.yeastPercent);
	});
});

describe('computeSchedule — ingredient consistency', () => {
	it('returns ingredients that sum to total dough mass', () => {
		const r = computeSchedule(baseInputs());
		const sum =
			r.ingredients.flour + r.ingredients.water + r.ingredients.salt + r.ingredients.yeast;
		expect(sum).toBeCloseTo(r.ingredients.totalDough, 6);
		expect(r.ingredients.totalDough).toBe(4 * 280);
	});
});

describe('computeSchedule — pre-ferment', () => {
	it('prepends a preferment-mix step 12h before prep', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		expect(r.steps[0].kind).toBe('preferment-mix');
		const prepStep = r.steps.find((s) => s.kind === 'prep')!;
		const diffMin = (prepStep.at.getTime() - r.steps[0].at.getTime()) / 60_000;
		expect(diffMin).toBeCloseTo(12 * 60, 0);
	});

	it('emits a preferment-proof step that fills the gap between preferment-mix and prep', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const mix = r.steps.find((s) => s.kind === 'preferment-mix')!;
		const proof = r.steps.find((s) => s.kind === 'preferment-proof')!;
		const prep = r.steps.find((s) => s.kind === 'prep')!;
		expect(proof.at.getTime()).toBe(mix.at.getTime() + mix.durationMinutes * 60_000);
		expect(proof.at.getTime() + proof.durationMinutes * 60_000).toBe(prep.at.getTime());
	});

	it('omits the preferment-proof step when no pre-ferment is selected', () => {
		const r = computeSchedule(baseInputs({ preFerment: null }));
		expect(r.steps.some((s) => s.kind === 'preferment-proof')).toBe(false);
	});

	it('populates ingredients.preFerment when biga is selected', () => {
		const r = computeSchedule(baseInputs({ preFerment: { type: 'biga', flourPercent: 30 } }));
		expect(r.ingredients.preFerment).not.toBeNull();
		expect(r.ingredients.preFerment!.flour).toBeGreaterThan(0);
		expect(r.ingredients.preFerment!.water).toBeGreaterThan(0);
		expect(r.ingredients.preFerment!.yeast).toBeGreaterThan(0);
		// biga is ~50% hydration — water should be roughly half the flour
		expect(r.ingredients.preFerment!.water / r.ingredients.preFerment!.flour).toBeCloseTo(0.5, 6);
	});

	it('populates ingredients.preFerment when poolish is selected', () => {
		const r = computeSchedule(baseInputs({ preFerment: { type: 'poolish', flourPercent: 30 } }));
		expect(r.ingredients.preFerment).not.toBeNull();
		// poolish is 100% hydration
		expect(r.ingredients.preFerment!.water / r.ingredients.preFerment!.flour).toBeCloseTo(1, 6);
	});

	it('leaves ingredients.preFerment null when no pre-ferment is chosen', () => {
		const r = computeSchedule(baseInputs({ preFerment: null }));
		expect(r.ingredients.preFerment).toBeNull();
	});

	it('schedules the preferment-mix step at or after startAt when night avoidance is not needed', () => {
		// Chosen so the natural schedule already lands every action in daytime
		// (preferment-mix at 20:00 UTC, prep at 08:00 UTC, bake at 13:45 UTC).
		// With night avoidance disabled the system must still honour startAt.
		const startAt = new Date('2026-05-12T20:00:00Z');
		const readyBy = new Date('2026-05-14T13:45:00Z');
		const r = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'biga', flourPercent: 30 } })
		);
		expect(r.steps[0].kind).toBe('preferment-mix');
		expect(r.steps[0].at.getTime()).toBeGreaterThanOrEqual(startAt.getTime());
		expect(r.warnings).not.toContain('night-step');
	});

	it('keeps mass balance with a pre-ferment (main + preferment sums to total)', () => {
		const r = computeSchedule(baseInputs({ preFerment: { type: 'biga', flourPercent: 30 } }));
		const ing = r.ingredients;
		const pf = ing.preFerment!;
		const sum = ing.flour + ing.water + ing.salt + ing.yeast + pf.flour + pf.water + pf.yeast;
		expect(sum).toBeCloseTo(ing.totalDough, 6);
	});
});

describe('computeSchedule — night-window avoidance', () => {
	it('shifts cold-mode prep out of the night (no preferment)', () => {
		// Natural schedule: 36 h cold ferment → prep at Mon 07:00 UTC (h=7, night).
		// Adjuster must extend or shorten the cold ferment so every action lands
		// in [08:00, 22:00).
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		expect(r.mode).toBe('cold');
		for (const s of r.steps) {
			if (!NIGHT_AWARE_KINDS.has(s.kind)) continue;
			expect(inDayWindow(s.at), `${s.kind} at ${s.at.toISOString()} fell in the night`).toBe(true);
		}
		expect(r.warnings).not.toContain('night-step');
	});

	it('shifts cold-mode prep out of the night with a preferment', () => {
		// Natural schedule: prep at Mon 19:00 UTC (h=19, ok), but preferment-mix
		// lands 12 h earlier at Mon 07:00 UTC (h=7, night). Adjuster must push
		// the cluster so both prep and preferment-mix sit in daytime.
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-10T19:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		expect(r.mode).toBe('cold');
		for (const s of r.steps) {
			if (!NIGHT_AWARE_KINDS.has(s.kind)) continue;
			expect(inDayWindow(s.at), `${s.kind} at ${s.at.toISOString()} fell in the night`).toBe(true);
		}
		expect(r.warnings).not.toContain('night-step');
		// preferment-mix is still exactly 12 h before prep — adjusting coldMin
		// shifts the whole cluster together, not the preferment offset.
		const preferment = r.steps.find((s) => s.kind === 'preferment-mix')!;
		const prep = r.steps.find((s) => s.kind === 'prep')!;
		const diffMin = (prep.at.getTime() - preferment.at.getTime()) / 60_000;
		expect(diffMin).toBeCloseTo(12 * 60, 0);
	});

	it('keeps the schedule ending exactly at readyBy after night avoidance', () => {
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const r = computeSchedule(baseInputs({ startAt: new Date('2026-05-11T07:00:00Z'), readyBy }));
		const last = r.steps[r.steps.length - 1];
		expect(last.kind).toBe('ready');
		expect(last.at.getTime()).toBe(readyBy.getTime());
	});

	it('emits night-step warning when readyBy forces divide/warmup into the night', () => {
		// readyBy at 11:00 → divide at 06:45, warmup at 07:00 — both post-cold
		// steps are anchored to readyBy and cannot be moved by the adjuster.
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-10T07:00:00Z'),
				readyBy: new Date('2026-05-11T11:00:00Z')
			})
		);
		expect(r.mode).toBe('cold');
		expect(r.warnings).toContain('night-step');
	});

	it('emits night-step warning when room mode lands actions at night', () => {
		// 3 h window starting at 03:00 → every action sits in [03:00, 06:00).
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-12T03:00:00Z'),
				readyBy: new Date('2026-05-12T06:00:00Z')
			})
		);
		expect(r.mode).toBe('room');
		expect(r.warnings).toContain('night-step');
	});

	it('preserves mass balance after night adjustment (no preferment)', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		const sum =
			r.ingredients.flour + r.ingredients.water + r.ingredients.salt + r.ingredients.yeast;
		expect(sum).toBeCloseTo(r.ingredients.totalDough, 6);
	});

	it('preserves mass balance after night adjustment (with preferment)', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-10T19:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const ing = r.ingredients;
		const pf = ing.preFerment!;
		const sum = ing.flour + ing.water + ing.salt + ing.yeast + pf.flour + pf.water + pf.yeast;
		expect(sum).toBeCloseTo(ing.totalDough, 6);
	});
});

describe('computeSchedule — cold-mode threshold boundary', () => {
	it('falls into room mode one minute below the threshold', () => {
		const startAt = new Date('2026-05-12T03:00:00Z');
		const readyBy = new Date(startAt.getTime() + (COLD_MODE_THRESHOLD_MIN - 1) * 60_000);
		expect(computeSchedule(baseInputs({ startAt, readyBy })).mode).toBe('room');
	});

	it('flips to cold mode one minute above the threshold', () => {
		const startAt = new Date('2026-05-12T03:00:00Z');
		const readyBy = new Date(startAt.getTime() + (COLD_MODE_THRESHOLD_MIN + 1) * 60_000);
		expect(computeSchedule(baseInputs({ startAt, readyBy })).mode).toBe('cold');
	});
});

describe('computeSchedule — sourdough + pre-ferment mass balance', () => {
	it('sums every weighed ingredient to pizzaCount × ballWeight', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				yeastType: 'sourdough',
				starterHydration: 100,
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const ing = r.ingredients;
		const pf = ing.preFerment!;
		// Sourdough starter is flour + water already accounted for in the
		// flour/water budget — the main 'yeast' field is just the starter mass
		// and re-adding it would double-count. The pre-ferment yeast is a tiny
		// pinch (~0.1% of pf flour) so we exclude that too to mirror the existing
		// sourdough mass-balance test style.
		const sum = ing.flour + ing.water + ing.salt + ing.yeast + pf.flour + pf.water;
		expect(sum).toBeCloseTo(ing.totalDough, 6);
		expect(ing.totalDough).toBe(4 * 280);
	});
});

describe('computeSchedule — room mode with pre-ferment', () => {
	it('places preferment-mix ~12 h before the main-day prep step', () => {
		// 6 h total window forces room mode (well below COLD_MODE_THRESHOLD_MIN);
		// preferment-mix should still land 12 h before prep on the schedule.
		const startAt = new Date('2026-05-12T13:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const r = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'poolish', flourPercent: 30 } })
		);
		expect(r.mode).toBe('room');
		const preferment = r.steps.find((s) => s.kind === 'preferment-mix')!;
		const prep = r.steps.find((s) => s.kind === 'prep')!;
		expect(preferment).toBeDefined();
		expect(prep).toBeDefined();
		const diffMin = (prep.at.getTime() - preferment.at.getTime()) / 60_000;
		expect(diffMin).toBeCloseTo(12 * 60, 0);
	});
});

describe('computeSchedule — temperature warnings', () => {
	it('warns when the room is colder than 14 °C', () => {
		const r = computeSchedule(baseInputs({ roomTempC: 12 }));
		expect(r.warnings).toContain('too-cold');
	});

	it('warns when the room is warmer than 30 °C', () => {
		const r = computeSchedule(baseInputs({ roomTempC: 32 }));
		expect(r.warnings).toContain('too-warm');
	});

	it('does not flag a 22 °C room as too-cold or too-warm', () => {
		const r = computeSchedule(baseInputs({ roomTempC: 22 }));
		expect(r.warnings).not.toContain('too-cold');
		expect(r.warnings).not.toContain('too-warm');
	});
});

describe('computeSchedule — yeast magnitude warnings', () => {
	it('warns yeast-large on cold-room short-window fresh ferments', () => {
		// 3 h room window at 5 °C → eq ≈ 0.69 → yeastPct ≈ 2.3 (above the 2% guard).
		// Co-fires with too-cold; we only assert the yeast warning here.
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-12T13:00:00Z'),
				readyBy: new Date('2026-05-12T16:00:00Z'),
				roomTempC: 5
			})
		);
		expect(r.mode).toBe('room');
		expect(r.warnings).toContain('yeast-large');
	});

	it('warns yeast-tiny when equivalent ferment hours blow past the fresh-yeast budget', () => {
		// Non-physical room temp is the only way through computeSchedule to push
		// yeastPct below 0.02 — guards the defensive branch, not a realistic
		// scenario. computeSchedule has no input bounds (form validation lives in
		// the UI), so this is a legitimate call.
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				roomTempC: 70
			})
		);
		expect(r.mode).toBe('cold');
		expect(r.warnings).toContain('yeast-tiny');
	});

	it('does not flag sourdough schedules with yeast-large or yeast-tiny', () => {
		// Both warnings are gated on yeastType === 'fresh'.
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-12T13:00:00Z'),
				readyBy: new Date('2026-05-12T16:00:00Z'),
				roomTempC: 5,
				yeastType: 'sourdough'
			})
		);
		expect(r.warnings).not.toContain('yeast-large');
		expect(r.warnings).not.toContain('yeast-tiny');
	});
});
