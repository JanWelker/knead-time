import { storageKey } from '../safeStorage';
import { storedPreference } from '../storedPreference';
import { isLocale, type Locale } from './messages';

// Pre-rename key (the project was once called 'doughcalc').
export const LOCALE_LEGACY_KEY = 'doughcalc:locale';

const pref = storedPreference<Locale>({
	key: storageKey('locale'),
	isValid: isLocale,
	legacyKey: LOCALE_LEGACY_KEY
});

export const LOCALE_STORAGE_KEY = pref.key;
export const loadStoredLocale = pref.load;
export const saveStoredLocale = pref.save;
