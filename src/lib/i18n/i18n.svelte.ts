import { MESSAGES, type Locale, type Messages } from './messages';

class I18n {
	locale: Locale = $state('en');

	get t(): Messages {
		return MESSAGES[this.locale];
	}

	set(locale: Locale) {
		this.locale = locale;
	}
}

export const i18n = new I18n();
export { interpolate as format } from './interpolate';
