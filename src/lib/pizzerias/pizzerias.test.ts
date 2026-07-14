import { describe, expect, it } from 'vitest';
import type { DoughInputs } from '../dough/types';
import {
	comparePizzerias,
	findMatchingPizzeria,
	parsePizzerias,
	pizzeriaEntries
} from './pizzerias';

describe('parsePizzerias', () => {
	it('parses a row with linked name, location, rankings, recipe, timing, notes and source', () => {
		const md = `
# Pizzerias

| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| [Pepe in Grani](https://50toppizza.it/pepe) | Caiazzo, Italy | 2018-it:1, 2024-w:25 | https://example.com/?v=3&n=7&b=250&h=62&s=2.75&y=f&t=22 | bulk-room:4-5h, final-proof:2h | Plus a tiny sourdough starter we dropped. | https://blog.example/franco-pepe |
`;
		const entries = parsePizzerias(md);
		expect(entries).toHaveLength(1);
		const [e] = entries;
		expect(e.name).toBe('Pepe in Grani');
		expect(e.profileUrl).toBe('https://50toppizza.it/pepe');
		expect(e.city).toBe('Caiazzo');
		expect(e.country).toBe('Italy');
		expect(e.rankings).toEqual([
			{ year: 2018, rank: 1, list: 'italy' },
			{ year: 2024, rank: 25, list: 'world' }
		]);
		expect(e.recipeUrl).toContain('example.com');
		expect(e.recipeSearch).toContain('n=7');
		expect(e.sourceUrl).toBe('https://blog.example/franco-pepe');
		expect(e.timing).toEqual({
			'bulk-room': { minMinutes: 240, maxMinutes: 300 },
			'final-proof': { minMinutes: 120, maxMinutes: 120 }
		});
		expect(e.notes).toBe('Plus a tiny sourdough starter we dropped.');
		expect(e.inputs.pizzaCount).toBe(7);
		expect(e.inputs.ballWeight).toBe(250);
		expect(e.inputs.hydration).toBe(62);
		expect(e.inputs.yeastType).toBe('fresh');
	});

	it('accepts a plain (unlinked) pizzeria name', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Some Spot | Town, Country | 2024-w:50 | https://example.com/?n=4 |  |  | https://src.example/x |
`;
		const entries = parsePizzerias(md);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe('Some Spot');
		expect(entries[0].profileUrl).toBeNull();
	});

	it('skips header, separator, and non-table lines', () => {
		const md = `
intro paragraph

| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Foo | City, Country | 2024-w:1 | https://example.com/?n=4 |  |  | https://src.example/y |

closing paragraph
`;
		expect(parsePizzerias(md)).toHaveLength(1);
	});

	it('drops rows with fewer than seven cells', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Only one |
| Short | City, IT | 2024-w:1 |
| Five | City, IT | 2024-w:2 | https://example.com/?n=4 | https://src.example/z |
| Six | City, IT | 2024-w:3 | https://example.com/?n=4 |  | https://src.example/z |
| Full | City, IT | 2024-w:4 | https://example.com/?n=4 |  |  | https://src.example/z |
`;
		const entries = parsePizzerias(md);
		expect(entries.map((e) => e.name)).toEqual(['Full']);
	});

	it('drops rows whose recipe URL cannot be parsed', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Bad URL | City, IT | 2024-w:1 | not a url |  |  | https://src.example/x |
| Bad host | City, IT | 2024-w:1 | http://[bad-ipv6 |  |  | https://src.example/y |
| Good | City, IT | 2024-w:1 | https://example.com/?n=4 |  |  | https://src.example/z |
`;
		const entries = parsePizzerias(md);
		expect(entries.map((e) => e.name)).toEqual(['Good']);
	});

	it('drops rows missing a source URL', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| No source | City, IT | 2024-w:1 | https://example.com/?n=4 |  |  | missing |
| With source | City, IT | 2024-w:1 | https://example.com/?n=4 |  |  | https://src.example/x |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['With source']);
	});

	it('drops rows without parseable rankings', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| No ranks | City, IT | nothing here | https://example.com/?n=4 |  |  | https://src.example/x |
| Bad year | City, IT | 18-it:1 | https://example.com/?n=4 |  |  | https://src.example/y |
| Good | City, IT | 2024-w:1 | https://example.com/?n=4 |  |  | https://src.example/z |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['Good']);
	});

	it('drops rows with a location missing the country', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Lonely | OnlyCity | 2024-w:1 | https://example.com/?n=4 |  |  | https://src.example/x |
| Paired | City, Country | 2024-w:1 | https://example.com/?n=4 |  |  | https://src.example/y |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['Paired']);
	});

	it('drops rows with an empty pizzeria-name cell', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
|   | City, Country | 2024-w:1 | https://example.com/?n=4 |  |  | https://src.example/x |
| Named | City, Country | 2024-w:2 | https://example.com/?n=4 |  |  | https://src.example/y |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['Named']);
	});

	it('accepts a markdown-link source URL', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Spot | City, Country | 2024-w:1 | https://example.com/?n=4 |  |  | [the interview](https://src.example/x) |
`;
		expect(parsePizzerias(md)[0].sourceUrl).toBe('https://src.example/x');
	});

	it('parses multiple rankings sharing the same year tag', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Multi | City, Country | 2018-it:1, 2019-it:1, 2022-w:26 | https://example.com/?n=4 |  |  | https://src.example/x |
`;
		expect(parsePizzerias(md)[0].rankings).toEqual([
			{ year: 2018, rank: 1, list: 'italy' },
			{ year: 2019, rank: 1, list: 'italy' },
			{ year: 2022, rank: 26, list: 'world' }
		]);
	});

	it('parses single-value and ranged timing tokens with h or m units', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Ranged | City, IT | 2024-w:1 | https://example.com/?n=4 | bulk-cold:24-48h, final-proof:3-4h |  | https://src.example/x |
| Minutes | City, IT | 2024-w:2 | https://example.com/?n=4 | bulk-room:90m |  | https://src.example/y |
| Fractional | City, IT | 2024-w:3 | https://example.com/?n=4 | preferment-mix:1.5h |  | https://src.example/z |
`;
		const [a, b, c] = parsePizzerias(md);
		expect(a.timing).toEqual({
			'bulk-cold': { minMinutes: 1440, maxMinutes: 2880 },
			'final-proof': { minMinutes: 180, maxMinutes: 240 }
		});
		expect(b.timing).toEqual({ 'bulk-room': { minMinutes: 90, maxMinutes: 90 } });
		expect(c.timing).toEqual({ 'preferment-mix': { minMinutes: 90, maxMinutes: 90 } });
	});

	it('ignores unknown step kinds and malformed timing tokens', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Mixed | City, IT | 2024-w:1 | https://example.com/?n=4 | unknown-step:5h, gibberish, bulk-room:5h, divide:1h |  | https://src.example/x |
`;
		// divide is a real step kind but not in TIMING_STEP_KINDS, so it's also dropped.
		expect(parsePizzerias(md)[0].timing).toEqual({
			'bulk-room': { minMinutes: 300, maxMinutes: 300 }
		});
	});

	it('treats an empty Timing cell as no source timings', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Empty | City, IT | 2024-w:1 | https://example.com/?n=4 |    |  | https://src.example/x |
`;
		expect(parsePizzerias(md)[0].timing).toEqual({});
	});

	it('exposes the Notes cell verbatim (empty when blank)', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Timing | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| WithNote | City, IT | 2024-w:1 | https://example.com/?n=4 |  | + 5% oil (out of model) | https://src.example/x |
| NoNote | City, IT | 2024-w:2 | https://example.com/?n=4 |  |  | https://src.example/y |
`;
		const [a, b] = parsePizzerias(md);
		expect(a.notes).toBe('+ 5% oil (out of model)');
		expect(b.notes).toBe('');
	});

	it('returns an empty list for markdown without a table', () => {
		expect(parsePizzerias('# Heading\n\nNo table here.')).toEqual([]);
	});
});

describe('comparePizzerias', () => {
	const make = (name: string, rankings: { year: number; rank: number }[]) => ({
		name,
		profileUrl: null,
		city: '',
		country: '',
		rankings: rankings.map((r) => ({ ...r, list: 'world' as const })),
		recipeUrl: '',
		recipeSearch: '',
		sourceUrl: '',
		timing: {},
		notes: '',
		inputs: {}
	});

	it('sorts by best rank ever (lowest first)', () => {
		const a = make('A', [{ year: 2024, rank: 5 }]);
		const b = make('B', [{ year: 2024, rank: 1 }]);
		expect([a, b].sort(comparePizzerias).map((e) => e.name)).toEqual(['B', 'A']);
	});

	it('breaks best-rank ties by latest year (most recent first)', () => {
		const a = make('A', [{ year: 2022, rank: 1 }]);
		const b = make('B', [{ year: 2024, rank: 1 }]);
		expect([a, b].sort(comparePizzerias).map((e) => e.name)).toEqual(['B', 'A']);
	});

	it('breaks remaining ties alphabetically', () => {
		const a = make('Zeta', [{ year: 2024, rank: 1 }]);
		const b = make('Alpha', [{ year: 2024, rank: 1 }]);
		expect([a, b].sort(comparePizzerias).map((e) => e.name)).toEqual(['Alpha', 'Zeta']);
	});
});

describe('findMatchingPizzeria', () => {
	function inputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
		return {
			readyBy: new Date('2026-06-13T17:00:00.000Z'),
			startAt: new Date('2026-06-13T08:00:00.000Z'),
			pizzaCount: 7,
			ballWeight: 250,
			hydration: 62,
			saltPercent: 2.75,
			oilPercent: 0,
			sugarPercent: 0,
			yeastType: 'fresh',
			starterHydration: 100,
			roomTempC: 22,
			fridgeTempC: 4,
			preFermentTempC: null,
			ballProof: 'room',
			mixingMethod: 'machine',
			preFerments: [],
			...overrides
		};
	}

	function entry(over: Partial<DoughInputs> = {}) {
		return {
			name: 'Test',
			profileUrl: null,
			city: '',
			country: '',
			rankings: [{ year: 2024, rank: 1, list: 'world' as const }],
			recipeUrl: '',
			recipeSearch: '',
			sourceUrl: '',
			timing: {},
			notes: '',
			inputs: inputs(over)
		};
	}

	it('matches when every recipe field is equal (ignoring dates)', () => {
		const e = entry();
		// Different bake time but same recipe params:
		const tweaked = inputs({
			readyBy: new Date('2027-01-01T12:00:00.000Z'),
			startAt: new Date('2027-01-01T04:00:00.000Z')
		});
		expect(findMatchingPizzeria(tweaked, [e])).toBe(e);
	});

	it('returns null when any non-date field differs', () => {
		const e = entry();
		expect(findMatchingPizzeria(inputs({ pizzaCount: 8 }), [e])).toBeNull();
		expect(findMatchingPizzeria(inputs({ ballWeight: 280 }), [e])).toBeNull();
		expect(findMatchingPizzeria(inputs({ hydration: 65 }), [e])).toBeNull();
		expect(findMatchingPizzeria(inputs({ saltPercent: 3 }), [e])).toBeNull();
		expect(findMatchingPizzeria(inputs({ roomTempC: 24 }), [e])).toBeNull();
		expect(findMatchingPizzeria(inputs({ fridgeTempC: 5 }), [e])).toBeNull();
		expect(findMatchingPizzeria(inputs({ yeastType: 'sourdough' }), [e])).toBeNull();
		// Entries parsed from pre-v=4 share URLs carry no mixingMethod — they
		// imply machine, so a hand-mixed form must not claim the source badge.
		expect(findMatchingPizzeria(inputs({ mixingMethod: 'hand' }), [e])).toBeNull();
		// Same for the pre-ferment temperature: unset means follows-the-room.
		expect(findMatchingPizzeria(inputs({ preFermentTempC: 17 }), [e])).toBeNull();
		// And for the ball proof: unset means the classic room-temperature one.
		expect(findMatchingPizzeria(inputs({ ballProof: 'cold' }), [e])).toBeNull();
	});

	it('compares starterHydration only when yeastType is sourdough', () => {
		const sourdoughEntry = entry({ yeastType: 'sourdough', starterHydration: 100 });
		expect(
			findMatchingPizzeria(inputs({ yeastType: 'sourdough', starterHydration: 100 }), [
				sourdoughEntry
			])
		).toBe(sourdoughEntry);
		expect(
			findMatchingPizzeria(inputs({ yeastType: 'sourdough', starterHydration: 80 }), [
				sourdoughEntry
			])
		).toBeNull();
		// Fresh-yeast entries match regardless of stored starterHydration.
		const freshEntry = entry({ starterHydration: 100 });
		expect(findMatchingPizzeria(inputs({ starterHydration: 50 }), [freshEntry])).toBe(freshEntry);
	});

	it('compares pre-ferment shape and falls through on mismatch', () => {
		const withBiga = entry({ preFerments: [{ type: 'biga', flourPercent: 48 }] });
		expect(
			findMatchingPizzeria(inputs({ preFerments: [{ type: 'biga', flourPercent: 48 }] }), [
				withBiga
			])
		).toBe(withBiga);
		expect(
			findMatchingPizzeria(inputs({ preFerments: [{ type: 'biga', flourPercent: 50 }] }), [
				withBiga
			])
		).toBeNull();
		expect(
			findMatchingPizzeria(inputs({ preFerments: [{ type: 'poolish', flourPercent: 48 }] }), [
				withBiga
			])
		).toBeNull();
		expect(findMatchingPizzeria(inputs({ preFerments: [] }), [withBiga])).toBeNull();
		// And the inverse — pre-ferment in inputs, none in entry.
		const noPf = entry();
		expect(
			findMatchingPizzeria(inputs({ preFerments: [{ type: 'biga', flourPercent: 30 }] }), [noPf])
		).toBeNull();
	});

	it('matches on oil & sugar percentages exactly', () => {
		const withOil = entry({ oilPercent: 5, sugarPercent: 2 });
		expect(findMatchingPizzeria(inputs({ oilPercent: 5, sugarPercent: 2 }), [withOil])).toBe(
			withOil
		);
		// Different oil → no match.
		expect(findMatchingPizzeria(inputs({ oilPercent: 4, sugarPercent: 2 }), [withOil])).toBeNull();
		// Different sugar → no match.
		expect(findMatchingPizzeria(inputs({ oilPercent: 5, sugarPercent: 1 }), [withOil])).toBeNull();
	});

	it('returns null when no entry matches', () => {
		expect(findMatchingPizzeria(inputs(), [])).toBeNull();
	});

	it('defaults to the shipped entries when no list is provided', () => {
		// Using the first shipped row's inputs should match itself.
		const shipped = pizzeriaEntries[0];
		const dough: DoughInputs = {
			readyBy: new Date(),
			startAt: new Date(),
			pizzaCount: shipped.inputs.pizzaCount!,
			ballWeight: shipped.inputs.ballWeight!,
			hydration: shipped.inputs.hydration!,
			saltPercent: shipped.inputs.saltPercent!,
			oilPercent: shipped.inputs.oilPercent ?? 0,
			sugarPercent: shipped.inputs.sugarPercent ?? 0,
			yeastType: shipped.inputs.yeastType!,
			starterHydration: shipped.inputs.starterHydration ?? 100,
			roomTempC: shipped.inputs.roomTempC!,
			fridgeTempC: shipped.inputs.fridgeTempC!,
			mixingMethod: shipped.inputs.mixingMethod ?? 'machine',
			preFermentTempC: shipped.inputs.preFermentTempC ?? null,
			ballProof: shipped.inputs.ballProof ?? 'room',
			preFerments: shipped.inputs.preFerments ?? []
		};
		expect(findMatchingPizzeria(dough)).toBe(shipped);
	});
});

describe('pizzeriaEntries (real data)', () => {
	it('parses at least one row from the shipped pizzerias.md', () => {
		expect(pizzeriaEntries.length).toBeGreaterThan(0);
	});

	it('every shipped row has a 50 Top profile URL', () => {
		for (const e of pizzeriaEntries) {
			expect(e.profileUrl, `${e.name} should link to a 50toppizza profile`).toMatch(
				/^https:\/\/.*50toppizza\.it/
			);
		}
	});

	it('every shipped row decodes pizzaCount, ballWeight, hydration', () => {
		for (const e of pizzeriaEntries) {
			expect(e.inputs.pizzaCount, `${e.name} pizzaCount`).toBeGreaterThan(0);
			expect(e.inputs.ballWeight, `${e.name} ballWeight`).toBeGreaterThan(0);
			expect(e.inputs.hydration, `${e.name} hydration`).toBeGreaterThan(0);
		}
	});

	it('every shipped row has at least one source-timing entry', () => {
		for (const e of pizzeriaEntries) {
			expect(Object.keys(e.timing).length, `${e.name} timing`).toBeGreaterThan(0);
		}
	});
});
