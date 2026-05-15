import { MESSAGES, type Locale, type Messages } from './messages';
import { saveStoredLocale } from './storedLocale';

class I18n {
	locale: Locale = $state('en');

	readonly t: Messages = $derived.by(() => MESSAGES[this.locale]);

	set(locale: Locale) {
		this.locale = locale;
		if (typeof localStorage !== 'undefined') {
			saveStoredLocale(localStorage, locale);
		}
	}
}

export const i18n = new I18n();
