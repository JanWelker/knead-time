import { ingredientTotals } from './dough/bakers';
import type { Ingredients, YeastType } from './dough/types';
import { formatGrams, formatPercent } from './format';
import type { Messages } from './i18n/messages';
import { flourIngredientName, yeastIngredientName } from './stepCopy';

// What the ingredients table says, as data. The screen and the print sheet
// show the same weights in the same order — one flat table without a
// pre-ferment, one typed pre-dough section per entry plus main dough and
// totals with one — and each used to build that shape in its own markup.
//
// The rules are small but real and neither component tested them: oil and
// sugar rows appear only above 0 so a defaults-only recipe stays unchanged;
// the main-dough yeast row is hidden under a pre-ferment because the yeast is
// already in the pre-dough, and the totals row is where it resurfaces; the
// yeast percentage rides on the row that carries the recipe's whole yeast
// mass. Two copies of that is two chances to be subtly different on paper
// from what the screen said.

export interface IngredientRow {
	label: string;
	/** Formatted weight, e.g. "612 g" — both renderers print the same string. */
	amount: string;
	/** Parenthetical after the label, e.g. the yeast's baker's percentage. */
	hint?: string;
}

export interface IngredientSection {
	/** Stable key for an {#each}. */
	key: string;
	/** Section heading, or null for the single-table case that needs none. */
	heading: string | null;
	/** Explanatory line under the heading. The print sheet has no room for it. */
	help: string | null;
	rows: IngredientRow[];
	/** The bold "total dough" row, on the last section only. */
	total: IngredientRow | null;
}

export function ingredientSections(
	ingredients: Ingredients,
	yeastType: YeastType,
	yeastPercent: number,
	flourW: number | null,
	msgs: Messages
): IngredientSection[] {
	const i = msgs.ingredients;
	const flour = flourIngredientName(flourW, msgs);
	const yeast = yeastIngredientName(yeastType, msgs);
	const row = (label: string, grams: number, hint?: string): IngredientRow => ({
		label,
		amount: formatGrams(grams),
		...(hint === undefined ? {} : { hint })
	});

	// Weighed for the main dough, never for a pre-ferment — that stays a
	// flour-water-yeast culture.
	const extras: IngredientRow[] = [];
	if (ingredients.oil > 0) extras.push(row(i.oil, ingredients.oil));
	if (ingredients.sugar > 0) extras.push(row(i.sugar, ingredients.sugar));

	const totalRow = row(i.total, ingredients.totalDough);

	if (ingredients.preFerments.length === 0) {
		return [
			{
				key: 'dough',
				heading: null,
				help: null,
				rows: [
					row(flour, ingredients.flour),
					row(i.water, ingredients.water),
					row(i.salt, ingredients.salt),
					...extras,
					row(yeast, ingredients.yeast, formatPercent(yeastPercent))
				],
				total: totalRow
			}
		];
	}

	const totals = ingredientTotals(ingredients);
	return [
		...ingredients.preFerments.map((pf) => ({
			key: pf.type,
			heading: pf.type === 'biga' ? i.preFerment_heading_biga : i.preFerment_heading_poolish,
			help: i.preFerment_help,
			rows: [row(flour, pf.flour), row(i.water, pf.water), row(yeast, pf.yeast)],
			total: null
		})),
		{
			key: 'main',
			heading: i.mainDough_heading,
			help: i.mainDough_help,
			rows: [
				row(flour, ingredients.flour),
				row(i.water, ingredients.water),
				row(i.salt, ingredients.salt),
				...extras
				// No yeast row: with a pre-ferment the pre-doughs carry all of it
				// (computeIngredients sets the main dough's yeast to exactly 0), and
				// the totals section below is where it resurfaces. Both components
				// guarded this with `yeast > 0`, a condition that has never once been
				// true — the coverage gate is what pointed that out.
			],
			total: null
		},
		{
			key: 'totals',
			heading: i.totals_heading,
			help: null,
			rows: [
				row(flour, totals.flour),
				row(i.water, totals.water),
				row(i.salt, totals.salt),
				...extras,
				row(yeast, totals.yeast, formatPercent(yeastPercent))
			],
			total: totalRow
		}
	];
}

// A 1 g kitchen scale cannot weigh a 0.8 g yeast pinch — surface the hint
// whenever any yeast amount on the page drops below 2 g.
export function needsFineScale(ingredients: Ingredients): boolean {
	return (
		(ingredients.yeast > 0 && ingredients.yeast < 2) ||
		ingredients.preFerments.some((pf) => pf.yeast > 0 && pf.yeast < 2)
	);
}
