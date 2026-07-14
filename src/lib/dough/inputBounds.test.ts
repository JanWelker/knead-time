import { describe, expect, it } from 'vitest';
import {
	clampInput,
	clampPreFermentShares,
	clampShareInput,
	INPUT_BOUNDS,
	PREFERMENT_SHARE_MAX,
	PREFERMENT_SHARE_MIN
} from './inputBounds';

describe('INPUT_BOUNDS', () => {
	it('pins the bands InputForm.svelte enforces via min/max attributes', () => {
		// Changing a band here without changing the form (or vice versa) breaks
		// the "both entry points agree" contract — this test is the tripwire.
		expect(INPUT_BOUNDS).toEqual({
			pizzaCount: { min: 1, max: 100 },
			ballWeight: { min: 100, max: 600 },
			hydration: { min: 50, max: 90 },
			saltPercent: { min: 0, max: 5 },
			oilPercent: { min: 0, max: 15 },
			sugarPercent: { min: 0, max: 5 },
			starterHydration: { min: 40, max: 150 },
			roomTempC: { min: 10, max: 35 },
			fridgeTempC: { min: 0, max: 12 },
			preFermentTempC: { min: 4, max: 35 }
		});
		expect(PREFERMENT_SHARE_MIN).toBe(5);
		expect(PREFERMENT_SHARE_MAX).toBe(80);
	});
});

describe('clampInput', () => {
	it('passes in-band values through unchanged', () => {
		expect(clampInput('pizzaCount', 6)).toBe(6);
		expect(clampInput('ballWeight', 288.5)).toBe(288.5);
		expect(clampInput('saltPercent', 0)).toBe(0);
		expect(clampInput('hydration', 90)).toBe(90);
	});

	it('clamps outliers to the nearest band edge', () => {
		expect(clampInput('pizzaCount', 0)).toBe(1);
		expect(clampInput('pizzaCount', -3)).toBe(1);
		expect(clampInput('pizzaCount', 999)).toBe(100);
		expect(clampInput('hydration', -50)).toBe(50);
		expect(clampInput('saltPercent', 999)).toBe(5);
		expect(clampInput('roomTempC', 1000)).toBe(35);
		expect(clampInput('starterHydration', -100)).toBe(40);
	});

	it('clamps infinities to the band edges and collapses NaN to the minimum', () => {
		expect(clampInput('ballWeight', Infinity)).toBe(600);
		expect(clampInput('ballWeight', -Infinity)).toBe(100);
		expect(clampInput('ballWeight', NaN)).toBe(100);
	});
});

describe('clampShareInput', () => {
	it('keeps a value that fits beside the other share', () => {
		expect(clampShareInput(30, 20, 30)).toBe(30);
		expect(clampShareInput(60, 20, 30)).toBe(60);
	});

	it('caps the edited share against the other one so the sum stays at the cap', () => {
		expect(clampShareInput(70, 20, 30)).toBe(60);
		expect(clampShareInput(95, 0, 30)).toBe(80);
		expect(clampShareInput(10, 80, 30)).toBe(0);
	});

	it('floors at 0 so mid-typing values below the minimum survive', () => {
		expect(clampShareInput(3, 20, 30)).toBe(3);
		expect(clampShareInput(-5, 20, 30)).toBe(0);
	});

	it('keeps the fallback for non-numeric input (an emptied field)', () => {
		expect(clampShareInput(NaN, 20, 30)).toBe(30);
		expect(clampShareInput(Infinity, 20, 30)).toBe(30);
	});
});

describe('clampPreFermentShares', () => {
	it('returns an empty list unchanged', () => {
		expect(clampPreFermentShares([])).toEqual([]);
	});

	it('keeps in-band shares as they are', () => {
		expect(
			clampPreFermentShares([
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			])
		).toEqual([
			{ type: 'biga', flourPercent: 30 },
			{ type: 'poolish', flourPercent: 20 }
		]);
	});

	it('clamps a single share into [5, 80]', () => {
		expect(clampPreFermentShares([{ type: 'biga', flourPercent: 2 }])).toEqual([
			{ type: 'biga', flourPercent: 5 }
		]);
		expect(clampPreFermentShares([{ type: 'poolish', flourPercent: 90 }])).toEqual([
			{ type: 'poolish', flourPercent: 80 }
		]);
	});

	it('makes the later entry yield when the sum would pass the cap', () => {
		expect(
			clampPreFermentShares([
				{ type: 'biga', flourPercent: 70 },
				{ type: 'poolish', flourPercent: 40 }
			])
		).toEqual([
			{ type: 'biga', flourPercent: 70 },
			{ type: 'poolish', flourPercent: 10 }
		]);
	});

	it('drops the later entry entirely when its remainder falls below the minimum', () => {
		expect(
			clampPreFermentShares([
				{ type: 'biga', flourPercent: 78 },
				{ type: 'poolish', flourPercent: 40 }
			])
		).toEqual([{ type: 'biga', flourPercent: 78 }]);
	});

	it('preserves the given entry order — priority belongs to the caller', () => {
		expect(
			clampPreFermentShares([
				{ type: 'poolish', flourPercent: 70 },
				{ type: 'biga', flourPercent: 40 }
			])
		).toEqual([
			{ type: 'poolish', flourPercent: 70 },
			{ type: 'biga', flourPercent: 10 }
		]);
	});
});
