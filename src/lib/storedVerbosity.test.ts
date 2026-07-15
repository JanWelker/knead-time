import { describe, expect, it } from 'vitest';
import { makeStorage, makeThrowingStorage } from './storageFixtures';
import {
	isScheduleVerbosity,
	loadStoredVerbosity,
	saveStoredVerbosity,
	VERBOSITY_STORAGE_KEY
} from './storedVerbosity';

describe('isScheduleVerbosity', () => {
	it.each([
		{ value: 'short', expected: true },
		{ value: 'descriptive', expected: true },
		{ value: 'verbose', expected: false },
		{ value: 7, expected: false },
		{ value: null, expected: false }
	])('$value → $expected', ({ value, expected }) => {
		expect(isScheduleVerbosity(value)).toBe(expected);
	});
});

describe('loadStoredVerbosity', () => {
	it.each([
		{ raw: undefined, expected: null },
		{ raw: 'short', expected: 'short' },
		{ raw: 'descriptive', expected: 'descriptive' },
		{ raw: 'bogus', expected: null }
	] as const)('raw=$raw → $expected', ({ raw, expected }) => {
		const storage = makeStorage(raw === undefined ? {} : { [VERBOSITY_STORAGE_KEY]: raw });
		expect(loadStoredVerbosity(storage)).toBe(expected);
	});

	it('returns null when storage is unavailable', () => {
		expect(loadStoredVerbosity(null)).toBeNull();
		expect(loadStoredVerbosity(undefined)).toBeNull();
	});

	it('returns null when storage throws on access', () => {
		expect(loadStoredVerbosity(makeThrowingStorage())).toBeNull();
	});
});

describe('saveStoredVerbosity', () => {
	it('writes the verbosity to storage', () => {
		const storage = makeStorage();
		saveStoredVerbosity(storage, 'short');
		expect(storage.getItem(VERBOSITY_STORAGE_KEY)).toBe('short');
	});

	it('is a no-op when storage is unavailable', () => {
		expect(() => saveStoredVerbosity(null, 'descriptive')).not.toThrow();
	});

	it('swallows a throwing write', () => {
		expect(() => saveStoredVerbosity(makeThrowingStorage(), 'short')).not.toThrow();
	});
});
