import type { ComputedSchedule, ScheduleStep, ScheduleStepKind } from './dough/types';
import { formatBallWeight, formatGramsValue } from './format';
import { interpolate } from './i18n/interpolate';
import type { Messages } from './i18n/messages';

const TITLE: Record<ScheduleStepKind, keyof Messages['steps']> = {
	'preferment-mix': 'preferment_mix',
	prep: 'prep',
	mix: 'mix',
	'bulk-room': 'bulk_room',
	'bulk-cold': 'bulk_cold',
	divide: 'divide',
	'final-proof': 'final_proof',
	ready: 'ready'
};

const DESC: Record<ScheduleStepKind, keyof Messages['steps']> = {
	'preferment-mix': 'preferment_mix_desc',
	prep: 'prep_desc',
	mix: 'mix_desc',
	'bulk-room': 'bulk_room_desc',
	'bulk-cold': 'bulk_cold_desc',
	divide: 'divide_desc',
	'final-proof': 'final_proof_desc',
	ready: 'ready_desc'
};

export function stepTitle(step: ScheduleStep, msgs: Messages): string {
	return msgs.steps[TITLE[step.kind]];
}

export function stepDescription(
	step: ScheduleStep,
	msgs: Messages,
	schedule?: ComputedSchedule
): string {
	const template = msgs.steps[DESC[step.kind]];

	if (!schedule) return template;

	const { ingredients } = schedule;
	const yeastLabel =
		schedule.yeastType === 'fresh'
			? msgs.ingredients.fresh_yeast_inline
			: msgs.ingredients.sourdough_starter_inline;
	const prefermentType = schedule.preFerment?.type ?? null;

	switch (step.kind) {
		case 'divide':
			return interpolate(template, {
				n: schedule.pizzaCount,
				weight: formatBallWeight(schedule.ballWeight)
			});
		case 'preferment-mix': {
			const pfTemplate =
				prefermentType === 'biga'
					? msgs.steps.preferment_mix_desc_biga
					: msgs.steps.preferment_mix_desc_poolish;
			return interpolate(pfTemplate, {
				flour: formatGramsValue(ingredients.preFerment!.flour),
				water: formatGramsValue(ingredients.preFerment!.water),
				yeast: formatGramsValue(ingredients.preFerment!.yeast)
			});
		}
		case 'prep':
			if (prefermentType) {
				return interpolate(msgs.steps.prep_desc_with_preferment, {
					flour: formatGramsValue(ingredients.flour),
					water: formatGramsValue(ingredients.water),
					salt: formatGramsValue(ingredients.salt)
				});
			}
			return appendExtras(
				interpolate(template, {
					flour: formatGramsValue(ingredients.flour),
					water: formatGramsValue(ingredients.water),
					salt: formatGramsValue(ingredients.salt),
					yeast: formatGramsValue(ingredients.yeast),
					yeast_label: yeastLabel
				}),
				ingredients.oil,
				ingredients.sugar,
				msgs
			);
		case 'mix': {
			const waterTemp = schedule.idealWaterTempC;
			const base = {
				flour: formatGramsValue(ingredients.flour),
				water: formatGramsValue(ingredients.water),
				salt: formatGramsValue(ingredients.salt),
				water_temp: waterTemp
			};
			let body: string;
			if (prefermentType === 'biga') {
				body = interpolate(msgs.steps.mix_desc_with_biga, base);
			} else if (prefermentType === 'poolish') {
				body = interpolate(msgs.steps.mix_desc_with_poolish, base);
			} else {
				body = interpolate(template, {
					...base,
					yeast: formatGramsValue(ingredients.yeast),
					yeast_label: yeastLabel
				});
			}
			return appendExtras(body, ingredients.oil, ingredients.sugar, msgs);
		}
		default:
			return template;
	}
}

// Appends a localized "plus N g oil / M g sugar" trailer when either is present.
// The combined-key wording reads more naturally than two separate clauses, so we
// pick the matching variant rather than concatenating.
function appendExtras(base: string, oil: number, sugar: number, msgs: Messages): string {
	const oilStr = formatGramsValue(oil);
	const sugarStr = formatGramsValue(sugar);
	if (oil > 0 && sugar > 0) {
		return base + ' ' + interpolate(msgs.steps.extras_oil_sugar, { oil: oilStr, sugar: sugarStr });
	}
	if (oil > 0) return base + ' ' + interpolate(msgs.steps.extras_oil, { oil: oilStr });
	if (sugar > 0) return base + ' ' + interpolate(msgs.steps.extras_sugar, { sugar: sugarStr });
	return base;
}
