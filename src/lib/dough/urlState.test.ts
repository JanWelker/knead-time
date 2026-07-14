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
	preFermentTempC: null,
	ballProof: 'room',
	mixingMethod: 'spiral',
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

	it('round-trips the pre-ferment temperature and omits it when following the room', () => {
		expect(encodeInputs(base)).not.toContain('pt=');
		const out = decodeInputs(encodeInputs({ ...base, preFermentTempC: 17 }));
		expect(out.preFermentTempC).toBe(17);
		expect(decodeInputs(encodeInputs(base)).preFermentTempC).toBeUndefined();
	});

	it('round-trips the cold ball proof and omits the classic default', () => {
		expect(encodeInputs(base)).not.toContain('bp=');
		expect(decodeInputs(encodeInputs({ ...base, ballProof: 'cold' })).ballProof).toBe('cold');
		// encode never emits it, but hand-crafted URLs should still resolve.
		expect(decodeInputs('?v=4&n=4&bp=r').ballProof).toBe('room');
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

describe('crafted URLs cannot reach the math out of band (issue #194)', () => {
	it('clamps a negative starter hydration — no Infinity in the starter row', () => {
		expect(decodeInputs('?sh=-100').starterHydration).toBe(40);
	});

	it('clamps pizza count so Round numbers can never divide by zero', () => {
		expect(decodeInputs('?n=0').pizzaCount).toBe(1);
		expect(decodeInputs('?n=-3').pizzaCount).toBe(1);
		expect(decodeInputs('?n=999').pizzaCount).toBe(100);
	});

	it('clamps every other numeric into its form band', () => {
		expect(decodeInputs('?h=-50').hydration).toBe(50);
		expect(decodeInputs('?s=999').saltPercent).toBe(5);
		expect(decodeInputs('?t=1000').roomTempC).toBe(35);
		expect(decodeInputs('?b=1').ballWeight).toBe(100);
		expect(decodeInputs('?ft=99').fridgeTempC).toBe(12);
		expect(decodeInputs('?o=99').oilPercent).toBe(15);
		expect(decodeInputs('?sg=99').sugarPercent).toBe(5);
		expect(decodeInputs('?pt=1000').preFermentTempC).toBe(35);
	});

	it('rejects the loose numeric forms Number() would accept', () => {
		// '+' and '%20' decode to ' ' / '+', which Number() reads as 0; hex is
		// a valid Number() form too. None of them are plain decimals — treat
		// all as absent so form defaults fill in.
		expect(decodeInputs('?n=%2B').pizzaCount).toBeUndefined();
		expect(decodeInputs('?n=+').pizzaCount).toBeUndefined();
		expect(decodeInputs('?n=%20').pizzaCount).toBeUndefined();
		expect(decodeInputs('?n=0x10').pizzaCount).toBeUndefined();
		expect(decodeInputs('?n=Infinity').pizzaCount).toBeUndefined();
	});

	it('still accepts everything String(number) can emit', () => {
		expect(decodeInputs('?n=1e1').pizzaCount).toBe(10);
		expect(decodeInputs('?b=288.5').ballWeight).toBe(288.5);
		expect(decodeInputs('?s=.5').saltPercent).toBe(0.5);
		expect(decodeInputs('?t=-5').roomTempC).toBe(10);
	});

	it('treats an overflowing exponent as absent rather than clamping Infinity', () => {
		expect(decodeInputs('?n=1e999').pizzaCount).toBeUndefined();
	});

	it('restores the "+" in a hand-written ISO date with a zone offset', () => {
		// URLSearchParams decodes '+' as a space; the date fallback must put it
		// back instead of silently dropping the value.
		const out = decodeInputs('?r=2026-05-12T19:00:00+02:00&sa=2026-05-12T09:00:00+02:00');
		expect(out.readyBy?.toISOString()).toBe('2026-05-12T17:00:00.000Z');
		expect(out.startAt?.toISOString()).toBe('2026-05-12T07:00:00.000Z');
	});
});

describe('legacy encoder-produced links keep their exact meaning', () => {
	// Real published links (community.md / pizzerias.md rows) plus a synthetic
	// v1 link: every value the app's encoders ever wrote is inside the bands,
	// so decode-side clamping must be a no-op for all of them.
	it('round-trips the community row (v=2, biga) unchanged', () => {
		const out = decodeInputs(
			'?v=2&r=2026-05-23T17%3A00%3A00.000Z&sa=2026-05-18T09%3A35%3A00.000Z&n=6&b=296.8&h=75&s=3&y=f&t=22&ft=5&p=b50'
		);
		expect(out.readyBy?.toISOString()).toBe('2026-05-23T17:00:00.000Z');
		expect(out.startAt?.toISOString()).toBe('2026-05-18T09:35:00.000Z');
		expect(out.pizzaCount).toBe(6);
		expect(out.ballWeight).toBe(296.8);
		expect(out.hydration).toBe(75);
		expect(out.saltPercent).toBe(3);
		expect(out.yeastType).toBe('fresh');
		expect(out.roomTempC).toBe(22);
		expect(out.fridgeTempC).toBe(5);
		expect(out.preFerments).toEqual([{ type: 'biga', flourPercent: 50 }]);
	});

	it('round-trips a 50 Top Pizza sourdough row (v=3, oil) unchanged', () => {
		const out = decodeInputs(
			'?v=3&r=2026-06-13T17%3A00%3A00.000Z&sa=2026-06-13T11%3A00%3A00.000Z&n=4&b=480&h=60&s=2.2&o=5&y=s&sh=50&t=24&ft=4'
		);
		expect(out.pizzaCount).toBe(4);
		expect(out.ballWeight).toBe(480);
		expect(out.hydration).toBe(60);
		expect(out.saltPercent).toBe(2.2);
		expect(out.oilPercent).toBe(5);
		expect(out.yeastType).toBe('sourdough');
		expect(out.starterHydration).toBe(50);
		expect(out.roomTempC).toBe(24);
		expect(out.fridgeTempC).toBe(4);
	});

	it('round-trips a 50 Top Pizza poolish row (v=3, oil + sugar) unchanged', () => {
		const out = decodeInputs(
			'?v=3&r=2026-06-13T17%3A00%3A00.000Z&sa=2026-06-12T13%3A00%3A00.000Z&n=3&b=255&h=60&s=2&o=1&sg=2&y=f&t=22&ft=4&p=p10'
		);
		expect(out.pizzaCount).toBe(3);
		expect(out.ballWeight).toBe(255);
		expect(out.hydration).toBe(60);
		expect(out.saltPercent).toBe(2);
		expect(out.oilPercent).toBe(1);
		expect(out.sugarPercent).toBe(2);
		expect(out.preFerments).toEqual([{ type: 'poolish', flourPercent: 10 }]);
	});

	it('round-trips a pre-versioning legacy link unchanged', () => {
		const out = decodeInputs('?r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&s=3&y=f&t=22');
		expect(out.pizzaCount).toBe(4);
		expect(out.ballWeight).toBe(280);
		expect(out.hydration).toBe(70);
		expect(out.saltPercent).toBe(3);
		expect(out.roomTempC).toBe(22);
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

	it('v=3 links omit the mixing method so FormState defaults (spiral) fill in', () => {
		// Every share-link issued before v=4 was computed against the fixed
		// 15-min spiral mix. The decoder must leave mixingMethod undefined so
		// state.apply preserves the form default.
		const out = decodeInputs('?v=3&r=2026-05-12T19:00:00.000Z&n=4&b=280&h=70&y=f&t=22&ft=4');
		expect(out.mixingMethod).toBeUndefined();
	});

	it('round-trips hand mixing on v=4', () => {
		const out = decodeInputs(encodeInputs({ ...base, mixingMethod: 'hand' }));
		expect(out.mixingMethod).toBe('hand');
	});

	it('omits the mixing method from the encoded URL when spiral', () => {
		expect(encodeInputs(base)).not.toContain('mm=');
	});

	it('resolves the v4.0 mm=m ("machine") to spiral — the calibration it was', () => {
		const out = decodeInputs('?v=4&n=4&b=280&h=70&y=f&t=22&mm=m');
		expect(out.mixingMethod).toBe('spiral');
	});

	it('round-trips the stand mixer and accepts a hand-written mm=sp', () => {
		expect(decodeInputs(encodeInputs({ ...base, mixingMethod: 'stand' })).mixingMethod).toBe(
			'stand'
		);
		expect(decodeInputs('?v=4&n=4&mm=sp').mixingMethod).toBe('spiral');
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
