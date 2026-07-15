import { describe, expect, it } from 'vitest';
import { makeStorage, makeThrowingStorage } from './storageFixtures';
import { loadStoredTheme, saveStoredTheme, THEME_STORAGE_KEY } from './storedTheme';

describe('loadStoredTheme', () => {
	it.each([
		{ raw: undefined, expected: 'system' },
		{ raw: 'system', expected: 'system' },
		{ raw: 'light', expected: 'light' },
		{ raw: 'dark', expected: 'dark' },
		{ raw: 'xx', expected: 'system' }
	] as const)('raw=$raw → $expected', ({ raw, expected }) => {
		const storage = makeStorage(raw === undefined ? {} : { [THEME_STORAGE_KEY]: raw });
		expect(loadStoredTheme(storage)).toBe(expected);
	});

	it('returns system when storage is null', () => {
		expect(loadStoredTheme(null)).toBe('system');
	});

	it('returns system when storage is undefined', () => {
		expect(loadStoredTheme(undefined)).toBe('system');
	});

	it('returns system when storage throws on access', () => {
		expect(loadStoredTheme(makeThrowingStorage())).toBe('system');
	});
});

describe("loadStoredTheme — legacy bare 'theme' migration", () => {
	// The old unprefixed key — shared with every other project page on the
	// *.github.io origin, hence the rename.
	const LEGACY = 'theme';

	it('migrates a valid legacy choice to the new key and returns it', () => {
		const storage = makeStorage({ [LEGACY]: 'dark' });
		expect(loadStoredTheme(storage)).toBe('dark');
		expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		expect(storage.getItem(LEGACY)).toBeNull();
	});

	it('discards a junk legacy value but still clears the legacy slot', () => {
		const storage = makeStorage({ [LEGACY]: 'blurple' });
		expect(loadStoredTheme(storage)).toBe('system');
		expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
		expect(storage.getItem(LEGACY)).toBeNull();
	});

	it('prefers the new key when both are present (does not touch legacy)', () => {
		const storage = makeStorage({ [THEME_STORAGE_KEY]: 'light', [LEGACY]: 'dark' });
		expect(loadStoredTheme(storage)).toBe('light');
		expect(storage.getItem(LEGACY)).toBe('dark');
	});
});

describe('saveStoredTheme', () => {
	it('writes a concrete choice to storage', () => {
		const storage = makeStorage();
		saveStoredTheme(storage, 'dark');
		expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
	});

	it("clears the slot when set back to 'system'", () => {
		const storage = makeStorage({ [THEME_STORAGE_KEY]: 'light' });
		saveStoredTheme(storage, 'system');
		expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
	});

	it('is a no-op when storage is null', () => {
		expect(() => saveStoredTheme(null, 'dark')).not.toThrow();
	});

	it('is a no-op when storage is undefined', () => {
		expect(() => saveStoredTheme(undefined, 'dark')).not.toThrow();
	});

	it('swallows a throwing storage for both write and clear', () => {
		expect(() => saveStoredTheme(makeThrowingStorage(), 'dark')).not.toThrow();
		expect(() => saveStoredTheme(makeThrowingStorage(), 'system')).not.toThrow();
	});

	it('round-trips a saved choice through load', () => {
		const storage = makeStorage();
		saveStoredTheme(storage, 'light');
		expect(loadStoredTheme(storage)).toBe('light');
	});
});
