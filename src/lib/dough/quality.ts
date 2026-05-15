import { PREFERMENT_MAX_HOURS, PREFERMENT_MIN_HOURS } from './fermentation';
import {
	COLD_BULK_CEIL_MIN,
	COLD_BULK_FLOOR_MIN,
	NIGHT_END_HOUR,
	NIGHT_START_HOUR
} from './schedule';
import type { ComputedSchedule, ScheduleStep, ScheduleStepKind } from './types';

// Baker-action step kinds — keep this aligned with schedule.ts'
// ACTIVE_NIGHT_KINDS. We don't re-export the runtime set from there because
// the night-window guard there cares about a slightly different question (can
// this step be moved?) than this module (is the baker on the clock here?). If
// the two diverge in the future, that's fine — they answer different things.
const ACTIVE_NIGHT_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
	'preferment-mix',
	'prep',
	'mix',
	'bulk-room',
	'bulk-cold',
	'divide'
]);

// Yeast % outside this band signals the math is compensating for an awkward
// time window (rushed → high yeast; very long → almost no yeast). Bounds are
// chosen against the bench rule of thumb (~0.1–1.0 % at 22 °C for fresh) with
// a little margin so we don't penalise reasonable fast/slow recipes.
const YEAST_PCT_LOW = 0.05;
const YEAST_PCT_HIGH = 1.5;

// Below 12 h the dough hasn't built much flavour. We don't penalise a long
// total window — the cold-bulk ceiling caps the schedule at ~78 h even with
// a maxed-out pre-ferment, so a separate upper bound would never fire.
const TOTAL_HOURS_LOW = 12;

export type StepQualityFlag = 'night' | 'clamped-short' | 'clamped-long';

// Reasons that subtract a star from the recipe fit score. Each reason can
// fire at most once per recipe — multiple clamped steps still cost one star.
export type FitFactor =
	| 'night'
	| 'clamp-preferment'
	| 'clamp-bulk-cold'
	| 'extreme-yeast'
	| 'window';

export interface FitScore {
	score: 1 | 2 | 3 | 4 | 5;
	factors: FitFactor[];
}

export function stepQualityFlags(step: ScheduleStep): StepQualityFlag[] {
	const flags: StepQualityFlag[] = [];
	if (ACTIVE_NIGHT_KINDS.has(step.kind)) {
		const h = step.at.getHours();
		if (h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR) flags.push('night');
	}
	if (step.kind === 'preferment-mix') {
		if (step.durationMinutes <= PREFERMENT_MIN_HOURS * 60) flags.push('clamped-short');
		else if (step.durationMinutes >= PREFERMENT_MAX_HOURS * 60) flags.push('clamped-long');
	}
	if (step.kind === 'bulk-cold') {
		if (step.durationMinutes <= COLD_BULK_FLOOR_MIN) flags.push('clamped-short');
		else if (step.durationMinutes >= COLD_BULK_CEIL_MIN) flags.push('clamped-long');
	}
	return flags;
}

export function recipeFitScore(schedule: ComputedSchedule): FitScore {
	const factors: FitFactor[] = [];

	if (schedule.warnings.includes('night-step')) factors.push('night');

	for (const step of schedule.steps) {
		const flags = stepQualityFlags(step);
		const clamped = flags.includes('clamped-short') || flags.includes('clamped-long');
		if (!clamped) continue;
		if (step.kind === 'preferment-mix' && !factors.includes('clamp-preferment')) {
			factors.push('clamp-preferment');
		}
		if (step.kind === 'bulk-cold' && !factors.includes('clamp-bulk-cold')) {
			factors.push('clamp-bulk-cold');
		}
	}

	if (schedule.yeastPercent < YEAST_PCT_LOW || schedule.yeastPercent > YEAST_PCT_HIGH) {
		factors.push('extreme-yeast');
	}

	if (schedule.steps.length >= 2) {
		const first = schedule.steps[0];
		const last = schedule.steps[schedule.steps.length - 1];
		const windowH = (last.at.getTime() - first.at.getTime()) / 3_600_000;
		if (windowH < TOTAL_HOURS_LOW) factors.push('window');
	}

	const score = Math.max(1, 5 - factors.length) as 1 | 2 | 3 | 4 | 5;
	return { score, factors };
}
