import { describe, expect, it } from 'vitest';
import { RECIPE_DEFAULTS, defaultInputs, toDefaultReadyBy } from './defaults';

describe('RECIPE_DEFAULTS', () => {
	it('matches the documented defaults (280 g / 70% / 3% salt / 0% oil / 0% sugar / spiral)', () => {
		expect(RECIPE_DEFAULTS).toEqual({
			pizzaCount: 6,
			ballWeight: 280,
			hydration: 70,
			saltPercent: 3,
			oilPercent: 0,
			sugarPercent: 0,
			yeastType: 'fresh',
			starterHydration: 100,
			roomTempC: 22,
			fridgeTempC: 4,
			preFermentTempC: null,
			ballProof: 'room',
			mixingMethod: 'spiral'
		});
	});
});

describe('toDefaultReadyBy', () => {
	it('moves the given date to tomorrow 19:00 local, mutating in place', () => {
		const d = new Date(2026, 6, 14, 9, 37, 21, 500);
		const result = toDefaultReadyBy(d);
		expect(result).toBe(d);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(6);
		expect(d.getDate()).toBe(15);
		expect(d.getHours()).toBe(19);
		expect(d.getMinutes()).toBe(0);
		expect(d.getSeconds()).toBe(0);
		expect(d.getMilliseconds()).toBe(0);
	});

	it('rolls over month boundaries', () => {
		const d = toDefaultReadyBy(new Date(2026, 6, 31, 12, 0));
		expect(d.getMonth()).toBe(7);
		expect(d.getDate()).toBe(1);
	});
});

describe('defaultInputs', () => {
	it('anchors startAt at the given now and readyBy at tomorrow 19:00', () => {
		const now = new Date(2026, 6, 14, 9, 30);
		const inputs = defaultInputs(now);
		expect(inputs.startAt.getTime()).toBe(now.getTime());
		expect(inputs.readyBy.getTime()).toBe(new Date(2026, 6, 15, 19, 0, 0, 0).getTime());
	});

	it('does not mutate the passed date', () => {
		const now = new Date(2026, 6, 14, 9, 30);
		const before = now.getTime();
		defaultInputs(now);
		expect(now.getTime()).toBe(before);
	});

	it('spreads the recipe defaults with an empty pre-ferment list', () => {
		const inputs = defaultInputs(new Date(2026, 6, 14));
		expect(inputs).toMatchObject(RECIPE_DEFAULTS);
		expect(inputs.preFerments).toEqual([]);
	});

	it('returns a fresh pre-ferment list per call (no shared mutable state)', () => {
		const a = defaultInputs(new Date(2026, 6, 14));
		const b = defaultInputs(new Date(2026, 6, 14));
		expect(a.preFerments).not.toBe(b.preFerments);
	});

	it('defaults now to the current time', () => {
		const before = Date.now();
		const inputs = defaultInputs();
		const after = Date.now();
		expect(inputs.startAt.getTime()).toBeGreaterThanOrEqual(before);
		expect(inputs.startAt.getTime()).toBeLessThanOrEqual(after);
	});
});
