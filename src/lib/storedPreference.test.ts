import { describe, expect, it } from 'vitest';
import { storedPreference } from './storedPreference';
import { makeStorage } from './storageFixtures';
import { MODE_STORAGE_KEY } from './storedMode';
import { VERBOSITY_STORAGE_KEY } from './storedVerbosity';
import { THEME_STORAGE_KEY } from './storedTheme';
import { LOCALE_STORAGE_KEY } from './i18n/storedLocale';
import { TRMNL_UUID_STORAGE_KEY } from './trmnl/uuid';
import { LAST_RECIPE_KEY, RECIPES_KEY } from './storedRecipes';
import { scopedStorageKey, storageScopeFor } from './storageScope';

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

	// The app once deployed to a shared *.github.io origin, where an unprefixed
	// key is visible to — and collides with — every other project page on it.
	// That is what the 'theme' migration exists to undo.
	it('are all namespaced to this app', () => {
		for (const key of ALL_KEYS) expect(key.startsWith('kneadtime:')).toBe(true);
	});

	// A PR preview is served from the production origin (static/CNAME puts the
	// live site at the root of the same host the previews publish under), so it
	// shared every one of these slots with real users' devices — a preview read
	// the maintainer's saved recipes and could write a shape production cannot
	// decode. Nothing noticed because unit tests and the browser suite both run
	// at the root, where the scope is empty and the keys are the old literals.
	it('move as one under a preview scope, and none of them stays at the root', () => {
		const scope = storageScopeFor('/pr-preview/pr-12');
		const names = ALL_KEYS.map((key) => key.slice('kneadtime:'.length));
		const scoped = names.map((name) => scopedStorageKey(name, scope));
		expect(scoped).toEqual([
			'kneadtime:pr-preview-pr-12:mode',
			'kneadtime:pr-preview-pr-12:scheduleVerbosity',
			'kneadtime:pr-preview-pr-12:theme',
			'kneadtime:pr-preview-pr-12:locale',
			'kneadtime:pr-preview-pr-12:trmnlUuid',
			'kneadtime:pr-preview-pr-12:lastRecipe',
			'kneadtime:pr-preview-pr-12:recipes'
		]);
		for (const key of scoped) expect(ALL_KEYS).not.toContain(key);
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
