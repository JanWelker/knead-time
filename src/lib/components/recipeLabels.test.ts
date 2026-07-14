import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../i18n/messages';
import { numLabel, preFermentLabel, yeastLabel } from './recipeLabels';

const t = MESSAGES.en;

describe('yeastLabel', () => {
	it('returns the localized fresh-yeast label', () => {
		expect(yeastLabel({ yeastType: 'fresh' }, t)).toBe(t.form.yeast_fresh);
	});

	it('returns the localized sourdough label', () => {
		expect(yeastLabel({ yeastType: 'sourdough' }, t)).toBe(t.form.yeast_sourdough);
	});

	it('returns an em-dash placeholder when yeast type is missing', () => {
		expect(yeastLabel({}, t)).toBe('—');
	});
});

describe('preFermentLabel', () => {
	it('returns an em-dash placeholder when no pre-ferment is set', () => {
		expect(preFermentLabel({ preFerments: [] }, t)).toBe('—');
	});

	it('returns an em-dash placeholder when the field is missing entirely', () => {
		expect(preFermentLabel({}, t)).toBe('—');
	});

	it('renders biga with its flour percentage and strips the parenthetical', () => {
		const label = preFermentLabel({ preFerments: [{ type: 'biga', flourPercent: 30 }] }, t);
		expect(label.startsWith('Biga')).toBe(true);
		expect(label).toContain('30%');
		expect(label).not.toContain('(');
	});

	it('renders poolish with its flour percentage', () => {
		const label = preFermentLabel({ preFerments: [{ type: 'poolish', flourPercent: 25 }] }, t);
		expect(label.startsWith('Poolish')).toBe(true);
		expect(label).toContain('25%');
	});

	it('joins combined pre-ferments with a plus sign', () => {
		const label = preFermentLabel(
			{
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			},
			t
		);
		expect(label).toBe('Biga 30% + Poolish 20%');
	});
});

describe('numLabel', () => {
	it('renders an integer with no suffix', () => {
		expect(numLabel(280)).toBe('280');
	});

	it('appends a suffix when provided', () => {
		expect(numLabel(70, '%')).toBe('70%');
		expect(numLabel(280, ' g')).toBe('280 g');
	});

	it('returns an em-dash placeholder for undefined input', () => {
		expect(numLabel(undefined)).toBe('—');
	});

	it('renders zero without skipping it', () => {
		expect(numLabel(0, '%')).toBe('0%');
	});
});
