import { flourPresetForW } from './dough/flour';
import type { ComputedSchedule, ScheduleStep, ScheduleStepKind, YeastType } from './dough/types';
import { formatBallWeight, formatGrams } from './format';
import { interpolate } from './i18n/interpolate';
import type { Messages } from './i18n/messages';

// preferment-mix has no single title/description — the step's own
// preFermentType picks the biga or poolish copy, so both maps exclude it.
const TITLE: Record<Exclude<ScheduleStepKind, 'preferment-mix'>, keyof Messages['steps']> = {
	prep: 'prep',
	autolyse: 'autolyse',
	mix: 'mix',
	'bulk-room': 'bulk_room',
	'bulk-cold': 'bulk_cold',
	divide: 'divide',
	'proof-cold': 'proof_cold',
	'final-proof': 'final_proof',
	ready: 'ready'
};

const DESC: Record<Exclude<ScheduleStepKind, 'preferment-mix'>, keyof Messages['steps']> = {
	prep: 'prep_desc',
	autolyse: 'autolyse_desc',
	mix: 'mix_desc',
	'bulk-room': 'bulk_room_desc',
	'bulk-cold': 'bulk_cold_desc',
	divide: 'divide_desc',
	'proof-cold': 'proof_cold_desc',
	'final-proof': 'final_proof_desc',
	ready: 'ready_desc'
};

// Beginner-mode explanations: the why behind each step, shown as an extra
// paragraph under the method copy. One generic entry covers both pre-ferment
// types — the what-is-a-pre-ferment story is the same for biga and poolish.
const DETAIL: Record<ScheduleStepKind, keyof Messages['steps']> = {
	'preferment-mix': 'preferment_mix_detail',
	prep: 'prep_detail',
	autolyse: 'autolyse_detail',
	mix: 'mix_detail',
	'bulk-room': 'bulk_room_detail',
	'bulk-cold': 'bulk_cold_detail',
	divide: 'divide_detail',
	'proof-cold': 'proof_cold_detail',
	'final-proof': 'final_proof_detail',
	ready: 'ready_detail'
};

export function stepDetail(step: ScheduleStep, msgs: Messages): string {
	return msgs.steps[DETAIL[step.kind]];
}

// One weighed ingredient for a step, split into amount and name so the UI can
// render it as a scannable table row instead of burying it in prose.
export interface StepIngredient {
	amount: string;
	name: string;
}

// Localized ingredient-row name for whatever carries the recipe's yeast.
export function yeastIngredientName(type: YeastType, msgs: Messages): string {
	switch (type) {
		case 'fresh':
			return msgs.ingredients.fresh_yeast;
		case 'instant':
			return msgs.ingredients.instant_yeast;
		case 'active-dry':
			return msgs.ingredients.active_dry_yeast;
		case 'sourdough':
			return msgs.ingredients.sourdough_starter;
	}
}

// Localized ingredient-row name for the flour: the bag the baker picked, so
// the scale list reads like the cupboard ("Caputo Pizzeria 600 g") instead of
// a generic "Flour". A hand-typed W matches no preset and "not specified" is
// null — neither has a name, so both keep the generic label.
export function flourIngredientName(flourW: number | null, msgs: Messages): string {
	const preset = flourW === null ? null : flourPresetForW(flourW);
	return preset ? msgs.form[`flour_${preset}`] : msgs.ingredients.flour;
}

