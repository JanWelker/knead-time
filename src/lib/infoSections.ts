import type { Messages } from './i18n/messages';

// The "Get nerdy" panel, as data. CLAUDE.md calls that panel a contract with
// the user: every calculation in src/lib/dough/ (plus quality.ts's star
// rating) has to be represented there, and the copy has to match the code.
//
// It used to be thirteen near-identical blocks of markup in InputForm.svelte,
// each repeating the same <p class="font-semibold">/<p class="mt-1">/<pre
// class="…150 characters…"> scaffolding. Nothing checked that the panel and
// the message bundle agreed: a formula could be dropped from the markup, or a
// message added and never rendered, and both suites stayed green. As a list,
// the panel can be — and is — tested (infoSections.test.ts): every key here
// exists in every locale, and every info_* message is rendered exactly once.

type FormKey = keyof Messages['form'];

export type InfoPart =
	| { kind: 'text'; key: FormKey }
	/** A bulleted list of short one-liners. */
	| { kind: 'list'; keys: FormKey[] }
	/** A formula, shown verbatim. Not translated: it is the code's own maths. */
	| { kind: 'formula'; formula: string };

export interface InfoSection {
	title: FormKey;
	parts: InfoPart[];
}

const text = (key: FormKey): InfoPart => ({ kind: 'text', key });
const formula = (f: string): InfoPart => ({ kind: 'formula', formula: f });

// Order is the reading order on screen: the temperature model first, then what
// it is applied to, then the schedule that spends the result, then the recipe
// the schedule weighs out, and finally the bands and defaults that bound it.
export const INFO_SECTIONS: readonly InfoSection[] = [
	{
		title: 'info_q10_title',
		parts: [text('info_q10_caption'), formula('f(T) = 2^((T − 22) / 10)')]
	},
	{
		title: 'info_units_title',
		parts: [
			text('info_units_body'),
			{ kind: 'list', keys: ['info_units_fresh', 'info_units_sourdough'] },
			text('info_units_solve'),
			formula('yeast% = target / Σ (w · hours · f(T))'),
			text('info_units_carriers')
		]
	},
	{
		title: 'info_preferment_title',
		parts: [
			text('info_preferment_body'),
			{ kind: 'list', keys: ['info_preferment_biga', 'info_preferment_poolish'] },
			text('info_preferment_wall'),
			formula('wallHours = refHours / f(roomTempC),  8 ≤ wallHours ≤ 24'),
			text('info_preferment_yeast')
		]
	},
	{ title: 'info_switch_title', parts: [text('info_switch_body')] },
	{ title: 'info_budget_title', parts: [text('info_budget_body')] },
	{ title: 'info_autolyse_title', parts: [text('info_autolyse_body')] },
	{
		title: 'info_water_title',
		parts: [text('info_water_body'), formula('water = 3·23 − 2·room − friction')]
	},
	{
		title: 'info_mass_title',
		parts: [
			text('info_mass_body'),
			formula('flour = total / pctSum'),
			text('info_mass_caption_fresh'),
			formula('pctSum = 100 + hydration + salt% + yeast% + oil% + sugar%'),
			text('info_mass_caption_sourdough'),
			formula('pctSum = 100 + hydration + salt% + oil% + sugar%')
		]
	},
	{ title: 'info_round_title', parts: [text('info_round_body')] },
	{ title: 'info_fit_title', parts: [text('info_fit_body')] },
	{
		title: 'info_flour_title',
		parts: [text('info_flour_body'), formula('hours(W) = lo · (hi/lo)^((W − Wlo) / (Whi − Wlo))')]
	},
	{ title: 'info_defaults_title', parts: [text('info_defaults_body')] },
	{ title: 'info_night_title', parts: [text('info_night_body')] }
];

/** Every message key the panel renders, headings included. */
export function infoSectionKeys(): FormKey[] {
	return INFO_SECTIONS.flatMap((section) => [
		section.title,
		...section.parts.flatMap((part) =>
			part.kind === 'text' ? [part.key] : part.kind === 'list' ? part.keys : []
		)
	]);
}
