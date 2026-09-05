import { storedPreference } from './storedPreference';

export type UiMode = 'beginner' | 'expert';

export function isUiMode(value: unknown): value is UiMode {
	return value === 'beginner' || value === 'expert';
}

const pref = storedPreference<UiMode>({ key: 'kneadtime:mode', isValid: isUiMode });

export const MODE_STORAGE_KEY = pref.key;
export const loadStoredMode = pref.load;
export const saveStoredMode = pref.save;