// True when this schedule carries a flour+water autolyse rest — only happens
// with no pre-ferment. Copy and ingredient attribution branch on it: prep then
// weighs flour+water alone and the salt/yeast (and any oil/sugar) are held back
// to the mix, which is the whole point of an autolyse.
function hasAutolyse(schedule: ComputedSchedule): boolean {
	return schedule.steps.some((s) => s.kind === 'autolyse');
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
	const yeastName = yeastIngredientName(schedule.yeastType, msgs);

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
				// The pre-ferment carries the recipe's yeast — whichever type it is.
				{ amount: formatGrams(pf.yeast), name: yeastName }
			];
		}
		case 'prep': {
			const flourWater: StepIngredient[] = [
				{ amount: formatGrams(ingredients.flour), name: i.flour },
				{ amount: formatGrams(ingredients.water), name: i.water }
			];
			const salt = { amount: formatGrams(ingredients.salt), name: i.salt };
			// Autolyse: only flour and water go on the scale now; salt, yeast and
			// any oil/sugar are held back and weighed at the mix.
			if (hasAutolyse(schedule)) return flourWater;
			// With a pre-ferment the yeast is already in the pre-dough, and oil/sugar
			// are weighed at the mix step — so day-two prep only weighs the basics.
			if (schedule.preFerments.length > 0) return [...flourWater, salt];
			return [
				...flourWater,
				salt,
				{ amount: formatGrams(ingredients.yeast), name: yeastName },
				...extras
			];
		}
		case 'mix':
			// Autolyse held back the salt and yeast (and any oil/sugar) — they're
			// weighed here, onto the rested flour-water dough.
			if (hasAutolyse(schedule)) {
				return [
					{ amount: formatGrams(ingredients.salt), name: i.salt },
					{ amount: formatGrams(ingredients.yeast), name: yeastName },
					...extras
				];
			}
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
		const base =
			step.preFermentType === 'biga'
				? msgs.steps.preferment_mix_desc_biga
				: msgs.steps.preferment_mix_desc_poolish;
		// The base copy says "at room temperature" — when the user parked the
		// pre-ferment in a cellar or wine fridge, correct it explicitly.
		if (schedule && schedule.preFermentTempC !== null) {
			return `${base} ${interpolate(msgs.steps.preferment_temp_note, {
				temp: schedule.preFermentTempC
			})}`;
		}
		return base;
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
			if (prefermentTypes.length > 0) return msgs.steps.prep_desc_with_preferment;
			// Autolyse: prep combines flour and water (where the water temperature is
			// set, so it carries the {water_temp} note) into a shaggy mass.
			return hasAutolyse(schedule)
				? interpolate(msgs.steps.prep_desc_autolyse, { water_temp: schedule.idealWaterTempC })
				: template;
		case 'mix': {
			const waterTemp = { water_temp: schedule.idealWaterTempC };
			// The base descriptions are method-neutral; the how-to-knead sentence
			// is appended per mixing method so the copy matrix stays small.
			const technique =
				schedule.mixingMethod === 'hand'
					? msgs.steps.mix_technique_hand
					: schedule.mixingMethod === 'stand'
						? msgs.steps.mix_technique_stand
						: msgs.steps.mix_technique_spiral;
			let base = template;
			if (prefermentTypes.length > 1) base = msgs.steps.mix_desc_with_both;
			else if (prefermentTypes[0] === 'biga') base = msgs.steps.mix_desc_with_biga;
			else if (prefermentTypes[0] === 'poolish') base = msgs.steps.mix_desc_with_poolish;
			// No pre-ferment but an autolyse rest: the mix now folds in the
			// held-back salt and yeast before kneading.
			else if (hasAutolyse(schedule)) base = msgs.steps.mix_desc_autolyse;
			return `${interpolate(base, waterTemp)} ${technique}`;
		}
		default:
			return template;
	}
}

// Flat text form (ingredient lines + method) for the .ics export, so a
// calendar event carries the same detail the on-page step shows. In beginner
// mode the caller opts into the explanatory paragraph as well — calendars
// have no page budget, and the beginner is exactly who reads them mid-bake.
export function stepDetailText(
	step: ScheduleStep,
	msgs: Messages,
	schedule: ComputedSchedule,
	opts?: { includeDetail?: boolean }
): string {
	const lines = stepIngredients(step, msgs, schedule).map((ing) => `${ing.amount} ${ing.name}`);
	lines.push(stepDescription(step, msgs, schedule));
	if (opts?.includeDetail) lines.push(stepDetail(step, msgs));
	return lines.join('\n');
}
