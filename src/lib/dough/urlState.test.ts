import { describe, expect, it } from 'vitest';
import { decodeInputs, decodeUiMode, encodeInputs, type SerializableInputs } from './urlState';

const base: SerializableInputs = {
	readyBy: new Date('2026-05-12T19:00:00Z'),
	startAt: new Date('2026-05-12T13:00:00Z'),
	pizzaCount: 4,
	ballWeight: 280,
	hydration: 70,
	saltPercent: 3,
	oilPercent: 0,
	sugarPercent: 0,
	yeastType: 'fresh',
	starterHydration: 100,
	roomTempC: 22,
	fridgeTempC: 4,
	mixingMethod: 'machine',
	preFerments: []
};

describe('urlState round-trip', () => {
	it('round-trips fresh-yeast inputs', () => {
		const out = decodeInputs(encodeInputs(base));
		expect(out.readyBy?.toISOString()).toBe(base.readyBy.toISOString());
		expect(out.startAt?.toISOString()).toBe(base.startAt.toISOString());
		expect(out.pizzaCount).toBe(4);
		expect(out.ballWeight).toBe(280);
		expect(out.hydration).toBe(70);
		expect(out.saltPercent).toBe(3);
		expect(out.yeastType).toBe('fresh');
		expect(out.roomTempC).toBe(22);
		expect(out.fridgeTempC).toBe(4);
		expect(out.preFerments).toBeUndefined();
	});

	it('round-trips a non-default fridge temperature', () => {
		const out = decodeInputs(encodeInputs({ ...base, fridgeTempC: 7 }));
		expect(out.fridgeTempC).toBe(7);
	});

	it('round-trips the dry yeast types', () => {
		expect(decodeInputs(encodeInputs({ ...base, yeastType: 'instant' })).yeastType).toBe('instant');
		expect(decodeInputs(encodeInputs({ ...base, yeastType: 'active-dry' })).yeastType).toBe(
			'active-dry'
		);
	});

	it('round-trips sourdough with starter hydration', () => {
		const inp: SerializableInputs = {
			...base,
			yeastType: 'sourdough',
			starterHydration: 80
		};
		const out = decodeInputs(encodeInputs(inp));
		expect(out.yeastType).toBe('sourdough');
		expect(out.starterHydration).toBe(80);
	});

	it('round-trips a biga pre-ferment', () => {
		const inp: SerializableInputs = {
			...base,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		};
		const out = decodeInputs(encodeInputs(inp));
		expect(out.preFerments).toEqual([{ type: 'biga', flourPercent: 30 }]);
	});

	it('round-trips a poolish pre-ferment', () => {
		const inp: SerializableInputs = {
			...base,
			preFerments: [{ type: 'poolish', flourPercent: 20 }]
		};
		const out = decodeInputs(encodeInputs(inp));
		expect(out.preFerments).toEqual([{ type: 'poolish', flourPercent: 20 }]);
	});

	it('keeps query parameter keys short', () => {
		const encoded = encodeInputs(base);
		for (const segment of encoded.split('&')) {
			const key = segment.split('=')[0];
			expect(key.length).toBeLessThanOrEqual(2);
		}
	});

	it('ignores unknown / malformed parameters', () => {
		const out = decodeInputs('?h=bogus&n=&unknown=42');
		expect(out.hydration).toBeUndefined();
		expect(out.pizzaCount).toBeUndefined();
	});

	it('ignores invalid date strings for readyBy and startAt', () => {
		const out = decodeInputs('?r=not-a-date&sa=also-bad');
		expect(out.readyBy).toBeUndefined();
		expect(out.startAt).toBeUndefined();
	});

	it('clears the pre-ferments when the value is malformed', () => {
		// Unknown type prefix
		expect(decodeInputs('?p=xyz').preFerments).toEqual([]);
		// Known prefix but non-positive flour percentage
		expect(decodeInputs('?p=b0').preFerments).toEqual([]);
		expect(decodeInputs('?p=p-5').preFerments).toEqual([]);
		// Non-numeric flour percentage
		expect(decodeInputs('?p=bxx').preFerments).toEqual([]);
	});

	it('round-trips a poolish pre-ferment in the encoded URL', () => {
		const encoded = encodeInputs({ ...base, preFerments: [{ type: 'poolish', flourPercent: 20 }] });
		expect(encoded).toContain('p=p20');
	});

	it('round-trips combined biga + poolish as an underscore-separated token list', () => {
		const combined: SerializableInputs = {
			...base,
			preFerments: [
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			]
		};
		const encoded = encodeInputs(combined);
		// '_' survives URLSearchParams unescaped, keeping the link readable.
		expect(encoded).toContain('p=b30_p20');
		expect(decodeInputs(encoded).preFerments).toEqual(combined.preFerments);
	});

	it('accepts a comma separator in hand-written links', () => {
		expect(decodeInputs('?p=b30,p20').preFerments).toEqual([
			{ type: 'biga', flourPercent: 30 },
			{ type: 'poolish', flourPercent: 20 }
		]);
	});

	it('canonicalises token order to biga-first', () => {
		expect(decodeInputs('?p=p20_b30').preFerments).toEqual([
			{ type: 'biga', flourPercent: 30 },
			{ type: 'poolish', flourPercent: 20 }
		]);
	});

	it('keeps the first token when a type is duplicated', () => {
		expect(decodeInputs('?p=b30_b50').preFerments).toEqual([{ type: 'biga', flourPercent: 30 }]);
	});

	it('clamps each flour percent to the [5, 80] form band', () => {
		expect(decodeInputs('?p=b90').preFerments).toEqual([{ type: 'biga', flourPercent: 80 }]);
		expect(decodeInputs('?p=b2').preFerments).toEqual([{ type: 'biga', flourPercent: 5 }]);
	});

	it('caps the combined flour share at 80% — the second token yields', () => {
		expect(decodeInputs('?p=b70_p40').preFerments).toEqual([
			{ type: 'biga', flourPercent: 70 },
			{ type: 'poolish', flourPercent: 10 }
		]);
		// The remainder falls below the 5% minimum — drop the second entirely.
		expect(decodeInputs('?p=b78_p40').preFerments).toEqual([{ type: 'biga', flourPercent: 78 }]);
	});
});

