import { safeLocalStorage } from '../safeStorage';
import { MESSAGES, type Locale, type Messages } from './messages';
import { saveStoredLocale } from './storedLocale';

class I18n {
	locale: Locale = $state('en');

	readonly t: Messages = $derived.by(() => MESSAGES[this.locale]);

	// persist: false is for routes that own their locale via the URL path
	// (/print/*) — they must render in that language without overwriting the
	// user's stored app-wide choice.
	set(locale: Locale, opts: { persist?: boolean } = {}) {
		this.locale = locale;
		if (opts.persist !== false) {
			saveStoredLocale(safeLocalStorage(), locale);
		}
	}
}

export const i18n = new I18n();
