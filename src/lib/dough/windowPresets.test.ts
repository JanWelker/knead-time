import { describe, expect, it } from 'vitest';
import { COLD_MODE_THRESHOLD_MIN, ROOM_MIN_TOTAL_MIN } from './schedule';
import { nearestWindowStopIndex, WINDOW_STOPS, windowAxisPercent } from './windowPresets';

describe('WINDOW_STOPS', () => {
	it('pins the canonical Neapolitan windows', () => {
		expect(WINDOW_STOPS).toEqual([6, 8, 12, 16, 18, 24, 36, 48, 72, 80]);
	});

	it('is strictly ascending', () => {
		for (let i = 1; i < WINDOW_STOPS.length; i++) {
			expect(WINDOW_STOPS[i]).toBeGreaterThan(WINDOW_STOPS[i - 1]);
		}
	});

	it('never offers a window the schedule calls infeasible', () => {
		expect(WINDOW_STOPS[0] * 60).toBeGreaterThanOrEqual(ROOM_MIN_TOTAL_MIN);
	});

	it('includes the cold-mode switch, so both regimes are reachable', () => {
		// Without a stop at the threshold the slider could skip straight over
		// the room→cold boundary.
		expect(WINDOW_STOPS).toContain(COLD_MODE_THRESHOLD_MIN / 60);
	});

	it('offers stops on both sides of the switch', () => {
		const threshold = COLD_MODE_THRESHOLD_MIN / 60;
		expect(WINDOW_STOPS.some((s) => s < threshold)).toBe(true);
		expect(WINDOW_STOPS.some((s) => s > threshold)).toBe(true);
	});
});

describe('nearestWindowStopIndex', () => {
	it('maps every stop to itself', () => {
		WINDOW_STOPS.forEach((stop, i) => {
			expect(nearestWindowStopIndex(stop)).toBe(i);
		});
	});

	it('snaps to the closer neighbour', () => {
		expect(WINDOW_STOPS[nearestWindowStopIndex(23)]).toBe(24);
		expect(WINDOW_STOPS[nearestWindowStopIndex(26)]).toBe(24);
		expect(WINDOW_STOPS[nearestWindowStopIndex(33)]).toBe(36);
	});

	it('keeps the shorter stop on an exact tie — the safer side for a dough', () => {
		// Halfway between 24 and 36.
		expect(WINDOW_STOPS[nearestWindowStopIndex(30)]).toBe(24);
	});

	it('clamps beyond either end', () => {
		expect(nearestWindowStopIndex(0)).toBe(0);
		expect(nearestWindowStopIndex(-50)).toBe(0);
		expect(nearestWindowStopIndex(500)).toBe(WINDOW_STOPS.length - 1);
	});
});

describe('windowAxisPercent', () => {
	it('spaces the stops evenly along the rail', () => {
		const last = WINDOW_STOPS.length - 1;
		WINDOW_STOPS.forEach((stop, i) => {
			expect(windowAxisPercent(stop)).toBeCloseTo((i / last) * 100, 6);
		});
	});

	it('pins the ends at 0 and 100', () => {
		expect(windowAxisPercent(WINDOW_STOPS[0])).toBe(0);
		expect(windowAxisPercent(WINDOW_STOPS[WINDOW_STOPS.length - 1])).toBe(100);
	});

	it('clamps outside the stop range instead of overflowing the rail', () => {
		expect(windowAxisPercent(1)).toBe(0);
		expect(windowAxisPercent(-20)).toBe(0);
		expect(windowAxisPercent(200)).toBe(100);
	});

	it('interpolates linearly between neighbouring stops', () => {
		// Halfway from 24 to 36 sits halfway between their two rail positions.
		const mid = (windowAxisPercent(24) + windowAxisPercent(36)) / 2;
		expect(windowAxisPercent(30)).toBeCloseTo(mid, 6);
	});

	it('is monotonic across the whole range', () => {
		let prev = -1;
		for (let h = 0; h <= 100; h += 0.25) {
			const p = windowAxisPercent(h);
			expect(p).toBeGreaterThanOrEqual(prev);
			expect(p).toBeGreaterThanOrEqual(0);
			expect(p).toBeLessThanOrEqual(100);
			prev = p;
		}
	});
});