describe('urlState versioning', () => {
	it('stamps the current schema version onto encoded URLs', () => {
		expect(encodeInputs(base)).toContain('v=4');
	});

	it('decodes legacy links that predate the v parameter as v1', () => {
		// Older shared/community links contain no `v` — they must keep working.
		const out = decodeInputs('?r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22');
		expect(out.readyBy?.toISOString()).toBe('2026-05-12T19:00:00.000Z');
		expect(out.pizzaCount).toBe(4);
		expect(out.yeastType).toBe('fresh');
	});

	it('decodes an explicit v=1 link the same as a legacy one', () => {
		const legacy = decodeInputs('?r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22');
		const versioned = decodeInputs('?v=1&r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22');
		expect(versioned).toEqual(legacy);
	});

	it('v=1 links omit fridgeTempC so FormState defaults (4 °C) fill in', () => {
		// v=1 predates the fridge-temp input. Decoders must leave fridgeTempC
		// undefined so the form's default (4 °C — matching the old hardcoded
		// constant) takes over via state.apply, keeping legacy recipes stable.
		const out = decodeInputs('?v=1&r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22');
		expect(out.fridgeTempC).toBeUndefined();
	});

	it('v=2 links carry fridgeTempC explicitly', () => {
		const out = decodeInputs('?v=2&r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22&ft=6');
		expect(out.fridgeTempC).toBe(6);
	});

	it('v=2 links omit oil & sugar so FormState defaults (0/0) fill in', () => {
		// Every share-link issued before v=3 was a plain Neapolitan recipe — no
		// oil, no sugar. The decoder must leave oilPercent/sugarPercent
		// undefined so state.apply preserves the form defaults.
		const out = decodeInputs('?v=2&r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22&ft=4');
		expect(out.oilPercent).toBeUndefined();
		expect(out.sugarPercent).toBeUndefined();
	});

	it('round-trips oil & sugar on v=3', () => {
		const out = decodeInputs(encodeInputs({ ...base, oilPercent: 5, sugarPercent: 2 }));
		expect(out.oilPercent).toBe(5);
		expect(out.sugarPercent).toBe(2);
	});

	it('v=3 links omit the mixing method so FormState defaults (machine) fill in', () => {
		// Every share-link issued before v=4 was computed against the fixed
		// 15-min machine mix. The decoder must leave mixingMethod undefined so
		// state.apply preserves the form default.
		const out = decodeInputs('?v=3&r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22&ft=4');
		expect(out.mixingMethod).toBeUndefined();
	});

	it('round-trips hand mixing on v=4', () => {
		const out = decodeInputs(encodeInputs({ ...base, mixingMethod: 'hand' }));
		expect(out.mixingMethod).toBe('hand');
	});

	it('omits the mixing method from the encoded URL when machine', () => {
		expect(encodeInputs(base)).not.toContain('mm=');
	});

	it('accepts an explicit mm=m as machine', () => {
		// encode never emits it, but hand-crafted URLs should still resolve.
		const out = decodeInputs('?v=4&n=4&b=280&h=70&y=f&t=22&mm=m');
		expect(out.mixingMethod).toBe('machine');
	});

	it('omits oil & sugar from the encoded URL when both are 0', () => {
		const encoded = encodeInputs(base);
		// Compact URLs: don't carry zero defaults — saves bytes and matches the
		// shape of every existing share-link issued before v=3.
		expect(encoded).not.toContain('o=');
		expect(encoded).not.toContain('sg=');
	});

	it('falls back to the current decoder when the requested version is unknown', () => {
		// A future deployment shipped v=99; today's app should still extract
		// whatever it understands of the current schema rather than failing hard.
		const out = decodeInputs('?v=99&n=4&b=280&h=70&y=f&t=22');
		expect(out.pizzaCount).toBe(4);
		expect(out.yeastType).toBe('fresh');
	});

	it('treats a non-numeric v as the current version', () => {
		const out = decodeInputs('?v=garbage&n=4');
		expect(out.pizzaCount).toBe(4);
	});
});

