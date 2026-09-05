import { describe, expect, it } from 'vitest';
import { ingredientSections, needsFineScale } from './ingredientRows';
import { computeSchedule } from './dough/schedule';
import { defaultInputs } from './dough/testFixtures';
import { MESSAGES } from './i18n/messages';
import type { DoughInputs } from './dough/types';

const t = MESSAGES.en;

function sectionsFor(overrides: Partial<DoughInputs> = {}) {
	const inputs = defaultInputs(overrides);
	const schedule = computeSchedule(inputs);
	return ingredientSections(
		schedule.ingredients,
		inputs.yeastType,
		schedule.yeastPercent,
		inputs.flourW,
		t
	);
}

const labels = (rows: { label: string }[]) => rows.map((r) => r.label);

// These rules used to live twice — once in Ingredients.svelte, once in the
// print route — and neither copy was tested. The screen and the paper have to
// agree about what is weighed out, so they now read the same list.
describe('a recipe with no pre-ferment', () => {
	it('is one table, ending in the total', () => {
		const [section, ...rest] = sectionsFor();
		expect(rest).toEqual([]);
		expect(section.heading).toBeNull();
		expect(labels(section.rows)).toEqual(['Flour', 'Water', 'Salt', 'Fresh yeast']);
		expect(section.total?.label).toBe('Total dough');
	});

	it('names the flour after the bag when one was chosen', () => {
		expect(sectionsFor({ flourW: 265 })[0].rows[0].label).toBe('Caputo Pizzeria');
	});

	it('carries the yeast percentage on the yeast row', () => {
		const yeast = sectionsFor()[0].rows[3];
		expect(yeast.hint).toMatch(/%$/);
	});

	it('leaves oil and sugar out at 0, and weighs them when asked for', () => {
		expect(labels(sectionsFor()[0].rows)).not.toContain('Oil');
		const enriched = sectionsFor({ oilPercent: 2, sugarPercent: 1 });
		expect(labels(enriched[0].rows)).toEqual([
			'Flour',
			'Water',
			'Salt',
			'Oil',
			'Sugar',
			'Fresh yeast'
		]);
	});
});

describe('a recipe with pre-ferments', () => {
	const both = {
		preFerments: [
			{ type: 'biga' as const, flourPercent: 30 },
			{ type: 'poolish' as const, flourPercent: 20 }
		]
	};

	it('is one section per pre-dough, then the main dough, then totals', () => {
		expect(sectionsFor(both).map((s) => s.key)).toEqual(['biga', 'poolish', 'main', 'totals']);
	});

	it('hides the main-dough yeast row — the pre-doughs carry it', () => {
		const main = sectionsFor(both).find((s) => s.key === 'main')!;
		expect(labels(main.rows)).toEqual(['Flour', 'Water', 'Salt']);
	});

	it('surfaces the yeast, with its percentage, in the totals', () => {
		const totals = sectionsFor(both).find((s) => s.key === 'totals')!;
		expect(labels(totals.rows)).toEqual(['Flour', 'Water', 'Salt', 'Fresh yeast']);
		expect(totals.rows[3].hint).toMatch(/%$/);
		expect(totals.total?.label).toBe('Total dough');
	});

	it('puts the total on the last section only', () => {
		expect(
			sectionsFor(both)
				.filter((s) => s.total !== null)
				.map((s) => s.key)
		).toEqual(['totals']);
	});

	it('keeps oil and sugar out of the pre-dough', () => {
		const sections = sectionsFor({ ...both, oilPercent: 2, sugarPercent: 1 });
		expect(labels(sections[0].rows)).toEqual(['Flour', 'Water', 'Fresh yeast']);
		expect(labels(sections[2].rows)).toContain('Oil');
	});
});

describe('needsFineScale', () => {
	// 2 g is the edge: a 1 g kitchen scale cannot weigh a pinch below it.
	it('fires when a yeast weight lands under 2 g', () => {
		expect(needsFineScale({ ...base(), yeast: 1.9 })).toBe(true);
		expect(needsFineScale({ ...base(), yeast: 2 })).toBe(false);
	});

	it('ignores a zero — that is a recipe with no yeast of its own, not a pinch', () => {
		expect(needsFineScale({ ...base(), yeast: 0 })).toBe(false);
	});

	it('looks at the pre-doughs too, where the yeast actually is', () => {
		const ing = { ...base(), yeast: 0 };
		expect(
			needsFineScale({
				...ing,
				preFerments: [{ type: 'biga', flour: 300, water: 150, yeast: 0.4 }]
			})
		).toBe(true);
		expect(
			needsFineScale({ ...ing, preFerments: [{ type: 'biga', flour: 300, water: 150, yeast: 3 }] })
		).toBe(false);
	});

	function base() {
		return computeSchedule(defaultInputs()).ingredients;
	}
});
