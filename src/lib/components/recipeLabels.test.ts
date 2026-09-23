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

	it('returns the localized dry-yeast labels', () => {
		expect(yeastLabel({ yeastType: 'instant' }, t)).toBe(t.form.yeast_instant);
		expect(yeastLabel({ yeastType: 'active-dry' }, t)).toBe(t.form.yeast_active_dry);
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

// numLabel used to concatenate the raw number with a hardcoded suffix, which
// is English whatever language the rack is read in: "2.75%" and "288.5 g"
// beside a German heading. The same trap the weights fell into one renderer
// nearer the plan (PR #346), so de and fr are pinned as literals here too.
describe('numLabel', () => {
	it('renders an integer with no unit', () => {
		expect(numLabel(280, 'en')).toBe('280');
		expect(numLabel(6, 'de')).toBe('6');
	});

	it('formats a gram figure through the ball-weight formatter, tenth included', () => {
		expect(numLabel(280, 'en', 'g')).toBe('280 g');
		expect(numLabel(288.5, 'en', 'g')).toBe('288.5 g');
		expect(numLabel(288.5, 'de', 'g')).toBe('288,5 g');
		expect(numLabel(288.5, 'fr', 'g')).toBe('288,5\u202fg');
	});

	it("punctuates a decimal percentage in the reader's language", () => {
		expect(numLabel(70, 'en', '%')).toBe('70%');
		expect(numLabel(2.75, 'en', '%')).toBe('2.75%');
		expect(numLabel(2.75, 'de', '%')).toBe('2,75\u00a0%');
		expect(numLabel(2.75, 'fr', '%')).toBe('2,75\u00a0%');
		expect(numLabel(2.75, 'it', '%')).toBe('2,75%');
	});

	it("punctuates a half-degree temperature in the reader's language", () => {
		expect(numLabel(22, 'en', '°C')).toBe('22°C');
		expect(numLabel(22.5, 'de', '°C')).toBe('22,5 °C');
		expect(numLabel(4, 'fr', '°C')).toBe('4\u202f°C');
	});

	it('returns an em-dash placeholder for undefined input', () => {
		expect(numLabel(undefined, 'en')).toBe('—');
		expect(numLabel(undefined, 'de', '%')).toBe('—');
	});

	it('renders zero without skipping it', () => {
		expect(numLabel(0, 'en', '%')).toBe('0%');
	});
});
