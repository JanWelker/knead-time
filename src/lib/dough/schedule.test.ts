import { describe, expect, it } from 'vitest';
import { prefermentDurationHours } from './fermentation';
import {
	ACTIVE_NIGHT_KINDS,
	computeSchedule,
	COLD_MODE_THRESHOLD_MIN,
	NIGHT_END_HOUR,
	NIGHT_START_HOUR,
	ROOM_MIN_TOTAL_MIN
} from './schedule';
import { defaultInputs, findStep } from './testFixtures';
import type { DoughInputs } from './types';

function inDayWindow(d: Date): boolean {
	const h = d.getHours();
	return h >= NIGHT_END_HOUR && h < NIGHT_START_HOUR;
}

// Schedule tests run a 4-pizza recipe so the totalDough invariant is easy
// to eyeball in failures (4 × 280 = 1120). Other dough-side suites use the
// 6-pizza default from testFixtures.
function baseInputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return defaultInputs({ pizzaCount: 4, ...overrides });
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

describe('computeSchedule — mixing method', () => {
	it('gives the mix step 15 min on the machine and 25 min by hand', () => {
		expect(findStep(computeSchedule(baseInputs()), 'mix').durationMinutes).toBe(15);
		expect(
			findStep(computeSchedule(baseInputs({ mixingMethod: 'hand' })), 'mix').durationMinutes
		).toBe(25);
	});

	it('keeps the schedule anchored to readyBy — hand mixing eats ferment time, not bake time', () => {
		const machine = computeSchedule(baseInputs());
		const hand = computeSchedule(baseInputs({ mixingMethod: 'hand' }));
		expect(findStep(hand, 'ready').at.getTime()).toBe(findStep(machine, 'ready').at.getTime());
		// The 10 extra mix minutes come out of the room-ferment budget, so the
		// yeast solve sees slightly fewer hours and lands slightly higher.
		expect(hand.yeastPercent).toBeGreaterThan(machine.yeastPercent);
	});

	it('recommends warmer water for hand kneading', () => {
		const machine = computeSchedule(baseInputs());
		const hand = computeSchedule(baseInputs({ mixingMethod: 'hand' }));
		expect(hand.idealWaterTempC).toBeGreaterThan(machine.idealWaterTempC);
		expect(hand.mixingMethod).toBe('hand');
		expect(machine.mixingMethod).toBe('machine');
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
	it('prepends preferment-mix at biga reference duration before prep (14 h @ 22°C)', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		expect(r.steps[0].kind).toBe('preferment-mix');
		const prepStep = findStep(r, 'prep');
		const diffMin = (prepStep.at.getTime() - r.steps[0].at.getTime()) / 60_000;
		const expected = prefermentDurationHours('biga', 22) * 60;
		expect(diffMin).toBeCloseTo(expected, 0);
	});

	it('shortens the pre-ferment in a warmer kitchen and lengthens it in a cooler one', () => {
		const warm = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				roomTempC: 26,
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const cool = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				roomTempC: 18,
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const durOf = (sched: typeof warm) => findStep(sched, 'preferment-mix').durationMinutes;
		expect(durOf(cool)).toBeGreaterThan(durOf(warm));
	});

	it('does not emit a preferment-mix when no pre-ferment is selected', () => {
		const r = computeSchedule(baseInputs({ preFerment: null }));
		expect(r.steps.some((s) => s.kind === 'preferment-mix')).toBe(false);
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
			if (!ACTIVE_NIGHT_KINDS.has(s.kind)) continue;
			expect(inDayWindow(s.at), `${s.kind} at ${s.at.toISOString()} fell in the night`).toBe(true);
		}
		expect(r.warnings).not.toContain('night-step');
	});

	it('shifts cold-mode prep out of the night with a preferment', () => {
		// Natural schedule: prep at Mon 19:00 UTC, but preferment-mix lands ~14 h
		// earlier and could fall in the night window. Adjuster must push the
		// cluster so both prep and preferment-mix sit in daytime.
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-10T19:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		expect(r.mode).toBe('cold');
		for (const s of r.steps) {
			if (!ACTIVE_NIGHT_KINDS.has(s.kind)) continue;
			expect(inDayWindow(s.at), `${s.kind} at ${s.at.toISOString()} fell in the night`).toBe(true);
		}
		expect(r.warnings).not.toContain('night-step');
		// Adjuster shifts coldMin (the whole cluster), not the preferment offset —
		// preferment-mix is still exactly its reference duration before prep.
		const preferment = findStep(r, 'preferment-mix');
		const prep = findStep(r, 'prep');
		const diffMin = (prep.at.getTime() - preferment.at.getTime()) / 60_000;
		expect(diffMin).toBeCloseTo(prefermentDurationHours('biga', 22) * 60, 0);
	});

	it('keeps the schedule ending exactly at readyBy after night avoidance', () => {
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const r = computeSchedule(baseInputs({ startAt: new Date('2026-05-11T07:00:00Z'), readyBy }));
		const last = r.steps[r.steps.length - 1];
		expect(last.kind).toBe('ready');
		expect(last.at.getTime()).toBe(readyBy.getTime());
	});

	it('emits night-step warning when readyBy forces divide into the night', () => {
		// readyBy at 11:00 → final-proof at 07:00, divide at 06:45 — divide is
		// anchored to readyBy via the merged 4 h final-proof and can't be moved.
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
});

describe('computeSchedule — cold-mode threshold boundary', () => {
	it.each([
		{ offsetMin: -1, expected: 'room' as const },
		{ offsetMin: +1, expected: 'cold' as const }
	])('window $offsetMin min from threshold → $expected', ({ offsetMin, expected }) => {
		const startAt = new Date('2026-05-12T03:00:00Z');
		const readyBy = new Date(startAt.getTime() + (COLD_MODE_THRESHOLD_MIN + offsetMin) * 60_000);
		expect(computeSchedule(baseInputs({ startAt, readyBy })).mode).toBe(expected);
	});
});

describe('computeSchedule — sourdough ignores pre-ferment', () => {
	it('drops biga/poolish under sourdough — the starter is the pre-ferment', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				yeastType: 'sourdough',
				starterHydration: 100,
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		expect(r.ingredients.preFerment).toBeNull();
		expect(r.steps.some((s) => s.kind === 'preferment-mix')).toBe(false);
	});

	it('keeps the sourdough mass-balance invariant when a pre-ferment is set but ignored', () => {
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
		// Sourdough starter is flour + water already accounted for in the
		// flour/water budget — re-adding the 'yeast' field would double-count.
		const sum = ing.flour + ing.water + ing.salt + ing.yeast;
		expect(sum).toBeCloseTo(ing.totalDough, 6);
		expect(ing.totalDough).toBe(4 * 280);
	});
});

describe('computeSchedule — room mode with pre-ferment', () => {
	it('places preferment-mix at poolish reference duration before prep (12 h @ 22°C)', () => {
		// 18 h total window — long enough to fit poolish + minimum room ferment.
		const startAt = new Date('2026-05-11T01:00:00Z');
		const readyBy = new Date('2026-05-11T19:00:00Z');
		const r = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'poolish', flourPercent: 30 } })
		);
		expect(r.mode).toBe('room');
		const preferment = findStep(r, 'preferment-mix');
		const prep = findStep(r, 'prep');
		expect(preferment).toBeDefined();
		expect(prep).toBeDefined();
		const diffMin = (prep.at.getTime() - preferment.at.getTime()) / 60_000;
		expect(diffMin).toBeCloseTo(prefermentDurationHours('poolish', 22) * 60, 0);
	});
});

