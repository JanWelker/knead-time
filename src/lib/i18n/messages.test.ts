import { describe, expect, it } from 'vitest';
import { detectLocale, LOCALES, MESSAGES } from './messages';

describe('detectLocale', () => {
	it('returns en for empty input', () => {
		expect(detectLocale(undefined)).toBe('en');
		expect(detectLocale([])).toBe('en');
	});

	it('picks the first matching supported locale', () => {
		expect(detectLocale(['fr-FR', 'de-CH', 'en-US'])).toBe('fr');
		expect(detectLocale(['nl-BE', 'en-US'])).toBe('nl');
		expect(detectLocale(['it-IT'])).toBe('it');
	});

	it('falls back to en when nothing matches', () => {
		expect(detectLocale(['es', 'pt', 'ja'])).toBe('en');
	});
});

describe('messages parity', () => {
	it('every locale defines the same keys', () => {
		const flatten = (obj: unknown, prefix = ''): string[] => {
			if (typeof obj !== 'object' || obj === null) return [prefix];
			return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
				flatten(v, prefix ? `${prefix}.${k}` : k)
			);
		};
		const reference = flatten(MESSAGES.en).sort();
		for (const loc of LOCALES) {
			expect(flatten(MESSAGES[loc]).sort(), `locale ${loc} mismatched keys`).toEqual(reference);
		}
	});
});
