import { LOCALE_LEGACY_KEY, LOCALE_STORAGE_KEY } from './i18n/storedLocale';
import { REMINDERS_STORAGE_KEY } from './push/stored';
import { RETIRED_KEYS } from './retiredSlots';
import { safeRemove } from './safeStorage';
import { MODE_STORAGE_KEY } from './storedMode';
import { LAST_RECIPE_KEY, RECIPES_KEY } from './storedRecipes';
import { THEME_LEGACY_KEY, THEME_STORAGE_KEY } from './storedTheme';
import { VERBOSITY_STORAGE_KEY } from './storedVerbosity';

// "Reset this device" (issue #469): forget everything the app remembers here
// except the recipe book, so a baker can start over without losing it.
//
// Every live slot sits in exactly one of the two lists below, and
// storedPreference.test.ts holds the pair against the full list of slots — so a
// new preference cannot be added without deciding whether a reset forgets it.
// All of them come from `storageKey()`, which means a reset on a PR preview
// clears that preview's scope and never the live site's.

/** Live slots a reset clears. */
export const RESET_KEYS: readonly string[] = [
	LAST_RECIPE_KEY,
	REMINDERS_STORAGE_KEY,
	MODE_STORAGE_KEY,
	VERBOSITY_STORAGE_KEY,
	THEME_STORAGE_KEY,
	LOCALE_STORAGE_KEY
];

/** Live slots a reset keeps: the named recipes are the baker's own work. */
export const KEPT_KEYS: readonly string[] = [RECIPES_KEY];

// The legacy slots the theme and the language migrate out of. A reset that
// left one behind would see it migrated straight back on the next load, and the
// "forgotten" theme would return. They are unscoped because they were only
// ever written at the root; a preview already migrates them on its own load.
// The retired slots go too, for the same reason the page clears them on mount.
const ALSO_CLEARED: readonly string[] = [THEME_LEGACY_KEY, LOCALE_LEGACY_KEY, ...RETIRED_KEYS];

/** Every key a reset removes, in the order it removes them. */
export const CLEARED_KEYS: readonly string[] = [...RESET_KEYS, ...ALSO_CLEARED];

/** Clears this device's memory, keeping the recipe book. Safe on a blocked or missing storage. */
export function resetDeviceStorage(storage: Storage | null | undefined): void {
	for (const key of CLEARED_KEYS) safeRemove(storage, key);
}
