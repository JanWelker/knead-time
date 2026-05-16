import { describe, expect, it } from 'vitest';
import { comparePizzerias, parsePizzerias, pizzeriaEntries } from './pizzerias';

describe('parsePizzerias', () => {
	it('parses a row with linked name, location, rankings, recipe and source', () => {
		const md = `
# Pizzerias

| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| [Pepe in Grani](https://50toppizza.it/pepe) | Caiazzo, Italy | 2018-it:1, 2024-w:25 | https://example.com/?v=2&n=7&b=250&h=62&s=2.75&y=f&t=22 | https://blog.example/franco-pepe |
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
		expect(e.inputs.pizzaCount).toBe(7);
		expect(e.inputs.ballWeight).toBe(250);
		expect(e.inputs.hydration).toBe(62);
		expect(e.inputs.yeastType).toBe('fresh');
	});

	it('accepts a plain (unlinked) pizzeria name', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| Some Spot | Town, Country | 2024-w:50 | https://example.com/?n=4 | https://src.example/x |
`;
		const entries = parsePizzerias(md);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe('Some Spot');
		expect(entries[0].profileUrl).toBeNull();
	});

	it('skips header, separator, and non-table lines', () => {
		const md = `
intro paragraph

| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| Foo | City, Country | 2024-w:1 | https://example.com/?n=4 | https://src.example/y |

closing paragraph
`;
		expect(parsePizzerias(md)).toHaveLength(1);
	});

	it('drops rows with fewer than five cells', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| Only one |
| Short | City, IT | 2024-w:1 |
| Full | City, IT | 2024-w:2 | https://example.com/?n=4 | https://src.example/z |
`;
		const entries = parsePizzerias(md);
		expect(entries.map((e) => e.name)).toEqual(['Full']);
	});

	it('drops rows whose recipe URL cannot be parsed', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| Bad URL | City, IT | 2024-w:1 | not a url | https://src.example/x |
| Bad host | City, IT | 2024-w:1 | http://[bad-ipv6 | https://src.example/y |
| Good | City, IT | 2024-w:1 | https://example.com/?n=4 | https://src.example/z |
`;
		const entries = parsePizzerias(md);
		expect(entries.map((e) => e.name)).toEqual(['Good']);
	});

	it('drops rows missing a source URL', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| No source | City, IT | 2024-w:1 | https://example.com/?n=4 | missing |
| With source | City, IT | 2024-w:1 | https://example.com/?n=4 | https://src.example/x |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['With source']);
	});

	it('drops rows without parseable rankings', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| No ranks | City, IT | nothing here | https://example.com/?n=4 | https://src.example/x |
| Bad year | City, IT | 18-it:1 | https://example.com/?n=4 | https://src.example/y |
| Good | City, IT | 2024-w:1 | https://example.com/?n=4 | https://src.example/z |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['Good']);
	});

	it('drops rows with a location missing the country', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| Lonely | OnlyCity | 2024-w:1 | https://example.com/?n=4 | https://src.example/x |
| Paired | City, Country | 2024-w:1 | https://example.com/?n=4 | https://src.example/y |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['Paired']);
	});

	it('drops rows with an empty pizzeria-name cell', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
|   | City, Country | 2024-w:1 | https://example.com/?n=4 | https://src.example/x |
| Named | City, Country | 2024-w:2 | https://example.com/?n=4 | https://src.example/y |
`;
		expect(parsePizzerias(md).map((e) => e.name)).toEqual(['Named']);
	});

	it('accepts a markdown-link source URL', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| Spot | City, Country | 2024-w:1 | https://example.com/?n=4 | [the interview](https://src.example/x) |
`;
		expect(parsePizzerias(md)[0].sourceUrl).toBe('https://src.example/x');
	});

	it('parses multiple rankings sharing the same year tag', () => {
		const md = `
| Pizzeria | Location | Rankings | Recipe | Source |
| --- | --- | --- | --- | --- |
| Multi | City, Country | 2018-it:1, 2019-it:1, 2022-w:26 | https://example.com/?n=4 | https://src.example/x |
`;
		expect(parsePizzerias(md)[0].rankings).toEqual([
			{ year: 2018, rank: 1, list: 'italy' },
			{ year: 2019, rank: 1, list: 'italy' },
			{ year: 2022, rank: 26, list: 'world' }
		]);
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
});
