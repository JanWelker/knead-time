import { describe, expect, it } from 'vitest';
import { COLD_MODE_THRESHOLD_MIN, ROOM_MIN_TOTAL_MIN } from './schedule';
import { flourWindowHours, flourZones } from './flour';
import {
	BENEFIT_LONG_FROM_H,
	bestWindowStopIndex,
	BENEFIT_MEDIUM_FROM_H,
	fermentationBenefitTier,
	idealWindowHours,
	nearestWindowStopIndex,
	reachableStopIndex,
	stopsWithIdeal,
	WINDOW_STOPS,
	windowAxisPercent
} from './windowPresets';

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

describe('fermentationBenefitTier', () => {
	it('splits at the documented thresholds', () => {
		expect(fermentationBenefitTier(0)).toBe('short');
		expect(fermentationBenefitTier(11.99)).toBe('short');
		expect(fermentationBenefitTier(BENEFIT_MEDIUM_FROM_H)).toBe('medium');
		expect(fermentationBenefitTier(35.99)).toBe('medium');
		expect(fermentationBenefitTier(BENEFIT_LONG_FROM_H)).toBe('long');
		expect(fermentationBenefitTier(500)).toBe('long');
	});

	it('changes tier only on a stop, never mid-drag between two', () => {
		// Both thresholds are themselves stops, so the copy swap always lines
		// up with a notch on the rail.
		expect(WINDOW_STOPS).toContain(BENEFIT_MEDIUM_FROM_H);
		expect(WINDOW_STOPS).toContain(BENEFIT_LONG_FROM_H);
	});

	it('covers every stop with a tier, and never goes backwards', () => {
		const order = { short: 0, medium: 1, long: 2 };
		let prev = -1;
		for (const stop of WINDOW_STOPS) {
			const rank = order[fermentationBenefitTier(stop)];
			expect(rank).toBeGreaterThanOrEqual(prev);
			prev = rank;
		}
	});
});

describe('reachableStopIndex', () => {
	const lastIndex = WINDOW_STOPS.length - 1;

	it('returns the exact stop when the time left lands on one', () => {
		WINDOW_STOPS.forEach((stop, i) => {
			expect(reachableStopIndex(stop)).toBe(i);
		});
	});

	it('rounds down between stops — never offers a window that overshoots', () => {
		expect(WINDOW_STOPS[reachableStopIndex(23.9)]).toBe(18);
		expect(WINDOW_STOPS[reachableStopIndex(47.5)]).toBe(36);
		expect(WINDOW_STOPS[reachableStopIndex(71.99)]).toBe(48);
	});

	it('never returns a stop longer than the time left', () => {
		for (let h = -5; h <= 100; h += 0.25) {
			const i = reachableStopIndex(h);
			if (i >= 0) expect(WINDOW_STOPS[i]).toBeLessThanOrEqual(h);
		}
	});

	it('reports -1 when even the shortest window no longer fits', () => {
		expect(reachableStopIndex(WINDOW_STOPS[0] - 0.01)).toBe(-1);
		expect(reachableStopIndex(0)).toBe(-1);
		expect(reachableStopIndex(-10)).toBe(-1);
	});

	it('caps at the last stop however far off the bake is', () => {
		expect(reachableStopIndex(1000)).toBe(lastIndex);
	});

	it('is monotonic in the time remaining', () => {
		let prev = -1;
		for (let h = 0; h <= 100; h += 0.25) {
			const i = reachableStopIndex(h);
			expect(i).toBeGreaterThanOrEqual(prev);
			prev = i;
		}
	});
});

