import { storedPreference } from './storedPreference';

export type ScheduleVerbosity = 'short' | 'descriptive';

export function isScheduleVerbosity(value: unknown): value is ScheduleVerbosity {
	return value === 'short' || value === 'descriptive';
}

const pref = storedPreference<ScheduleVerbosity>({
	key: 'kneadtime:scheduleVerbosity',
	isValid: isScheduleVerbosity
});

export const VERBOSITY_STORAGE_KEY = pref.key;
export const loadStoredVerbosity = pref.load;
export const saveStoredVerbosity = pref.save;
