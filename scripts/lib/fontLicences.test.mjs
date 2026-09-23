import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FONT_LICENCES } from './fontLicences.mjs';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

// What broke: the build shipped four .woff2 files with no licence text
// anywhere in the deployed output, while THIRD-PARTY-NOTICES.md pointed at
// node_modules, which is not deployed. Nothing noticed because nothing reads
// the licence — this does, and it also stops the static copy from going stale
// against a bumped package.
describe('the OFL text ships next to the fonts it covers', () => {
	it('covers both self-hosted families and nothing else', () => {
		expect(FONT_LICENCES.map((f) => f.pkg)).toEqual([
			'@fontsource/anton',
			'@fontsource-variable/archivo'
		]);
	});

	it.each(FONT_LICENCES)('$target is the package’s own LICENSE, byte for byte', (f) => {
		expect(read(f.target)).toBe(read(f.source));
	});

	it.each(FONT_LICENCES)('$target is the SIL Open Font License 1.1', (f) => {
		const text = read(f.target);
		expect(text).toContain('SIL Open Font License, Version 1.1');
		expect(text).toContain('PERMISSION & CONDITIONS');
	});

	it.each(FONT_LICENCES)('$target lands in static/licenses/, where the deploy serves it', (f) => {
		expect(f.target).toMatch(/^static\/licenses\/[a-z]+-OFL\.txt$/);
	});
});
