import { storedPreference } from './storedPreference';
import type { ThemeChoice } from './theme.svelte';

function isThemeChoice(value: unknown): value is ThemeChoice {
	return value === 'system' || value === 'light' || value === 'dark';
}

const pref = storedPreference<ThemeChoice>({
	key: 'kneadtime:theme',
	isValid: isThemeChoice,
	// Pre-prefix key. The app deploys to a shared *.github.io origin where the
	// bare 'theme' slot is visible to every other project page. The inline boot
	// script in app.html reads it as a fallback too, so the pre-migration first
	// paint still honours a stored choice.
	legacyKey: 'theme',
	// 'system' is the absence of a user choice, so we clear the slot rather than
	// write it — keeps storage tidy and gives a clean fresh-install signal.
	clearOn: 'system'
});

export const THEME_STORAGE_KEY = pref.key;
export const saveStoredTheme = pref.save;

// Unlike the other preferences this one has no "unset" state to report: an
// unset theme IS 'system'.
export function loadStoredTheme(storage: Storage | null | undefined): ThemeChoice {
	return pref.load(storage) ?? 'system';
}