describe('bestWindowStopIndex', () => {
	const COLD_THRESHOLD_H = COLD_MODE_THRESHOLD_MIN / 60;
	const zonesFor = (w: number) => flourZones(w, COLD_THRESHOLD_H);
	const hoursAt = (i: number | null) => (i === null ? null : WINDOW_STOPS[i]);

	it('picks the longest stop the flour tolerates when time is no object', () => {
		// Caputo Pizzeria's cold band tops out at 40 h, so 36 h is the longest
		// stop inside it — not the 48 h the remaining time would allow.
		expect(hoursAt(bestWindowStopIndex(1000, zonesFor(265)))).toBe(36);
		// La Napoletana reaches 72 h.
		expect(hoursAt(bestWindowStopIndex(1000, zonesFor(310)))).toBe(72);
	});

	it('never recommends a window past the flour’s tolerance', () => {
		for (const w of [180, 265, 280, 310, 380]) {
			const zones = zonesFor(w);
			const i = bestWindowStopIndex(1000, zones);
			const band = flourWindowHours(w, 'cold');
			expect(WINDOW_STOPS[i as number]).toBeLessThanOrEqual(band.max);
		}
	});

	it('never recommends a window that would have to start in the past', () => {
		for (const w of [180, 265, 310, 380]) {
			for (let h = 0; h <= 100; h += 0.25) {
				const i = bestWindowStopIndex(h, zonesFor(w));
				if (i !== null) expect(WINDOW_STOPS[i]).toBeLessThanOrEqual(h);
			}
		}
	});

	it('falls back to the deadline when the tolerance outruns the time left', () => {
		// La Napoletana would happily go 72 h, but the bake is 30 h away.
		expect(hoursAt(bestWindowStopIndex(30, zonesFor(310)))).toBe(24);
	});

	it('lands on the stop nearest the tolerance when no stop sits inside it', () => {
		// Supermarket 00 can only ferment at room temperature here (its cold
		// band ends below the cold switch), and that band — 2–4 h — closes
		// before the 6 h shortest stop. So the weakest flour gets the shortest
		// window on the rail rather than a long one it cannot survive.
		expect(hoursAt(bestWindowStopIndex(1000, zonesFor(180)))).toBe(6);
	});

	it('stays inside a regime it can actually run — no room/cold contradiction', () => {
		for (const w of [180, 265, 280, 310, 380]) {
			const zones = zonesFor(w);
			const i = bestWindowStopIndex(1000, zones);
			const hours = WINDOW_STOPS[i as number];
			const zone = hours >= COLD_THRESHOLD_H ? zones.cold : zones.room;
			// Either the pick is inside the zone for the regime it will run in,
			// or the flour has no such zone and it is the nearest-edge fallback.
			if (zone !== null && hours >= zone.min && hours <= zone.max) continue;
			expect(zones.cold).toBeNull();
		}
	});

	it('has no opinion without a flour — the window is the user’s', () => {
		expect(bestWindowStopIndex(1000, null)).toBeNull();
		expect(bestWindowStopIndex(0, null)).toBeNull();
	});

	it('has no opinion when even the shortest window no longer fits', () => {
		expect(bestWindowStopIndex(WINDOW_STOPS[0] - 0.01, zonesFor(265))).toBeNull();
		expect(bestWindowStopIndex(-10, zonesFor(310))).toBeNull();
	});

	it('never sends a flour too weak for the cold switch into cold territory', () => {
		expect(zonesFor(180).cold).toBeNull();
		expect(WINDOW_STOPS[bestWindowStopIndex(1000, zonesFor(180)) as number]).toBeLessThan(
			COLD_THRESHOLD_H
		);
	});

	it('handles zones with no room side', () => {
		// A 1 h cold threshold swallows the room band entirely.
		const zones = flourZones(310, 1);
		expect(zones.room).toBeNull();
		expect(hoursAt(bestWindowStopIndex(1000, zones))).toBe(72);
	});

	it('is monotonic in the time left — more time never means a shorter window', () => {
		let prev = -1;
		for (let h = 0; h <= 100; h += 0.25) {
			const i = bestWindowStopIndex(h, zonesFor(310));
			if (i === null) continue;
			expect(i).toBeGreaterThanOrEqual(prev);
			prev = i;
		}
	});

	it('always finds a stop inside the band for any flour that can run cold', () => {
		// The shortest-stop fallback exists only for flours too weak to reach
		// the cold switch. Pin that: everything with a cold zone lands inside
		// one of its bands at every deadline that fits a window at all.
		for (const w of [265, 280, 310, 380]) {
			const zones = zonesFor(w);
			expect(zones.cold).not.toBeNull();
			for (let h = 6; h <= 100; h += 0.25) {
				const hours = WINDOW_STOPS[bestWindowStopIndex(h, zones) as number];
				const inZone = [zones.room, zones.cold].some(
					(b) => b !== null && hours >= b.min && hours <= b.max
				);
				expect(inZone).toBe(true);
			}
		}
	});

	it('falls back to the shortest stop for a flour the rail cannot serve', () => {
		// Supermarket 00's only usable band is 2–4 h at room temperature,
		// which closes before the 6 h shortest stop.
		for (let h = 6; h <= 100; h += 0.25) {
			expect(bestWindowStopIndex(h, zonesFor(180))).toBe(0);
		}
	});

	it('never lands on a window the schedule calls infeasible', () => {
		for (const w of [180, 265, 280, 310, 380]) {
			for (let h = 6; h <= 100; h += 0.5) {
				const i = bestWindowStopIndex(h, zonesFor(w));
				expect(WINDOW_STOPS[i as number] * 60).toBeGreaterThanOrEqual(ROOM_MIN_TOTAL_MIN);
			}
		}
	});
});