describe('view mode in the URL', () => {
	it('stamps md=b when encoding in beginner mode and omits it in expert mode', () => {
		expect(encodeInputs(base, { mode: 'beginner' })).toContain('md=b');
		expect(encodeInputs(base, { mode: 'expert' })).not.toContain('md=');
		expect(encodeInputs(base)).not.toContain('md=');
	});

	it('resolves an explicit md param in either direction', () => {
		expect(decodeUiMode('?md=b&n=4')).toBe('beginner');
		expect(decodeUiMode('?md=e&n=4')).toBe('expert');
	});

	it('resolves any recipe link without md as expert — pre-v4 links were made in the full view', () => {
		expect(decodeUiMode('?v=3&n=4&b=280&h=70&y=f&t=22')).toBe('expert');
		// Legacy links predate the v param but still carry recipe keys.
		expect(decodeUiMode('?r=2026-05-12T19:00:00.000Z&n=4')).toBe('expert');
	});

	it('returns null for a fresh visit so the caller can fall back to the stored preference', () => {
		expect(decodeUiMode('')).toBeNull();
		expect(decodeUiMode('?')).toBeNull();
	});

	it('round-trips beginner mode through encode and decode', () => {
		expect(decodeUiMode(`?${encodeInputs(base, { mode: 'beginner' })}`)).toBe('beginner');
	});
});
