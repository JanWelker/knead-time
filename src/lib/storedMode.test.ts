import { describe, expect, it } from 'vitest';
import { makeStorage } from './storageFixtures';
import { isUiMode, loadStoredMode, MODE_STORAGE_KEY, saveStoredMode } from './storedMode';

describe('isUiMode', () => {
	it.each([
		{ value: 'beginner', expected: true },
		{ value: 'expert', expected: true },
		{ value: 'xx', expected: false },
		{ value: 42, expected: false },
		{ value: null, expected: false }
	])('$value → $expected', ({ value, expected }) => {
		expect(isUiMode(value)).toBe(expected);
	});
});

describe('loadStoredMode', () => {
	it.each([
		{ raw: undefined, expected: null },
		{ raw: 'beginner', expected: 'beginner' },
		{ raw: 'expert', expected: 'expert' },
		{ raw: 'bogus', expected: null }
	] as const)('raw=$raw → $expected', ({ raw, expected }) => {
		const storage = makeStorage(raw === undefined ? {} : { [MODE_STORAGE_KEY]: raw });
		expect(loadStoredMode(storage)).toBe(expected);
	});

	it('returns null when storage is unavailable', () => {
		expect(loadStoredMode(null)).toBeNull();
		expect(loadStoredMode(undefined)).toBeNull();
	});
});

describe('saveStoredMode', () => {
	it('writes the mode to storage', () => {
		const storage = makeStorage();
		saveStoredMode(storage, 'beginner');
		expect(storage.getItem(MODE_STORAGE_KEY)).toBe('beginner');
	});

	it('is a no-op when storage is unavailable', () => {
		expect(() => saveStoredMode(null, 'expert')).not.toThrow();
	});
});
