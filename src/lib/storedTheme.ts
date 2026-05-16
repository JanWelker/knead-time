import type { ThemeChoice } from './theme.svelte';

export const THEME_STORAGE_KEY = 'theme';

function isThemeChoice(value: unknown): value is ThemeChoice {
	return value === 'system' || value === 'light' || value === 'dark';
}

export function loadStoredTheme(storage: Storage | null | undefined): ThemeChoice {
	if (!storage) return 'system';
	const raw = storage.getItem(THEME_STORAGE_KEY);
	return isThemeChoice(raw) ? raw : 'system';
}

// 'system' is the absence of a user choice, so we clear the slot rather than
// write it — keeps storage tidy and gives a clean fresh-install signal.
export function saveStoredTheme(storage: Storage | null | undefined, choice: ThemeChoice): void {
	if (!storage) return;
	if (choice === 'system') storage.removeItem(THEME_STORAGE_KEY);
	else storage.setItem(THEME_STORAGE_KEY, choice);
}
