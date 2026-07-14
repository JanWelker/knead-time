import { describe, expect, it } from 'vitest';
import {
	combineDateTimeInputs,
	formatBallWeight,
	formatDateTime,
	formatDuration,
	formatDurationHHMM,
	formatGrams,
	formatPercent,
	formatShortDate,
	formatTime,
	toDatePart,
	toTimePart
} from './format';

describe('formatDuration', () => {
	it('formats minutes only when under an hour', () => {
		expect(formatDuration(15, 'en')).toBe('15 min');
		expect(formatDuration(59, 'en')).toBe('59 min');
	});

	it('formats round hours without minutes', () => {
		expect(formatDuration(60, 'en')).toBe('1 h');
		expect(formatDuration(180, 'en')).toBe('3 h');
	});

	it('formats hours + minutes', () => {
		expect(formatDuration(90, 'en')).toBe('1 h 30 min');
		expect(formatDuration(125, 'en')).toBe('2 h 5 min');
	});

	it('rounds before splitting so the minute carry propagates', () => {
		expect(formatDuration(119.6, 'en')).toBe('2 h');
		expect(formatDuration(119.4, 'en')).toBe('1 h 59 min');
		expect(formatDuration(59.6, 'en')).toBe('1 h');
		expect(formatDuration(59.4, 'en')).toBe('59 min');
	});

	it('handles all supported locales', () => {
		expect(formatDuration(90, 'de')).toContain('Std');
		expect(formatDuration(90, 'it')).toContain('h');
	});
});

describe('formatDurationHHMM', () => {
	it('pads single-digit hours and minutes', () => {
		expect(formatDurationHHMM(0)).toBe('00:00');
		expect(formatDurationHHMM(5)).toBe('00:05');
		expect(formatDurationHHMM(65)).toBe('01:05');
	});
	it('handles multi-hour durations', () => {
		expect(formatDurationHHMM(12 * 60)).toBe('12:00');
		expect(formatDurationHHMM(36 * 60 + 30)).toBe('36:30');
	});
	it('rounds fractional minutes and floors negatives to zero', () => {
		expect(formatDurationHHMM(59.6)).toBe('01:00');
		expect(formatDurationHHMM(-10)).toBe('00:00');
	});
});

describe('formatGrams', () => {
	it('rounds to integer above 10 g', () => {
		expect(formatGrams(123.7)).toBe('124 g');
	});
	it('keeps one decimal between 1 and 10 g', () => {
		expect(formatGrams(2.35)).toBe('2.4 g');
	});
	it('keeps two decimals below 1 g', () => {
		expect(formatGrams(0.123)).toBe('0.12 g');
	});
});

describe('formatBallWeight', () => {
	it('omits the decimal for integers', () => {
		expect(formatBallWeight(280)).toBe('280');
		expect(formatBallWeight(300)).toBe('300');
	});
	it('keeps a single decimal for non-integer values', () => {
		expect(formatBallWeight(288.6)).toBe('288.6');
		expect(formatBallWeight(259.7)).toBe('259.7');
	});
	it('rounds to 0.1 g precision', () => {
		expect(formatBallWeight(288.55)).toBe('288.6');
		expect(formatBallWeight(288.04)).toBe('288');
	});
});

describe('formatPercent', () => {
	it('keeps up to three decimals for tiny percentages', () => {
		expect(formatPercent(0.012)).toBe('0.012%');
	});
	it('keeps the needed decimals between 0.1% and 1%', () => {
		expect(formatPercent(0.25)).toBe('0.25%');
		expect(formatPercent(0.99)).toBe('0.99%');
	});
	it('strips trailing zeros for integer percentages', () => {
		expect(formatPercent(1)).toBe('1%');
		expect(formatPercent(70)).toBe('70%');
	});
	it('keeps decimals when present and rounds beyond three places', () => {
		expect(formatPercent(2.349)).toBe('2.349%');
		expect(formatPercent(2.3491)).toBe('2.349%');
	});
	it('uses the locale decimal separator and percent placement', () => {
		expect(formatPercent(2.349, 'en')).toBe('2.349%');
		expect(formatPercent(2.349, 'de')).toBe('2,349 %');
		expect(formatPercent(2.349, 'it')).toBe('2,349%');
		expect(formatPercent(70, 'de')).toBe('70 %');
		expect(formatPercent(70, 'it')).toBe('70%');
	});
});

describe('formatDateTime / formatTime', () => {
	it('renders a localized weekday + time across supported locales', () => {
		const d = new Date(2026, 4, 12, 19, 30);
		for (const loc of ['en', 'de', 'it'] as const) {
			const dt = formatDateTime(d, loc);
			expect(dt).toMatch(/\d{1,2}/);
			// 24h locales (de/it) print 19; en may render 7 PM — accept either.
			expect(dt).toMatch(/19|7/);
		}
	});

	it('formatTime renders an hour:minute fragment', () => {
		const d = new Date(2026, 4, 12, 9, 5);
		for (const loc of ['en', 'de', 'it'] as const) {
			expect(formatTime(d, loc)).toMatch(/05/);
		}
	});
});

describe('formatShortDate', () => {
	const d = new Date(2026, 4, 12, 19, 30);

	it('renders weekday + date without time', () => {
		expect(formatShortDate(d, 'en')).not.toMatch(/19|7/);
		expect(formatShortDate(d, 'en')).toMatch(/12/);
	});

	it('strips commas from the locale-formatted output', () => {
		expect(formatShortDate(d, 'en')).not.toContain(',');
	});
});

describe('split date/time input round-trip', () => {
	it('round-trips a local date to minute precision', () => {
		const d = new Date(2026, 4, 12, 19, 30);
		const back = combineDateTimeInputs(toDatePart(d), toTimePart(d))!;
		expect(back.getFullYear()).toBe(d.getFullYear());
		expect(back.getMonth()).toBe(d.getMonth());
		expect(back.getDate()).toBe(d.getDate());
		expect(back.getHours()).toBe(d.getHours());
		expect(back.getMinutes()).toBe(d.getMinutes());
	});
	it('rejects malformed or empty values', () => {
		expect(combineDateTimeInputs('', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2026-05-12', '')).toBeNull();
		expect(combineDateTimeInputs('not-a-date', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2026-05-12', 'noon')).toBeNull();
		expect(combineDateTimeInputs('2026-05-12', '25:00')).toBeNull();
		expect(combineDateTimeInputs('2026-05-12', '12:75')).toBeNull();
	});
	it('rejects months and days outside the calendar range', () => {
		expect(combineDateTimeInputs('2026-00-15', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2026-13-01', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2026-05-00', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2026-05-32', '12:00')).toBeNull();
	});
	it('rejects days that overflow their month instead of rolling over', () => {
		expect(combineDateTimeInputs('2026-02-31', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2026-04-31', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2025-02-29', '12:00')).toBeNull();
		expect(combineDateTimeInputs('2024-02-29', '12:00')).not.toBeNull();
	});
	it('accepts shorthand H:MM in addition to the zero-padded HH:MM', () => {
		const d1 = combineDateTimeInputs('2026-05-12', '9:30')!;
		expect(d1.getHours()).toBe(9);
		expect(d1.getMinutes()).toBe(30);
		const d2 = combineDateTimeInputs('2026-05-12', '23:05')!;
		expect(d2.getHours()).toBe(23);
		expect(d2.getMinutes()).toBe(5);
		expect(combineDateTimeInputs('2026-05-12', '23.05')).toBeNull();
	});
});
