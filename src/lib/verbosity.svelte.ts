import { PersistedChoice } from './persistedChoice.svelte';
import { safeLocalStorage } from './safeStorage';
import { saveStoredVerbosity, type ScheduleVerbosity } from './storedVerbosity';

// Schedule verbosity — whether each step shows its explanatory paragraph.
// Deliberately independent of the beginner/expert form mode and of the share
// URL: how much guidance you want next to the timeline is a device-level
// reading preference, not part of the recipe. Descriptive by default; the
// main page restores a stored choice on mount and set() persists toggles.
export const scheduleVerbosity = new PersistedChoice<ScheduleVerbosity>('descriptive', (v) =>
	saveStoredVerbosity(safeLocalStorage(), v)
);
