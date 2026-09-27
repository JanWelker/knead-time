import { describe, expect, it } from 'vitest';

import { qrCode } from './qr';

// The QR on the print sheet is the one figure a reader cannot check by eye, and
// until these pins the suite only asserted "some path, at least 21 wide": a
// transposed grid (`isDark(r, c)` painted at `M${r},${c}`) or an off-by-one in
// either loop passed at 100 % coverage. The literals below were read off the
// shipped `qrcode-generator` output once; a change in any of them is a change
// in what the phone scans.
describe('qrCode', () => {
	const single = qrCode('a');
	const modules = single.path.match(/M[^M]+/g) ?? [];

	it('encodes a one-character payload as a version-1 code of 21 modules', () => {
		expect(single.size).toBe(21);
	});

	it('paints exactly the 226 dark modules of that code, one subpath each', () => {
		expect(modules).toHaveLength(226);
		expect(single.path).toHaveLength(2939);
		for (const m of modules) expect(m).toMatch(/^M\d+,\d+h1v1h-1z$/);
	});

	it('walks the grid row by row, so the top finder edge opens the path', () => {
		// Row 0, columns 0–6: the top edge of the top-left finder pattern.
		expect(single.path.startsWith('M0,0h1v1h-1zM1,0h1v1h-1zM2,0h1v1h-1zM3,0h1v1h-1z')).toBe(true);
		// Row 1 of the finder is dark only at its two ends.
		expect(modules).toContain('M0,1h1v1h-1z');
		expect(modules).toContain('M6,1h1v1h-1z');
		expect(modules).not.toContain('M1,1h1v1h-1z');
	});

	it('writes the subpath as M{column},{row} — not transposed', () => {
		// Column 8, row 1 is a format-information module and dark for this
		// payload; its mirror (column 1, row 8) is light. Swapping the loop
		// variables in the template flips which of the two the path names.
		expect(modules).toContain('M8,1h1v1h-1z');
		expect(modules).not.toContain('M1,8h1v1h-1z');
	});

	it('picks version 4 (33 modules) for a typical share URL', () => {
		expect(qrCode('https://janwelker.github.io/knead-time/?v=2&n=6&b=280').size).toBe(33);
	});

	it('produces different output for different content', () => {
		expect(qrCode('a').path).not.toBe(qrCode('b').path);
	});

	it('auto-bumps the QR version for long inputs', () => {
		const long = qrCode('https://example.com/?' + 'k=v&'.repeat(40));
		// A longer payload forces a higher QR version → bigger module grid.
		expect(long.size).toBeGreaterThan(single.size);
	});
});
