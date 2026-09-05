import { storedPreference } from '../storedPreference';
import { isLocale, type Locale } from './messages';

const pref = storedPreference<Locale>({
	key: 'kneadtime:locale',
	isValid: isLocale,
	// Pre-rename key (the project was once called 'doughcalc').
	legacyKey: 'doughcalc:locale'
});

export const LOCALE_STORAGE_KEY = pref.key;
export const loadStoredLocale = pref.load;
export const saveStoredLocale = pref.save;
