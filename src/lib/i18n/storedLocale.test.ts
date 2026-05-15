import { describe, expect, it } from 'vitest';
import { LOCALE_STORAGE_KEY, loadStoredLocale, saveStoredLocale } from './storedLocale';

function makeStorage(initial: Record<string, string> = {}): Storage {
	const map = new Map(Object.entries(initial));
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		key: (i: number) => [...map.keys()][i] ?? null,
		removeItem: (key: string) => {
			map.delete(key);
		},
		setItem: (key: string, value: string) => {
			map.set(key, value);
		}
	};
}

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
		expect(loadStoredLocale(makeStorage({ [LOCALE_STORAGE_KEY]: 'jam' }))).toBe('jam');
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
