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

	it('every key interpolates the same {placeholder} set in every locale', () => {
		// A translation that drops or misspells a {token} silently prints the
		// raw brace text to the user — pin the placeholder sets to English.
		const collect = (obj: unknown, prefix = ''): Array<[string, string]> => {
			if (typeof obj === 'string') return [[prefix, obj]];
			return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
				collect(v, prefix ? `${prefix}.${k}` : k)
			);
		};
		const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
		const reference = new Map(collect(MESSAGES.en));
		for (const loc of LOCALES) {
			for (const [key, value] of collect(MESSAGES[loc])) {
				expect(placeholders(value), `locale ${loc} key ${key} placeholder mismatch`).toEqual(
					placeholders(reference.get(key) ?? '')
				);
			}
		}
	});
});