describe('computeSchedule — pre-ferment carries all the yeast', () => {
	it('puts the full yeast mass in the pre-ferment and zeroes the main-dough yeast', () => {
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		expect(r.ingredients.yeast).toBe(0);
		expect(r.ingredients.preFerment!.yeast).toBeGreaterThan(0);
	});

	it('uses less yeast overall with a pre-ferment than without (the pre-ferment phase adds equivalent-hours)', () => {
		const startAt = new Date('2026-05-11T07:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const direct = computeSchedule(baseInputs({ startAt, readyBy }));
		const withBiga = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'biga', flourPercent: 30 } })
		);
		expect(withBiga.yeastPercent).toBeLessThan(direct.yeastPercent);
	});
});

describe('computeSchedule — temperature warnings', () => {
	it.each([
		{ roomTempC: 12, contains: 'too-cold', notContains: 'too-warm' },
		{ roomTempC: 32, contains: 'too-warm', notContains: 'too-cold' }
	] as const)(
		'$roomTempC °C → warnings contain $contains',
		({ roomTempC, contains, notContains }) => {
			const r = computeSchedule(baseInputs({ roomTempC }));
			expect(r.warnings).toContain(contains);
			expect(r.warnings).not.toContain(notContains);
		}
	);

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

describe('computeSchedule — startAt is a hard floor (issue #78)', () => {
	function firstStepAt(r: ReturnType<typeof computeSchedule>): Date {
		return r.steps[0].at;
	}

	it('keeps cold-mode prep at or after startAt when desired cold-bulk is below the 12 h floor', () => {
		// 17 h window → desired (~11.25 h) below the 12 h floor. Old behaviour
		// clamped cold-bulk up to 12 h, pulling prep 45 min before startAt.
		const startAt = new Date('2026-05-12T13:00:00Z');
		const readyBy = new Date('2026-05-13T06:00:00Z');
		const r = computeSchedule(baseInputs({ startAt, readyBy }));
		expect(r.mode).toBe('cold');
		expect(firstStepAt(r).getTime()).toBeGreaterThanOrEqual(startAt.getTime());
		expect(r.steps[r.steps.length - 1].at.getTime()).toBe(readyBy.getTime());
	});

	it('keeps preferment-mix at or after startAt for a tight biga window', () => {
		// 31 h window → biga preferment + bake cluster need 19.75 h fixed and
		// leave 11.25 h for cold-bulk, below the 12 h floor. Old behaviour
		// landed preferment-mix 45 min before startAt.
		const startAt = new Date('2026-05-11T11:00:00Z');
		const readyBy = new Date('2026-05-12T18:00:00Z');
		const r = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'biga', flourPercent: 30 } })
		);
		expect(r.mode).toBe('cold');
		expect(r.steps[0].kind).toBe('preferment-mix');
		expect(firstStepAt(r).getTime()).toBeGreaterThanOrEqual(startAt.getTime());
	});

	it('keeps preferment-mix at or after startAt for a tight poolish window', () => {
		const startAt = new Date('2026-05-11T11:00:00Z');
		const readyBy = new Date('2026-05-12T16:00:00Z');
		const r = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'poolish', flourPercent: 30 } })
		);
		expect(r.steps[0].kind).toBe('preferment-mix');
		expect(firstStepAt(r).getTime()).toBeGreaterThanOrEqual(startAt.getTime());
	});

	it('keeps room-mode prep at or after startAt when the window is below the 3 h soft minimum', () => {
		const startAt = new Date('2026-05-12T17:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const r = computeSchedule(baseInputs({ startAt, readyBy }));
		expect(r.mode).toBe('room');
		expect(firstStepAt(r).getTime()).toBeGreaterThanOrEqual(startAt.getTime());
	});

	it('shrinks the pre-ferment when it alone exceeds a tight room-mode window', () => {
		// 10 h window with biga (14 h natural at 22 °C). Room mode (10 h < 16 h
		// threshold after pref). Pre-ferment must shrink so first step >= startAt.
		const startAt = new Date('2026-05-12T08:00:00Z');
		const readyBy = new Date('2026-05-12T18:00:00Z');
		const r = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'biga', flourPercent: 30 } })
		);
		expect(r.mode).toBe('room');
		const pf = findStep(r, 'preferment-mix');
		expect(pf.durationMinutes).toBeLessThan(14 * 60);
		expect(firstStepAt(r).getTime()).toBeGreaterThanOrEqual(startAt.getTime());
	});

	it('returns 0 yeast percent (not Infinity) when the window is too short to ferment', () => {
		// 30 min window → bulk and final-proof both shrink to 0; guard against
		// dividing by 0 equivalent-hours in the yeast solve.
		const r = computeSchedule(
			baseInputs({
				startAt: new Date('2026-05-12T18:30:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		expect(r.feasible).toBe(false);
		expect(Number.isFinite(r.yeastPercent)).toBe(true);
		expect(r.yeastPercent).toBe(0);
	});

	it('night-window adjuster never extends cold-bulk past natural (would push start before startAt)', () => {
		// Same scenario as the existing night-shift test but tighter. The
		// adjuster used to be able to extend cold-bulk upward (back-shifting
		// the cluster to previous-day daytime); under the new contract it can
		// only shrink, so the first step never lands before startAt even when
		// the cluster has to be shortened to dodge night.
		const startAt = new Date('2026-05-12T01:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const r = computeSchedule(baseInputs({ startAt, readyBy }));
		expect(r.mode).toBe('cold');
		const bulkCold = findStep(r, 'bulk-cold');
		expect(bulkCold.durationMinutes).toBeLessThanOrEqual(r.naturalColdBulkMin!);
		expect(firstStepAt(r).getTime()).toBeGreaterThanOrEqual(startAt.getTime());
	});

	it('night-window adjuster falls back to naturalColdMin when no candidate clears night', () => {
		// 31 h window + biga ⇒ naturalColdMin ≈ 11.25 h. Every cm in [0, 11.25 h]
		// puts prefermentMix in the 22:00–08:00 window (would need cm ≥ 14.25 h
		// to lift prep into 08:00–12:00 daytime, but that's above natural and
		// the contract forbids extending). Adjuster returns naturalColdMin and
		// the night-step warning fires.
		const startAt = new Date('2026-05-12T01:00:00Z');
		const readyBy = new Date('2026-05-13T08:00:00Z');
		const r = computeSchedule(
			baseInputs({ startAt, readyBy, preFerment: { type: 'biga', flourPercent: 30 } })
		);
		expect(r.mode).toBe('cold');
		expect(r.warnings).toContain('night-step');
		expect(firstStepAt(r).getTime()).toBeGreaterThanOrEqual(startAt.getTime());
		const bulkCold = findStep(r, 'bulk-cold');
		expect(bulkCold.durationMinutes).toBe(r.naturalColdBulkMin);
	});
});

describe('computeSchedule — fridge temperature', () => {
	it('uses less yeast when the fridge runs warmer (more fermentation during cold-bulk)', () => {
		const startAt = new Date('2026-05-11T07:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const cold = computeSchedule(baseInputs({ startAt, readyBy, fridgeTempC: 2 }));
		const warm = computeSchedule(baseInputs({ startAt, readyBy, fridgeTempC: 8 }));
		expect(cold.mode).toBe('cold');
		expect(warm.mode).toBe('cold');
		expect(warm.yeastPercent).toBeLessThan(cold.yeastPercent);
	});

	it('does not affect yeast % in room mode (no cold-bulk phase)', () => {
		const startAt = new Date('2026-05-12T13:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const cold = computeSchedule(baseInputs({ startAt, readyBy, fridgeTempC: 2 }));
		const warm = computeSchedule(baseInputs({ startAt, readyBy, fridgeTempC: 8 }));
		expect(cold.mode).toBe('room');
		expect(warm.yeastPercent).toBeCloseTo(cold.yeastPercent, 10);
	});
});
