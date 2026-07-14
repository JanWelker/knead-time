import { describe, expect, it } from 'vitest';
import { parseCommunity } from './community';

describe('parseCommunity', () => {
	it('parses a table of entries and decodes the share URL', () => {
		const md = `
# Community

| Name | Date | Recipe |
| --- | --- | --- |
| Jan Welker | 2026-05-13 | https://example.com/?r=2026-05-14T17:00:00.000Z&sa=2026-05-13T07:00:00.000Z&n=6&b=280&h=70&s=3&y=f&t=22 |
`;
		const entries = parseCommunity(md);
		expect(entries).toHaveLength(1);
		const [e] = entries;
		expect(e.name).toBe('Jan Welker');
		expect(e.date).toBe('2026-05-13');
		expect(e.url).toContain('example.com');
		expect(e.inputs.pizzaCount).toBe(6);
		expect(e.inputs.ballWeight).toBe(280);
		expect(e.inputs.hydration).toBe(70);
		expect(e.inputs.saltPercent).toBe(3);
		expect(e.inputs.yeastType).toBe('fresh');
		expect(e.inputs.roomTempC).toBe(22);
		expect(e.inputs.readyBy?.toISOString()).toBe('2026-05-14T17:00:00.000Z');
	});

	it('skips header, separator, and non-table lines', () => {
		const md = `
intro paragraph

| Name | Date | Recipe |
| --- | --- | --- |
| Maria | 2026-05-10 | https://example.com/?n=4&b=250&h=65&y=s&sh=100&t=24 |

closing paragraph
`;
		const entries = parseCommunity(md);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe('Maria');
		expect(entries[0].inputs.yeastType).toBe('sourdough');
		expect(entries[0].inputs.starterHydration).toBe(100);
	});

	it('accepts a markdown-link URL in the recipe cell', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| Hans | 2026-05-08 | [my bake](https://example.com/?n=8&b=290&h=72&y=f&t=20&p=b30) |
`;
		const entries = parseCommunity(md);
		expect(entries).toHaveLength(1);
		expect(entries[0].url).toBe('https://example.com/?n=8&b=290&h=72&y=f&t=20&p=b30');
		expect(entries[0].inputs.preFerments).toEqual([{ type: 'biga', flourPercent: 30 }]);
	});

	it('drops rows whose URL cannot be parsed', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| Broken | 2026-05-01 | not a url at all |
| Good | 2026-05-02 | https://example.com/?n=2 |
`;
		const entries = parseCommunity(md);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe('Good');
	});

	it('drops rows whose URL matches the regex but fails URL parsing', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| Bad-host | 2026-05-03 | http://[bad-ipv6 |
`;
		expect(parseCommunity(md)).toEqual([]);
	});

	it('drops rows without a YYYY-MM-DD date', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| No Date | yesterday | https://example.com/?n=2 |
| Dated | 2026-05-02 | https://example.com/?n=3 |
`;
		const entries = parseCommunity(md);
		expect(entries.map((e) => e.name)).toEqual(['Dated']);
	});

	it('drops rows with a shape-valid but impossible calendar date', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| Bad Month | 2026-13-01 | https://example.com/?n=2 |
| Bad Day | 2026-02-31 | https://example.com/?n=2 |
| Leap Day | 2024-02-29 | https://example.com/?n=2 |
`;
		const entries = parseCommunity(md);
		expect(entries.map((e) => e.name)).toEqual(['Leap Day']);
	});

	it('drops rows with an empty name cell', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
|  | 2026-05-13 | https://example.com/?n=2 |
| Named | 2026-05-14 | https://example.com/?n=3 |
`;
		const entries = parseCommunity(md);
		expect(entries.map((e) => e.name)).toEqual(['Named']);
	});

	it('returns an empty list for markdown without a table', () => {
		expect(parseCommunity('# Community\n\nNo entries yet.')).toEqual([]);
	});

	it('drops rows with fewer than three cells', () => {
		// A single-cell row like `| just-this |` produces one cell after the
		// strip-and-split; a two-cell row like `| foo | bar |` produces two.
		// Both must be dropped — the parser needs name, date, and recipe-URL.
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| just-this |
| Half | 2026-05-01 |
| Full | 2026-05-02 | https://example.com/?n=4 |
`;
		const entries = parseCommunity(md);
		expect(entries.map((e) => e.name)).toEqual(['Full']);
	});

	it('extracts a GitHub handle when the Name cell starts with @', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| @JanWelker | 2026-05-13 | https://example.com/?n=6 |
| Maria Rossi | 2026-05-10 | https://example.com/?n=4 |
| @octo-cat | 2026-05-09 | https://example.com/?n=2 |
`;
		const entries = parseCommunity(md);
		expect(entries).toHaveLength(3);
		expect(entries[0].name).toBe('@JanWelker');
		expect(entries[0].handle).toBe('JanWelker');
		expect(entries[1].handle).toBeNull();
		expect(entries[2].handle).toBe('octo-cat');
	});

	it('rejects malformed @handles per GitHub rules', () => {
		const md = `
| Name | Date | Recipe |
| --- | --- | --- |
| @-leading | 2026-05-01 | https://example.com/?n=1 |
| @trailing- | 2026-05-02 | https://example.com/?n=1 |
| @has space | 2026-05-03 | https://example.com/?n=1 |
| @double--hyphen | 2026-05-04 | https://example.com/?n=1 |
| @${'a'.repeat(40)} | 2026-05-05 | https://example.com/?n=1 |
| @${'a'.repeat(39)} | 2026-05-06 | https://example.com/?n=1 |
| @ok | 2026-05-07 | https://example.com/?n=1 |
`;
		const entries = parseCommunity(md);
		expect(entries.map((e) => e.handle)).toEqual([
			null,
			null,
			null,
			null,
			null,
			'a'.repeat(39),
			'ok'
		]);
	});
});
