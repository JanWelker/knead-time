import { describe, expect, it } from 'vitest';
import {
	combineDateTimeInputs,
	formatBallWeight,
	formatBallWeightGrams,
	formatDate,
	formatDateTime,
	formatDuration,
	formatGrams,
	formatIsoDate,
	formatNumber,
	formatPercent,
	formatShortDate,
	formatTemperature,
	formatTime,
	toDatePart,
	toTimePart
} from './format';
import { LOCALES, type Locale } from './i18n/messages';

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

	it('writes the hour and minute units in every supported locale', () => {
		// Was two of five locales, checked with `toContain('h')` — which almost
		// any output satisfies. One literal per locale, both shapes.
		const expected: Record<Locale, [string, string]> = {
			en: ['1 h 30 min', '2 h 5 min'],
			de: ['1 Std 30 Min', '2 Std 5 Min'],
			it: ['1 h 30 min', '2 h 5 min'],
			fr: ['1 h 30 min', '2 h 5 min'],
			nl: ['1 u 30 min', '2 u 5 min']
		};
		for (const locale of LOCALES) {
			expect(formatDuration(90, locale), locale).toBe(expected[locale][0]);
			expect(formatDuration(125, locale), locale).toBe(expected[locale][1]);
		}
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
	it('switches precision exactly at 1 g and 10 g', () => {
		// The two band edges, which nothing pinned: every existing case sat
		// comfortably inside a band, so either threshold could move.
		expect(formatGrams(0.999)).toBe('1.00 g');
		expect(formatGrams(1)).toBe('1.0 g');
		expect(formatGrams(9.99)).toBe('10.0 g');
		expect(formatGrams(10)).toBe('10 g');
	});
	it('punctuates the weight in the language it is read in', () => {
		// It was `toFixed` + ' g', which is English whatever the page says, so a
		// German sheet put "1.3 g" next to "Frischhefe" while the percentage
		// beside it had already been fixed to "0,35 %". Every locale with a
		// decimal comma was wrong on every weight under 10 g.
		expect(formatGrams(2.35, 'de')).toBe('2,4 g');
		expect(formatGrams(0.123, 'it')).toBe('0,12 g');
		expect(formatGrams(0.123, 'nl')).toBe('0,12 g');
		// French puts a narrow no-break space (U+202F) before the unit, which is
		// why the unit comes from Intl rather than a ' g' literal.
		expect(formatGrams(2.35, 'fr')).toBe('2,4\u202fg');
		expect(formatGrams(124, 'fr')).toBe('124\u202fg');
	});
	it('leaves the digits ungrouped in every locale', () => {
		// Grouping is off on purpose: Intl would render the same figure as
		// "1,240 g" in English and "1.240 g" in German, which changes every
		// weight on the page instead of fixing the punctuation of some.
		expect(formatGrams(1240)).toBe('1240 g');
		expect(formatGrams(1240, 'de')).toBe('1240 g');
	});
	it('rounds a half-way value under a gram up', () => {
		// `toFixed` read 0.045 off its binary representation and gave 0.04;
		// Intl rounds the decimal value, so the yeast row now says 0.05 g. The
		// only figure in the app this can reach is a yeast weight under 1 g.
		expect(formatGrams(0.045)).toBe('0.05 g');
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
	it('punctuates the ball weight in the language it is read in', () => {
		// Same bug as the weights: it reached the divide step's copy ("balls of
		// 288.6 g") in all five languages with an English decimal point.
		expect(formatBallWeight(288.6, 'de')).toBe('288,6');
		expect(formatBallWeight(288.6, 'fr')).toBe('288,6');
	});
	it('keeps the tenth when shown with its unit, and the locale spacing', () => {
		// formatGrams' digit rule would round 288.5 to 289 and throw away the
		// tenth Round numbers had just moved, so the print sheet's "6 × 288,5 g"
		// needs its own formatter rather than the ingredient one.
		expect(formatBallWeightGrams(288.5, 'de')).toBe('288,5 g');
		expect(formatBallWeightGrams(280, 'fr')).toBe('280\u202fg');
		expect(formatBallWeightGrams(280)).toBe('280 g');
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
	// Pinned as literals, one per locale. The previous version of this test
	// asserted only that the string held a digit and matched /19|7/, which every
	// plausible formatting passes — the punctuation it was meant to guard was
	// free to move, and did: German rendered "Di., 8. Sept., 19:00", three
	// abbreviation dots and two commas deep, and nothing failed.
	// ICU puts a narrow no-break space (U+202F) before the English day period on
	// newer builds and a plain space on older ones, so the raw literal differs
	// between a dev machine and CI — it failed there and passed here. The space
	// is worth keeping in the output (it is what stops "07:30" and "PM" wrapping
	// apart), so the test normalises it rather than the formatter stripping it.
	// Everything this test actually guards — field order, which commas survive,
	// the middot — is unaffected.
	const flat = (s: string) => s.replace(/\u202f/g, ' ');

	it('punctuates weekday + date + time for a headline, in every locale', () => {
		const d = new Date(2026, 4, 12, 19, 30);
		expect(flat(formatDateTime(d, 'en'))).toBe('Tue, May 12 · 07:30 PM');
		expect(formatDateTime(d, 'de')).toBe('Di. 12. Mai · 19:30');
		expect(formatDateTime(d, 'it')).toBe('mar 12 mag · 19:30');
		expect(formatDateTime(d, 'fr')).toBe('mar. 12 mai · 19:30');
		expect(formatDateTime(d, 'nl')).toBe('di 12 mei · 19:30');
	});

	// The two rules the formatter applies, each named by the case that proves it.
	it('drops the comma after a weekday that already ends in its abbreviation dot', () => {
		const d = new Date(2026, 4, 12, 19, 30);
		// de and fr abbreviate the weekday with a dot; a comma straight after it
		// is two marks doing one job.
		expect(formatDateTime(d, 'de')).not.toContain('.,');
		expect(formatDateTime(d, 'fr')).not.toContain('.,');
		// en does not, so its comma is the ordinary one and stays.
		expect(formatDateTime(d, 'en')).toContain('Tue, May');
	});

	it('separates the clock from the date with a middot, not a list comma', () => {
		const d = new Date(2026, 4, 12, 19, 30);
		for (const loc of ['en', 'de', 'it', 'fr', 'nl'] as const) {
			expect(formatDateTime(d, loc)).toContain(' · ');
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

describe('formatIsoDate', () => {
	// The community table's rows carry a bare YYYY-MM-DD. `new Date(iso)` would
	// read that as UTC and show the day before in a western timezone, so the
	// parts are parsed by hand — this is the assertion that keeps it that way.
	it('formats a bare calendar day, without a timezone shift', () => {
		expect(formatIsoDate('2026-09-05', 'en')).toBe('Sep 5, 2026');
		expect(formatIsoDate('2026-01-01', 'de')).toBe('1. Jan. 2026');
	});

	it('hands back anything it cannot read', () => {
		// community.md's parser drops malformed rows, so this is a floor, not a
		// path a shipped row takes: never render "Invalid Date" at a reader.
		expect(formatIsoDate('not-a-date', 'en')).toBe('not-a-date');
		expect(formatIsoDate('2026-09', 'en')).toBe('2026-09');
	});
});

// The plan's expert chips and the print summary wrote `${roomTempC} °C` as a
// template string, and the library's numLabel concatenated `${value}°C`, so a
// half-degree room came out "22.5 °C" in every language while the weights
// beside it had already been fixed (PR #346). The five results are pinned as
// literals: the unit spacing differs per locale and Intl owns it.
describe('formatTemperature', () => {
	it('punctuates a half degree in every locale, with the unit spacing Intl gives it', () => {
		expect(formatTemperature(22.5, 'en')).toBe('22.5°C');
		expect(formatTemperature(22.5, 'de')).toBe('22,5 °C');
		expect(formatTemperature(22.5, 'it')).toBe('22,5 °C');
		expect(formatTemperature(22.5, 'fr')).toBe('22,5\u202f°C');
		expect(formatTemperature(22.5, 'nl')).toBe('22,5°C');
	});

	it('writes a whole degree without a decimal', () => {
		expect(formatTemperature(4, 'en')).toBe('4°C');
		expect(formatTemperature(4, 'de')).toBe('4 °C');
	});

	it('rounds finer than the half-degree step the form allows', () => {
		expect(formatTemperature(22.26, 'en')).toBe('22.3°C');
	});
});

// The fit score's factor copy interpolated a raw JS number for {delta}, so a
// German reader saw "2.5 h" inside a German sentence. One decimal at most:
// that is what the copy was already rounding to by hand.
describe('formatNumber', () => {
	it('uses the locale decimal separator and at most one decimal', () => {
		expect(formatNumber(2.5, 'en')).toBe('2.5');
		expect(formatNumber(2.5, 'de')).toBe('2,5');
		expect(formatNumber(2.5, 'fr')).toBe('2,5');
		expect(formatNumber(2.55, 'en')).toBe('2.6');
	});

	it('writes an integer bare', () => {
		expect(formatNumber(5, 'en')).toBe('5');
		expect(formatNumber(5, 'de')).toBe('5');
	});

	it('never groups thousands, like every other figure here', () => {
		expect(formatNumber(1240, 'en')).toBe('1240');
		expect(formatNumber(1240, 'de')).toBe('1240');
	});
});

// MyRecipes built its own Intl.DateTimeFormat with these exact options, so the
// saved-recipe date was the one date on the page that did not come through
// here. formatIsoDate and formatDate now share one formatter per locale.
describe('formatDate', () => {
	const savedAt = new Date(2026, 8, 5, 14, 30);

	it('renders the calendar day the way formatIsoDate does', () => {
		expect(formatDate(savedAt, 'en')).toBe(formatIsoDate('2026-09-05', 'en'));
		expect(formatDate(savedAt, 'de')).toBe(formatIsoDate('2026-09-05', 'de'));
	});

	it('pins the five locales', () => {
		expect(formatDate(savedAt, 'en')).toBe('Sep 5, 2026');
		expect(formatDate(savedAt, 'de')).toBe('5. Sept. 2026');
		expect(formatDate(savedAt, 'it')).toBe('5 set 2026');
		expect(formatDate(savedAt, 'fr')).toBe('5 sept. 2026');
		expect(formatDate(savedAt, 'nl')).toBe('5 sep 2026');
	});
});
