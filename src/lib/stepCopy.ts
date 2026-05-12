import type { ComputedSchedule, ScheduleStep, ScheduleStepKind } from './dough/types';
import { formatDurationHHMM, formatGramsValue } from './format';
import { interpolate } from './i18n/interpolate';
import type { Messages } from './i18n/messages';

const TITLE: Record<ScheduleStepKind, keyof Messages['steps']> = {
	'preferment-mix': 'preferment_mix',
	prep: 'prep',
	mix: 'mix',
	'bulk-room': 'bulk_room',
	'bulk-cold': 'bulk_cold',
	divide: 'divide',
	warmup: 'warmup',
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
	warmup: 'warmup_desc',
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

	switch (step.kind) {
		case 'bulk-room':
		case 'bulk-cold':
		case 'warmup':
		case 'final-proof':
			return interpolate(template, { duration: formatDurationHHMM(step.durationMinutes) });
	}

	if (!schedule) return template;

	const { ingredients } = schedule;
	const yeastLabel =
		schedule.yeastType === 'fresh'
			? msgs.ingredients.fresh_yeast_inline
			: msgs.ingredients.sourdough_starter_inline;

	switch (step.kind) {
		case 'divide':
			return interpolate(template, {
				n: schedule.pizzaCount,
				weight: formatGramsValue(schedule.ballWeight)
			});
		case 'preferment-mix': {
			if (!ingredients.preFerment) return template;
			const prepStep = schedule.steps.find((s) => s.kind === 'prep');
			const maturationMin = prepStep
				? Math.round((prepStep.at.getTime() - step.at.getTime()) / 60_000)
				: 0;
			return interpolate(template, {
				flour: formatGramsValue(ingredients.preFerment.flour),
				water: formatGramsValue(ingredients.preFerment.water),
				yeast: formatGramsValue(ingredients.preFerment.yeast),
				duration: formatDurationHHMM(maturationMin)
			});
		}
		case 'prep':
			return interpolate(template, {
				flour: formatGramsValue(ingredients.flour),
				water: formatGramsValue(ingredients.water),
				salt: formatGramsValue(ingredients.salt),
				yeast: formatGramsValue(ingredients.yeast),
				yeast_label: yeastLabel
			});
		case 'mix': {
			const mixTemplate = ingredients.preFerment ? msgs.steps.mix_desc_with_preferment : template;
			return interpolate(mixTemplate, {
				flour: formatGramsValue(ingredients.flour),
				water: formatGramsValue(ingredients.water),
				salt: formatGramsValue(ingredients.salt),
				yeast: formatGramsValue(ingredients.yeast),
				yeast_label: yeastLabel
			});
		}
		default:
			return template;
	}
}
