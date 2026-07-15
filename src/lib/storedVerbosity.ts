import { safeGet, safeSet } from './safeStorage';

export type ScheduleVerbosity = 'short' | 'descriptive';

export const VERBOSITY_STORAGE_KEY = 'kneadtime:scheduleVerbosity';

export function isScheduleVerbosity(value: unknown): value is ScheduleVerbosity {
	return value === 'short' || value === 'descriptive';
}

export function loadStoredVerbosity(storage: Storage | null | undefined): ScheduleVerbosity | null {
	const raw = safeGet(storage, VERBOSITY_STORAGE_KEY);
	return isScheduleVerbosity(raw) ? raw : null;
}

export function saveStoredVerbosity(
	storage: Storage | null | undefined,
	verbosity: ScheduleVerbosity
): void {
	safeSet(storage, VERBOSITY_STORAGE_KEY, verbosity);
}
