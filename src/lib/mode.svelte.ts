import { PersistedChoice } from './persistedChoice.svelte';
import { safeLocalStorage } from './safeStorage';
import { saveStoredMode, type UiMode } from './storedMode';

// Beginner/expert view mode. The main page resolves the initial value on
// mount (URL md param → stored preference → beginner); explicit toggles go
// through set() so only deliberate choices persist — opening someone else's
// beginner link never overwrites the local preference.
//
// Seeded with the fresh-visit default — the same one `onMount` falls back to,
// and the same way verbosity.svelte.ts seeds its documented default. It used to
// seed 'expert', so the first render of a fresh visit built the expert tree and
// the mount immediately replaced it. Deliberately untested: the route is
// `ssr = false`, and the render and the correcting mount happen in one task, so
// the wrong tree never reaches a paint, a mutation-observer callback or any
// other checkpoint a browser test could read. There is nothing to pin; the
// value is simply the one the rest of the app documents.
export const uiMode = new PersistedChoice<UiMode>('beginner', (mode) =>
	saveStoredMode(safeLocalStorage(), mode)
);
