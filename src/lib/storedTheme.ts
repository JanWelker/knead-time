import { safeGet, safeRemove, safeSet } from './safeStorage';
import type { ThemeChoice } from './theme.svelte';

export const THEME_STORAGE_KEY = 'kneadtime:theme';
// Pre-prefix key. The app deploys to a shared *.github.io origin where the
// bare 'theme' slot is visible to every other project page — loadStoredTheme
// migrates any value out of it on first read and clears the legacy slot.
// The inline boot script in app.html reads the legacy key as a fallback so
// the pre-migration first paint still honours a stored choice.
const LEGACY_THEME_KEY = 'theme';

function isThemeChoice(value: unknown): value is ThemeChoice {
	return value === 'system' || value === 'light' || value === 'dark';
}

export function loadStoredTheme(storage: Storage | null | undefined): ThemeChoice {
	let raw = safeGet(storage, THEME_STORAGE_KEY);
	if (raw === null) {
		const legacy = safeGet(storage, LEGACY_THEME_KEY);
		if (legacy !== null) {
			safeRemove(storage, LEGACY_THEME_KEY);
			if (isThemeChoice(legacy)) {
				safeSet(storage, THEME_STORAGE_KEY, legacy);
				raw = legacy;
			}
		}
	}
	return isThemeChoice(raw) ? raw : 'system';
}

// 'system' is the absence of a user choice, so we clear the slot rather than
// write it — keeps storage tidy and gives a clean fresh-install signal.
export function saveStoredTheme(storage: Storage | null | undefined, choice: ThemeChoice): void {
	if (choice === 'system') safeRemove(storage, THEME_STORAGE_KEY);
	else safeSet(storage, THEME_STORAGE_KEY, choice);
}
