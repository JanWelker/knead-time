import { describe, expect, it } from 'vitest';
import { makeStorage } from './storageFixtures';
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

	it('round-trips a saved choice through load', () => {
		const storage = makeStorage();
		saveStoredTheme(storage, 'light');
		expect(loadStoredTheme(storage)).toBe('light');
	});
});
