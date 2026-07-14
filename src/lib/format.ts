import { interpolate } from './i18n/interpolate';
import { MESSAGES, type Locale } from './i18n/messages';

export function padZero(n: number): string {
	return String(n).padStart(2, '0');
}

const dayFormatters = new Map<Locale, Intl.DateTimeFormat>();
const shortDateFormatters = new Map<Locale, Intl.DateTimeFormat>();
const timeFormatters = new Map<Locale, Intl.DateTimeFormat>();
const percentFormatters = new Map<Locale, Intl.NumberFormat>();

function percentFormatter(locale: Locale): Intl.NumberFormat {
	let f = percentFormatters.get(locale);
	if (!f) {
		f = new Intl.NumberFormat(locale, {
			style: 'percent',
			minimumFractionDigits: 0,
			maximumFractionDigits: 3
		});
		percentFormatters.set(locale, f);
	}
	return f;
}

export function formatDateTime(date: Date, locale: Locale): string {
	let f = dayFormatters.get(locale);
	if (!f) {
		f = new Intl.DateTimeFormat(locale, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
		dayFormatters.set(locale, f);
	}
	return f.format(date);
}

// Compact weekday + date, no time, no commas. Used in the TRMNL schedule
// strip where the time has its own column and the comma-separated form
// ("Thu, May 14") reads cluttered next to it.
export function formatShortDate(date: Date, locale: Locale): string {
	let f = shortDateFormatters.get(locale);
	if (!f) {
		f = new Intl.DateTimeFormat(locale, {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
		shortDateFormatters.set(locale, f);
	}
	return f.format(date).replace(/,/g, '');
}

export function formatTime(date: Date, locale: Locale): string {
	let f = timeFormatters.get(locale);
	if (!f) {
		f = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
		timeFormatters.set(locale, f);
	}
	return f.format(date);
}

export function formatDuration(minutes: number, locale: Locale): string {
	const m = MESSAGES[locale].schedule;
	// Round before splitting so the minute carry propagates into the hours
	// (119.6 → "2 h", not "1 h 60 min") and the sub-hour path never prints a
	// raw fraction.
	const total = Math.round(minutes);
	if (total < 60) return interpolate(m.duration_minutes, { n: total });
	const h = Math.floor(total / 60);
	const rem = total % 60;
	if (rem === 0) return interpolate(m.duration_hours, { n: h });
	return interpolate(m.duration_hours_minutes, { h, m: rem });
}

export function formatDurationHHMM(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	const h = Math.floor(total / 60);
	const m = total % 60;
	return padZero(h) + ':' + padZero(m);
}

export function formatGramsValue(value: number): string {
	if (value < 1) return value.toFixed(2);
	if (value < 10) return value.toFixed(1);
	return String(Math.round(value));
}

export function formatGrams(value: number): string {
	return formatGramsValue(value) + ' g';
}

// Ball weight is stored at 0.1 g precision (the Round-numbers action shifts it by
// fractional amounts to land flour/water on tidy values). Display it with the
// same precision so the user sees the round actually moved something.
export function formatBallWeight(value: number): string {
	const tenth = Math.round(value * 10) / 10;
	return Number.isInteger(tenth) ? String(tenth) : tenth.toFixed(1);
}

export function formatPercent(value: number, locale: Locale = 'en'): string {
	return percentFormatter(locale).format(value / 100);
}

export function toDatePart(date: Date): string {
	return date.getFullYear() + '-' + padZero(date.getMonth() + 1) + '-' + padZero(date.getDate());
}

export function toTimePart(date: Date): string {
	return padZero(date.getHours()) + ':' + padZero(date.getMinutes());
}

export function combineDateTimeInputs(datePart: string, timePart: string): Date | null {
	if (!datePart || !timePart) return null;
	const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
	if (!dm) return null;
	const tm = /^(\d{1,2}):(\d{2})$/.exec(timePart.trim());
	if (!tm) return null;
	const year = +dm[1];
	const month = +dm[2];
	const day = +dm[3];
	const hour = +tm[1];
	const minute = +tm[2];
	if (month < 1 || month > 12 || day < 1 || day > 31) return null;
	if (hour > 23 || minute > 59) return null;
	const date = new Date(year, month - 1, day, hour, minute, 0, 0);
	// A day inside [1, 31] can still overflow its month (2026-02-31 rolls to
	// March 3). With month and day already range-checked, any roll shifts the
	// month, so a month round-trip is a complete calendar-validity check.
	if (date.getMonth() !== month - 1) return null;
	return date;
}
