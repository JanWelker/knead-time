import { describe, expect, it } from 'vitest';
import { makeStorage } from '../storageFixtures';
import { LOCALE_STORAGE_KEY, loadStoredLocale, saveStoredLocale } from './storedLocale';

describe('loadStoredLocale', () => {
	it('returns null when storage is null', () => {
		expect(loadStoredLocale(null)).toBeNull();
	});

	it('returns null when storage is undefined', () => {
		expect(loadStoredLocale(undefined)).toBeNull();
	});

	it('returns null when no value is stored', () => {
		expect(loadStoredLocale(makeStorage())).toBeNull();
	});

	it('returns null when stored value is not a supported locale', () => {
		expect(loadStoredLocale(makeStorage({ [LOCALE_STORAGE_KEY]: 'xx' }))).toBeNull();
	});

	it('returns the stored locale when supported', () => {
		expect(loadStoredLocale(makeStorage({ [LOCALE_STORAGE_KEY]: 'de' }))).toBe('de');
		expect(loadStoredLocale(makeStorage({ [LOCALE_STORAGE_KEY]: 'nl' }))).toBe('nl');
	});
});

describe('loadStoredLocale — legacy doughcalc:* migration', () => {
	const LEGACY = 'doughcalc:locale';

	it('migrates a valid legacy locale to the new key and returns it', () => {
		const storage = makeStorage({ [LEGACY]: 'de' });
		expect(loadStoredLocale(storage)).toBe('de');
		expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('de');
		expect(storage.getItem(LEGACY)).toBeNull();
	});

	it('discards a junk legacy value but still clears the legacy slot', () => {
		const storage = makeStorage({ [LEGACY]: 'xx' });
		expect(loadStoredLocale(storage)).toBeNull();
		expect(storage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
		expect(storage.getItem(LEGACY)).toBeNull();
	});

	it('prefers the new key when both are present (does not touch legacy)', () => {
		const storage = makeStorage({ [LOCALE_STORAGE_KEY]: 'it', [LEGACY]: 'de' });
		expect(loadStoredLocale(storage)).toBe('it');
		expect(storage.getItem(LEGACY)).toBe('de');
	});
});

describe('saveStoredLocale', () => {
	it('writes the locale to storage', () => {
		const storage = makeStorage();
		saveStoredLocale(storage, 'it');
		expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('it');
	});

	it('is a no-op when storage is null', () => {
		expect(() => saveStoredLocale(null, 'en')).not.toThrow();
	});

	it('is a no-op when storage is undefined', () => {
		expect(() => saveStoredLocale(undefined, 'en')).not.toThrow();
	});

	it('round-trips through load', () => {
		const storage = makeStorage();
		saveStoredLocale(storage, 'nl');
		expect(loadStoredLocale(storage)).toBe('nl');
	});
});
