import { LOCALES, type Locale } from './messages';

export const LOCALE_STORAGE_KEY = 'doughcalc:locale';

function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function loadStoredLocale(storage: Storage | null | undefined): Locale | null {
	if (!storage) return null;
	const raw = storage.getItem(LOCALE_STORAGE_KEY);
	return isLocale(raw) ? raw : null;
}

export function saveStoredLocale(storage: Storage | null | undefined, locale: Locale): void {
	if (!storage) return;
	storage.setItem(LOCALE_STORAGE_KEY, locale);
}
