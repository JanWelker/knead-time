import { PersistedChoice } from './persistedChoice.svelte';
import { safeLocalStorage } from './safeStorage';
import { saveStoredMode, type UiMode } from './storedMode';

// Beginner/expert view mode. The main page resolves the initial value on
// mount (URL md param → stored preference → beginner); explicit toggles go
// through set() so only deliberate choices persist — opening someone else's
// beginner link never overwrites the local preference.
export const uiMode = new PersistedChoice<UiMode>('expert', (mode) =>
	saveStoredMode(safeLocalStorage(), mode)
);
