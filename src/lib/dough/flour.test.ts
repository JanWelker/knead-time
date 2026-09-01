import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FLOUR_W,
	FLOUR_BANDS,
	FLOUR_PRESETS,
	flourBand,
	flourPresetGroups,
	flourPresetForW,
	flourWindowHours,
	flourZones
} from './flour';
import { COLD_MODE_THRESHOLD_MIN } from './schedule';

const COLD_THRESHOLD_H = COLD_MODE_THRESHOLD_MIN / 60;

describe('FLOUR_PRESETS', () => {
	it('pins every shipped flour to its published W', () => {
		expect(FLOUR_PRESETS).toEqual([
			{ id: 'supermarket-00', w: 180 },
			{ id: 'caputo-doppio-zero', w: 230 },
			{ id: '5stagioni-napoletana', w: 260 },
			{ id: 'caputo-pizzeria', w: 265 },
			{ id: 'polselli-classica', w: 270 },
			{ id: 'caputo-nuvola', w: 280 },
			{ id: 'caputo-saccorosso', w: 290 },
			{ id: 'dallagiovanna-classica-oro', w: 305 },
			{ id: 'dallagiovanna-napoletana', w: 310 },
			{ id: 'caputo-cuoco', w: 315 },
			{ id: 'caputo-nuvola-super', w: 330 },
			{ id: 'dallagiovanna-uniqua-blu', w: 380 }
		]);
	});

	it('gives every preset a unique W, or one of them becomes unselectable', () => {
		// flourPresetForW maps a W back to an id to drive the select, so two
		// presets sharing a W would make the form show the first one's name
		// while the second is picked — and picking the second would silently
		// select the first. Found while adding seven flours at once.
		const ws = FLOUR_PRESETS.map((p) => p.w);
		expect(new Set(ws).size).toBe(ws.length);
		for (const preset of FLOUR_PRESETS) {
			expect(flourPresetForW(preset.w)).toBe(preset.id);
		}
	});

	it('keeps every preset inside the input bounds the form clamps to', () => {
		for (const preset of FLOUR_PRESETS) {
			expect(preset.w).toBeGreaterThanOrEqual(150);
			expect(preset.w).toBeLessThanOrEqual(400);
		}
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

		// Nuvola publishes no hours, only "holds up a long leavening time" —
		// so all we can assert is that it outlasts the weaker Pizzeria.
		expect(flourWindowHours(280, 'cold').max).toBeGreaterThan(caputo.max);
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
		for (const w of [265, 280, 310, 380]) {
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

describe('flourBand', () => {
	it('cuts on the AVPN spec at both outer edges', () => {
		// The disciplinare states the dough as "1800 g of flour (w220-380)".
		expect(flourBand(219)).toBe('weak');
		expect(flourBand(220)).toBe('sameDay');
		expect(flourBand(349)).toBe('day72');
		expect(flourBand(350)).toBe('veryStrong');
	});

	it('pins every shelf boundary', () => {
		expect(flourBand(249)).toBe('sameDay');
		expect(flourBand(250)).toBe('day24');
		expect(flourBand(279)).toBe('day24');
		expect(flourBand(280)).toBe('day48');
		expect(flourBand(309)).toBe('day48');
		expect(flourBand(310)).toBe('day72');
	});

	it('never goes backwards as the flour gets stronger', () => {
		let prev = -1;
		for (let w = 150; w <= 400; w++) {
			const rank = FLOUR_BANDS.indexOf(flourBand(w));
			expect(rank).toBeGreaterThanOrEqual(prev);
			prev = rank;
		}
	});

	it('agrees with the tolerance model on which flours can ferment long', () => {
		// The shelves are cut independently of flourWindowHours, so they could
		// drift apart into telling the user two different stories. A flour on a
		// 48 h-or-longer shelf must actually tolerate 48 h in the cold.
		for (const preset of FLOUR_PRESETS) {
			const band = flourBand(preset.w);
			if (band === 'day48' || band === 'day72' || band === 'veryStrong') {
				expect(flourWindowHours(preset.w, 'cold').max).toBeGreaterThanOrEqual(48);
			}
			if (band === 'weak') {
				expect(flourWindowHours(preset.w, 'cold').max).toBeLessThan(24);
			}
		}
	});
});

describe('flourPresetGroups', () => {
	it('lists every preset exactly once, in shelf order', () => {
		const groups = flourPresetGroups();
		const flat = groups.flatMap((g) => g.presets.map((p) => p.id));
		expect(flat).toEqual(FLOUR_PRESETS.map((p) => p.id));

		const ranks = groups.map((g) => FLOUR_BANDS.indexOf(g.band));
		expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
	});

	it('never emits an empty shelf — a heading promising nothing', () => {
		for (const group of flourPresetGroups()) {
			expect(group.presets.length).toBeGreaterThan(0);
		}
	});

	it('puts the shipped flours on the shelves a baker would expect', () => {
		const byBand = Object.fromEntries(
			flourPresetGroups().map((g) => [g.band, g.presets.map((p) => p.id)])
		);
		expect(byBand.weak).toEqual(['supermarket-00']);
		expect(byBand.sameDay).toEqual(['caputo-doppio-zero']);
		expect(byBand.day24).toEqual(['5stagioni-napoletana', 'caputo-pizzeria', 'polselli-classica']);
		expect(byBand.day48).toEqual([
			'caputo-nuvola',
			'caputo-saccorosso',
			'dallagiovanna-classica-oro'
		]);
		expect(byBand.day72).toEqual([
			'dallagiovanna-napoletana',
			'caputo-cuoco',
			'caputo-nuvola-super'
		]);
		expect(byBand.veryStrong).toEqual(['dallagiovanna-uniqua-blu']);
	});
});
