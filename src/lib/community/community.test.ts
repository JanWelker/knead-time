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
		expect(entries[0].inputs.preFerment).toEqual({ type: 'biga', flourPercent: 30 });
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

	it('returns an empty list for markdown without a table', () => {
		expect(parseCommunity('# Community\n\nNo entries yet.')).toEqual([]);
	});
});
