import type { ComputedSchedule, ScheduleStep, ScheduleStepKind } from './dough/types';
import { formatBallWeight, formatGrams } from './format';
import { interpolate } from './i18n/interpolate';
import type { Messages } from './i18n/messages';

// preferment-mix has no single title/description — the step's own
// preFermentType picks the biga or poolish copy, so both maps exclude it.
const TITLE: Record<Exclude<ScheduleStepKind, 'preferment-mix'>, keyof Messages['steps']> = {
	prep: 'prep',
	mix: 'mix',
	'bulk-room': 'bulk_room',
	'bulk-cold': 'bulk_cold',
	divide: 'divide',
	'final-proof': 'final_proof',
	ready: 'ready'
};

const DESC: Record<Exclude<ScheduleStepKind, 'preferment-mix'>, keyof Messages['steps']> = {
	prep: 'prep_desc',
	mix: 'mix_desc',
	'bulk-room': 'bulk_room_desc',
	'bulk-cold': 'bulk_cold_desc',
	divide: 'divide_desc',
	'final-proof': 'final_proof_desc',
	ready: 'ready_desc'
};

// One weighed ingredient for a step, split into amount and name so the UI can
// render it as a scannable table row instead of burying it in prose.
export interface StepIngredient {
	amount: string;
	name: string;
}

export function stepTitle(step: ScheduleStep, msgs: Messages): string {
	if (step.kind === 'preferment-mix') {
		return step.preFermentType === 'biga'
			? msgs.steps.preferment_mix_biga
			: msgs.steps.preferment_mix_poolish;
	}
	return msgs.steps[TITLE[step.kind]];
}

// The ingredients a step newly puts on the scale. Empty for steps that only
// wait or shape (bulk, divide, proof, ready) and for anything already weighed
// at an earlier step. The amounts are pulled straight from the computed
// schedule so they always match the Ingredients table; oil and sugar only
// appear when the recipe actually calls for them.
export function stepIngredients(
	step: ScheduleStep,
	msgs: Messages,
	schedule: ComputedSchedule
): StepIngredient[] {
	const { ingredients } = schedule;
	const i = msgs.ingredients;
	const yeastName = schedule.yeastType === 'fresh' ? i.fresh_yeast : i.sourdough_starter;

	// Oil/sugar are weighed for the main dough; they never enter the pre-ferment.
	const extras: StepIngredient[] = [];
	if (ingredients.oil > 0) extras.push({ amount: formatGrams(ingredients.oil), name: i.oil });
	if (ingredients.sugar > 0) extras.push({ amount: formatGrams(ingredients.sugar), name: i.sugar });

	switch (step.kind) {
		case 'preferment-mix': {
			// Each parallel pre-ferment weighs its own pre-dough — the step's
			// type picks the matching entry.
			const pf = ingredients.preFerments.find((p) => p.type === step.preFermentType)!;
			return [
				{ amount: formatGrams(pf.flour), name: i.flour },
				{ amount: formatGrams(pf.water), name: i.water },
				{ amount: formatGrams(pf.yeast), name: i.fresh_yeast }
			];
		}
		case 'prep': {
			const base: StepIngredient[] = [
				{ amount: formatGrams(ingredients.flour), name: i.flour },
				{ amount: formatGrams(ingredients.water), name: i.water },
				{ amount: formatGrams(ingredients.salt), name: i.salt }
			];
			// With a pre-ferment the yeast is already in the pre-dough, and oil/sugar
			// are weighed at the mix step — so day-two prep only weighs the basics.
			if (schedule.preFerments.length > 0) return base;
			return [...base, { amount: formatGrams(ingredients.yeast), name: yeastName }, ...extras];
		}
		case 'mix':
			// Everything else already went on the scale at prep — repeating it here
			// would render the same table twice in a row. Only the extras are newly
			// weighed at mix, and only under a pre-ferment (without one they're
			// weighed at prep too).
			return schedule.preFerments.length > 0 ? extras : [];
		default:
			return [];
	}
}

// The method copy for a step — what the baker actually does, with the
// ingredient amounts factored out into stepIngredients(). Returns the raw
// template (placeholders intact) when no schedule context is supplied.
export function stepDescription(
	step: ScheduleStep,
	msgs: Messages,
	schedule?: ComputedSchedule
): string {
	// The step's own type carries everything the pre-ferment copy needs, so
	// this works with or without schedule context.
	if (step.kind === 'preferment-mix') {
		return step.preFermentType === 'biga'
			? msgs.steps.preferment_mix_desc_biga
			: msgs.steps.preferment_mix_desc_poolish;
	}

	const template = msgs.steps[DESC[step.kind]];

	if (!schedule) return template;

	const prefermentTypes = schedule.preFerments.map((pf) => pf.type);

	switch (step.kind) {
		case 'divide':
			return interpolate(template, {
				n: schedule.pizzaCount,
				weight: formatBallWeight(schedule.ballWeight)
			});
		case 'prep':
			return prefermentTypes.length > 0 ? msgs.steps.prep_desc_with_preferment : template;
		case 'mix': {
			const waterTemp = { water_temp: schedule.idealWaterTempC };
			// The base descriptions are method-neutral; the how-to-knead sentence
			// is appended per mixing method so the copy matrix stays small.
			const technique =
				schedule.mixingMethod === 'hand'
					? msgs.steps.mix_technique_hand
					: msgs.steps.mix_technique_machine;
			let base = template;
			if (prefermentTypes.length > 1) base = msgs.steps.mix_desc_with_both;
			else if (prefermentTypes[0] === 'biga') base = msgs.steps.mix_desc_with_biga;
			else if (prefermentTypes[0] === 'poolish') base = msgs.steps.mix_desc_with_poolish;
			return `${interpolate(base, waterTemp)} ${technique}`;
		}
		default:
			return template;
	}
}

// Flat text form (ingredient lines + method) for the .ics export, so a
// calendar event carries the same detail the on-page step shows.
export function stepDetailText(
	step: ScheduleStep,
	msgs: Messages,
	schedule: ComputedSchedule
): string {
	const lines = stepIngredients(step, msgs, schedule).map((ing) => `${ing.amount} ${ing.name}`);
	lines.push(stepDescription(step, msgs, schedule));
	return lines.join('\n');
}
