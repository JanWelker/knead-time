import { describe, expect, it } from 'vitest';
import { applicationServerKey } from './key';

describe('applicationServerKey', () => {
	it('decodes unpadded base64url into the raw bytes', () => {
		// 0x04 0xfb 0xff 0x7e → "BPv_fg" once URL-safe and unpadded.
		expect([...applicationServerKey('BPv_fg')]).toEqual([0x04, 0xfb, 0xff, 0x7e]);
	});

	it('accepts a key that happens to be padded', () => {
		expect([...applicationServerKey('BPv_fg==')]).toEqual([0x04, 0xfb, 0xff, 0x7e]);
	});

	it('round-trips a 65-byte P-256 point', () => {
		const bytes = new Uint8Array(65).map((_, i) => (i * 37) % 256);
		bytes[0] = 4;
		const text = btoa(String.fromCharCode(...bytes))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
		expect(applicationServerKey(text)).toEqual(bytes);
	});
});
