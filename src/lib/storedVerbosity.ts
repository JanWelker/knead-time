export type ScheduleVerbosity = 'short' | 'descriptive';

export const VERBOSITY_STORAGE_KEY = 'kneadtime:scheduleVerbosity';

export function isScheduleVerbosity(value: unknown): value is ScheduleVerbosity {
	return value === 'short' || value === 'descriptive';
}

export function loadStoredVerbosity(storage: Storage | null | undefined): ScheduleVerbosity | null {
	if (!storage) return null;
	const raw = storage.getItem(VERBOSITY_STORAGE_KEY);
	return isScheduleVerbosity(raw) ? raw : null;
}

export function saveStoredVerbosity(
	storage: Storage | null | undefined,
	verbosity: ScheduleVerbosity
): void {
	if (!storage) return;
	storage.setItem(VERBOSITY_STORAGE_KEY, verbosity);
}
