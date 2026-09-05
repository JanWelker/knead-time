import { describe, expect, it } from 'vitest';
import { storedPreference } from './storedPreference';
import { makeStorage } from './storageFixtures';
import { MODE_STORAGE_KEY } from './storedMode';
import { VERBOSITY_STORAGE_KEY } from './storedVerbosity';
import { THEME_STORAGE_KEY } from './storedTheme';
import { LOCALE_STORAGE_KEY } from './i18n/storedLocale';
import { TRMNL_UUID_STORAGE_KEY } from './trmnl/uuid';
import { LAST_RECIPE_KEY, RECIPES_KEY } from './storedRecipes';

// Every slot the app writes on a device. Listed here rather than sampled: the
// factory made these five one call each, and a copy-pasted call carrying the
// wrong key would take over another preference's slot in silence — there is no
// other place that would notice two of them colliding.
const ALL_KEYS = [
	MODE_STORAGE_KEY,
	VERBOSITY_STORAGE_KEY,
	THEME_STORAGE_KEY,
	LOCALE_STORAGE_KEY,
	TRMNL_UUID_STORAGE_KEY,
	LAST_RECIPE_KEY,
	RECIPES_KEY
];

describe('the storage slots', () => {
	it('are the ones the app documents, and no two share a key', () => {
		expect(ALL_KEYS).toEqual([
			'kneadtime:mode',
			'kneadtime:scheduleVerbosity',
			'kneadtime:theme',
			'kneadtime:locale',
			'kneadtime:trmnlUuid',
			'kneadtime:lastRecipe',
			'kneadtime:recipes'
		]);
		expect(new Set(ALL_KEYS).size).toBe(ALL_KEYS.length);
	});

	// The app deploys to a shared *.github.io origin, where an unprefixed key is
	// visible to — and collides with — every other project page on it. That is
	// what the 'theme' migration exists to undo.
	it('are all namespaced to this app', () => {
		for (const key of ALL_KEYS) expect(key.startsWith('kneadtime:')).toBe(true);
	});
});

describe('clearOn', () => {
	it('writes every value except the one that means "no choice"', () => {
		const isSize = (v: unknown): v is 'auto' | 'big' => v === 'auto' || v === 'big';
		const pref = storedPreference<'auto' | 'big'>({ key: 'k', isValid: isSize, clearOn: 'auto' });
		const storage = makeStorage();

		pref.save(storage, 'big');
		expect(storage.getItem('k')).toBe('big');

		pref.save(storage, 'auto');
		expect(storage.getItem('k')).toBeNull();
		expect(pref.load(storage)).toBeNull();
	});
});
