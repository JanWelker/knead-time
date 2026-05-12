import { describe, expect, it } from 'vitest';
import { interpolate } from './interpolate';

describe('interpolate', () => {
	it('replaces named placeholders with their values', () => {
		expect(interpolate('Hello {name}, you have {n} messages', { name: 'Ada', n: 3 })).toBe(
			'Hello Ada, you have 3 messages'
		);
	});

	it('replaces missing variables with an empty string', () => {
		expect(interpolate('Hello {name}', {})).toBe('Hello ');
	});

	it('leaves unmatched braces untouched', () => {
		expect(interpolate('no placeholders here', { name: 'Ada' })).toBe('no placeholders here');
	});
});
