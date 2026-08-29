import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FLOUR_W,
	FLOUR_PRESETS,
	flourPresetForW,
	flourWindowHours,
	flourZones
} from './flour';
import { COLD_MODE_THRESHOLD_MIN } from './schedule';

const COLD_THRESHOLD_H = COLD_MODE_THRESHOLD_MIN / 60;

describe('FLOUR_PRESETS', () => {
	it('pins the four shipped flours to their published W values', () => {
		expect(FLOUR_PRESETS).toEqual([
			{ id: 'supermarket-00', w: 180 },
			{ id: 'caputo-pizzeria', w: 265 },
			{ id: 'dallagiovanna-napoletana', w: 310 },
			{ id: 'dallagiovanna-uniqua-blu', w: 380 }
		]);
	});

	it('defaults to Caputo Pizzeria', () => {
		expect(DEFAULT_FLOUR_W).toBe(265);
		expect(flourPresetForW(DEFAULT_FLOUR_W)).toBe('caputo-pizzeria');
	});

	it('is ordered weakest first', () => {
		const ws = FLOUR_PRESETS.map((p) => p.w);
		expect([...ws].sort((a, b) => a - b)).toEqual(ws);
	});
});

describe('flourPresetForW', () => {
	it('maps every preset W back to its id', () => {
		for (const preset of FLOUR_PRESETS) {
			expect(flourPresetForW(preset.w)).toBe(preset.id);
		}
	});

	it('returns null for a hand-typed strength no preset matches', () => {
		expect(flourPresetForW(266)).toBeNull();
		expect(flourPresetForW(400)).toBeNull();
	});

	it('gives the above-anchor preset the top anchor band, not an invented one', () => {
		// Uniqua Blu is W 380 with no published total-window figure, so it
		// clamps onto La Napoletana's band rather than extrapolating past it.
		expect(flourWindowHours(380, 'cold')).toEqual(flourWindowHours(310, 'cold'));
		expect(flourWindowHours(380, 'room')).toEqual(flourWindowHours(310, 'room'));
	});
});

describe('flourWindowHours', () => {
	it('returns the anchor values exactly at the anchor W', () => {
		expect(flourWindowHours(180, 'room')).toEqual({ min: 2, max: 4 });
		expect(flourWindowHours(180, 'cold')).toEqual({ min: 6, max: 12 });
		expect(flourWindowHours(265, 'room')).toEqual({ min: 4, max: 10 });
		expect(flourWindowHours(265, 'cold')).toEqual({ min: 16, max: 40 });
		expect(flourWindowHours(310, 'room')).toEqual({ min: 6, max: 18 });
		expect(flourWindowHours(310, 'cold')).toEqual({ min: 24, max: 72 });
	});

	it('clamps rather than extrapolates outside the anchor range', () => {
		expect(flourWindowHours(100, 'cold')).toEqual(flourWindowHours(180, 'cold'));
		expect(flourWindowHours(400, 'cold')).toEqual(flourWindowHours(310, 'cold'));
		expect(flourWindowHours(400, 'room')).toEqual(flourWindowHours(310, 'room'));
	});

	it('interpolates geometrically between anchors', () => {
		// Midpoint of the 180→265 segment: the geometric mean, not the average.
		const mid = flourWindowHours((180 + 265) / 2, 'cold');
		expect(mid.min).toBeCloseTo(Math.sqrt(6 * 16), 6);
		expect(mid.max).toBeCloseTo(Math.sqrt(12 * 40), 6);
		// A geometric mean always sits below the arithmetic one.
		expect(mid.max).toBeLessThan((12 + 40) / 2);
	});

	it('is monotonic in W — stronger flour never tolerates less', () => {
		for (const mode of ['room', 'cold'] as const) {
			let prev = flourWindowHours(150, mode);
			for (let w = 155; w <= 400; w += 5) {
				const band = flourWindowHours(w, mode);
				expect(band.min).toBeGreaterThanOrEqual(prev.min);
				expect(band.max).toBeGreaterThanOrEqual(prev.max);
				prev = band;
			}
		}
	});

	it('keeps min below max everywhere', () => {
		for (let w = 150; w <= 400; w += 5) {
			for (const mode of ['room', 'cold'] as const) {
				const band = flourWindowHours(w, mode);
				expect(band.min).toBeLessThan(band.max);
			}
		}
	});

	it('covers each preset flour’s published fermentation range', () => {
		// Caputo Pizzeria is sold as "ideal under 24 h"; La Napoletana as 24–72 h.
		// Both claims have to sit inside the band we compute for them.
		const caputo = flourWindowHours(265, 'cold');
		expect(caputo.min).toBeLessThanOrEqual(24);
		expect(caputo.max).toBeGreaterThanOrEqual(24);

		const napoletana = flourWindowHours(310, 'cold');
		expect(napoletana.min).toBeLessThanOrEqual(24);
		expect(napoletana.max).toBeGreaterThanOrEqual(72);
	});
});

describe('flourZones', () => {
	it('clips each zone to its own fermentation regime', () => {
		const zones = flourZones(265, COLD_THRESHOLD_H);
		expect(zones.room?.max).toBeLessThanOrEqual(COLD_THRESHOLD_H);
		expect(zones.cold?.min).toBeGreaterThanOrEqual(COLD_THRESHOLD_H);
	});

	it('offers no cold zone for a flour too weak to reach the cold switch', () => {
		// Supermarket 00 tops out at 12 h — below the 16 h cold threshold, so a
		// cold ferment is simply not reachable with it.
		expect(flourZones(180, COLD_THRESHOLD_H).cold).toBeNull();
		expect(flourZones(180, COLD_THRESHOLD_H).room).toEqual({ min: 2, max: 4 });
	});

	it('keeps both zones for the strong flours', () => {
		for (const w of [265, 310, 380]) {
			const zones = flourZones(w, COLD_THRESHOLD_H);
			expect(zones.room).not.toBeNull();
			expect(zones.cold).not.toBeNull();
		}
	});

	it('drops a room zone that the cold switch swallows entirely', () => {
		// With a 1 h threshold every room band starts above the switch, so
		// nothing of it remains on the room side.
		expect(flourZones(310, 1).room).toBeNull();
		expect(flourZones(310, 1).cold).toEqual({ min: 24, max: 72 });
	});

	it('truncates a room band that straddles the threshold', () => {
		// W 310's room band is [6, 18] h and the switch is at 16 h.
		expect(flourZones(310, COLD_THRESHOLD_H).room).toEqual({ min: 6, max: 16 });
	});

	it('lifts a cold band that starts below the threshold', () => {
		// A 30 h threshold pushes W 310's cold band (natural min 24 h) up to it.
		expect(flourZones(310, 30).cold).toEqual({ min: 30, max: 72 });
	});
});
