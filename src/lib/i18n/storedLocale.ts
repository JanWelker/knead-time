import { LOCALES, type Locale } from './messages';

export const LOCALE_STORAGE_KEY = 'kneadtime:locale';
// Pre-rename key (project was once called 'doughcalc'). loadStoredLocale
// migrates any value left over from that era on first read and clears the
// legacy slot — drop this once we're past one full deploy cycle.
const LEGACY_LOCALE_KEY = 'doughcalc:locale';

function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function loadStoredLocale(storage: Storage | null | undefined): Locale | null {
	if (!storage) return null;
	let raw = storage.getItem(LOCALE_STORAGE_KEY);
	if (raw === null) {
		const legacy = storage.getItem(LEGACY_LOCALE_KEY);
		if (legacy !== null) {
			storage.removeItem(LEGACY_LOCALE_KEY);
			if (isLocale(legacy)) {
				storage.setItem(LOCALE_STORAGE_KEY, legacy);
				raw = legacy;
			}
		}
	}
	return isLocale(raw) ? raw : null;
}

export function saveStoredLocale(storage: Storage | null | undefined, locale: Locale): void {
	if (!storage) return;
	storage.setItem(LOCALE_STORAGE_KEY, locale);
}
