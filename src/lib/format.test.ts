import { describe, expect, it } from 'vitest';
import {
	combineDateTimeInputs,
	formatDuration,
	formatDurationHHMM,
	formatGrams,
	formatPercent,
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

describe('formatPercent', () => {
	it('keeps three decimals for tiny percentages', () => {
		expect(formatPercent(0.012)).toBe('0.012%');
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
	it('accepts shorthand H:MM and the European H.MM separator', () => {
		const d1 = combineDateTimeInputs('2026-05-12', '9:30')!;
		expect(d1.getHours()).toBe(9);
		expect(d1.getMinutes()).toBe(30);
		const d2 = combineDateTimeInputs('2026-05-12', '23.05')!;
		expect(d2.getHours()).toBe(23);
		expect(d2.getMinutes()).toBe(5);
	});
});