describe('idealWindowHours', () => {
	const zonesFor = (w: number) => flourZones(w, COLD_MODE_THRESHOLD_MIN / 60);

	it('is the top of the flour’s cold band when the bake is far enough out', () => {
		// Caputo Pizzeria's cold band tops out at 40 h — not a canonical stop,
		// which is the whole reason this exists.
		expect(idealWindowHours(zonesFor(265), 1000)).toBe(40);
		expect(WINDOW_STOPS).not.toContain(40);
		expect(idealWindowHours(zonesFor(310), 1000)).toBe(72);
	});

	it('is capped by the time left before the bake', () => {
		expect(idealWindowHours(zonesFor(310), 30)).toBe(30);
		expect(idealWindowHours(zonesFor(310), 30.9)).toBe(30);
	});

	it('never exceeds either limit it came from', () => {
		for (const w of [180, 265, 280, 310, 380]) {
			const zones = zonesFor(w);
			for (let h = 0; h <= 100; h += 0.5) {
				const ideal = idealWindowHours(zones, h);
				if (ideal === null) continue;
				expect(ideal).toBeLessThanOrEqual(h);
				// Inside *a* band — not necessarily the one the threshold would
				// suggest, since a room band clipped at the switch ends exactly
				// on it and so does the cold band's start.
				const inSomeBand = [zones.room, zones.cold].some(
					(b) => b !== null && ideal >= b.min && ideal <= b.max
				);
				expect(inSomeBand).toBe(true);
			}
		}
	});

	it('falls back to the room band when the cold one is out of reach', () => {
		// W 310's cold band starts at 24 h; with 20 h left only the room band
		// (6–16 h after clipping) is reachable.
		expect(idealWindowHours(zonesFor(310), 20)).toBe(16);
	});

	it('has no ideal for a flour whose band closes before the rail starts', () => {
		// Supermarket 00: room band 2–4 h, no cold zone at all.
		expect(idealWindowHours(zonesFor(180), 1000)).toBeNull();
	});

	it('has no ideal without a flour, or with the bake too close', () => {
		expect(idealWindowHours(null, 1000)).toBeNull();
		expect(idealWindowHours(zonesFor(310), 1)).toBeNull();
	});
});

describe('stopsWithIdeal', () => {
	it('splices the ideal in, in order', () => {
		expect(stopsWithIdeal(40)).toEqual([6, 8, 12, 16, 18, 24, 36, 40, 48, 72, 80]);
	});

	it('leaves the canonical list alone when there is nothing to add', () => {
		expect(stopsWithIdeal(null)).toEqual(WINDOW_STOPS);
		expect(stopsWithIdeal(72)).toEqual(WINDOW_STOPS); // already a stop
		expect(stopsWithIdeal(3)).toEqual(WINDOW_STOPS); // below the rail
		expect(stopsWithIdeal(200)).toEqual(WINDOW_STOPS); // past the rail
	});

	it('stays strictly ascending, so the axis stays monotonic', () => {
		for (const ideal of [7, 40, 41.5, 79]) {
			const stops = stopsWithIdeal(ideal);
			for (let i = 1; i < stops.length; i++) {
				expect(stops[i]).toBeGreaterThan(stops[i - 1]);
			}
		}
	});

	it('never mutates WINDOW_STOPS', () => {
		stopsWithIdeal(40);
		expect(WINDOW_STOPS).toEqual([6, 8, 12, 16, 18, 24, 36, 48, 72, 80]);
	});
});

describe('the ideal is reachable by hand once spliced in', () => {
	const zones = flourZones(265, COLD_MODE_THRESHOLD_MIN / 60);

	it('is what the re-pick lands on, and a stop the slider can return to', () => {
		// The bug this fixes: the app chose 40 h on first visit, the user dragged
		// away, and no slider position could get back to it.
		const ideal = idealWindowHours(zones, 1000) as number;
		const stops = stopsWithIdeal(ideal);

		const best = bestWindowStopIndex(1000, zones, stops) as number;
		expect(stops[best]).toBe(ideal);
		// and dragging to that index reproduces it exactly
		expect(stops[nearestWindowStopIndex(ideal, stops)]).toBe(ideal);
	});

	it('sits between the two canonical stops it falls among on the rail', () => {
		const stops = stopsWithIdeal(40);
		const pct = windowAxisPercent(40, stops);
		expect(pct).toBeGreaterThan(windowAxisPercent(36, stops));
		expect(pct).toBeLessThan(windowAxisPercent(48, stops));
	});
});
