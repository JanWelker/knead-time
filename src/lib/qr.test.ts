import { describe, expect, it } from 'vitest';

import { qrCode } from './qr';

describe('qrCode', () => {
	it('returns a non-empty path and a sensible size for a typical share URL', () => {
		const { size, path } = qrCode('https://janwelker.github.io/knead-time/?v=2&n=6&b=280');
		// QR version 1 is 21 modules per side; anything we encode is ≥ that.
		expect(size).toBeGreaterThanOrEqual(21);
		expect(path.length).toBeGreaterThan(0);
		// Every dark module is encoded as a `M{c},{r}h1v1h-1z` subpath.
		expect(path.startsWith('M')).toBe(true);
	});

	it('produces different output for different content', () => {
		expect(qrCode('a').path).not.toBe(qrCode('b').path);
	});

	it('auto-bumps the QR version for long inputs', () => {
		const short = qrCode('a');
		const long = qrCode('https://example.com/?' + 'k=v&'.repeat(40));
		// A longer payload forces a higher QR version → bigger module grid.
		expect(long.size).toBeGreaterThan(short.size);
	});
});
