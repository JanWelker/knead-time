import { PREFERMENT_MAX_HOURS, PREFERMENT_MIN_HOURS } from './fermentation';
import {
	ACTIVE_NIGHT_KINDS,
	COLD_BULK_CEIL_MIN,
	COLD_BULK_FLOOR_MIN,
	NIGHT_END_HOUR,
	NIGHT_START_HOUR
} from './schedule';
import type { ComputedSchedule, DoughInputs, ScheduleStep } from './types';

// Schedule-imperfection penalties (0–100 scale). Tuned so a 2 h cold-bulk
// night-shift takes the score from 100 to ~88 — visibly off, but still
// "good". A residual night-step warning is a much bigger ding because
// nothing the math did managed to dodge it. Infeasibility is the largest
// penalty: the dough literally can't ferment in the window.
const SHIFT_PCT_PER_HOUR = 6;
const CLAMP_PCT_PER_HOUR = 8;
const NIGHT_STEP_PENALTY = 30;
const INFEASIBLE_PENALTY = 60;
const MAX_SHIFT_DEDUCT = 30;
const MAX_CLAMP_DEDUCT = 30;

// Contemporary Neapolitan KPI bands. Inputs inside the band score 100; each
// unit outside subtracts the per-unit rate, capped at the factor's max
// deduction so one extreme input can't pin the score to 0 by itself. The
// defaults from CLAUDE.md (280 g / 70 % / 3 % salt / 22 °C / 4 °C) sit in
// the middle of every band — a defaults-only recipe scores 100.
const HYDRATION_LOW = 60;
const HYDRATION_HIGH = 80;
const HYDRATION_PCT_PER_POINT = 2;
const HYDRATION_MAX_DEDUCT = 15;

const SALT_LOW = 2;
const SALT_HIGH = 3.5;
const SALT_PCT_PER_POINT = 8;
const SALT_MAX_DEDUCT = 15;

const BALL_LOW = 200;
const BALL_HIGH = 320;
const BALL_PCT_PER_GRAM = 0.2;
const BALL_MAX_DEDUCT = 10;

const ROOM_TEMP_LOW = 14;
const ROOM_TEMP_HIGH = 30;
const ROOM_TEMP_PCT_PER_DEGREE = 3;
const ROOM_TEMP_MAX_DEDUCT = 12;

const FRIDGE_TEMP_LOW = 2;
const FRIDGE_TEMP_HIGH = 8;
const FRIDGE_TEMP_PCT_PER_DEGREE = 3;
const FRIDGE_TEMP_MAX_DEDUCT = 10;

const YEAST_PCT_LOW = 0.05;
const YEAST_PCT_HIGH = 1.5;
const YEAST_EXTREME_PENALTY = 12;

// Sub-minute drift between natural and actual is rounding noise, not a real
// deviation; below this we don't flag or deduct.
const SHIFT_NOISE_FLOOR_MIN = 1;

export type StepQualityFlag =
	| 'night'
	| 'cold-bulk-shifted'
	| 'cold-bulk-clamped-short'
	| 'cold-bulk-clamped-long'
	| 'preferment-clamped-short'
	| 'preferment-clamped-long';

export type FitFactor =
	// Schedule-imperfection factors (the math couldn't deliver the natural
	// timing or had to compromise the user's intent to dodge night).
	| 'cold-bulk-shifted'
	| 'cold-bulk-clamped-short'
	| 'cold-bulk-clamped-long'
	| 'preferment-clamped-short'
	| 'preferment-clamped-long'
	| 'night-step'
	| 'infeasible'
	// Recipe-input KPI factors (deviation from contemporary Neapolitan).
	| 'hydration-off'
	| 'salt-off'
	| 'ball-weight-off'
	| 'room-temp-off'
	| 'fridge-temp-off'
	| 'yeast-extreme';

export interface FitFactorDetail {
	factor: FitFactor;
	// Magnitude of deviation, units depend on the factor:
	//   schedule shift/clamp factors → hours
	//   hydration-off, salt-off → percentage points outside the band
	//   ball-weight-off → grams outside the band
	//   room-temp-off, fridge-temp-off → degrees outside the band
	//   yeast-extreme, night-step, infeasible → 0 (binary)
	// The UI inlines this value into the localized factor label.
	delta: number;
}

export interface FitScore {
	// 0–100. 100 = actual schedule matches what the math wanted (no clamps,
	// no night-shift, feasible) AND every recipe input lands within the
	// contemporary Neapolitan band.
	score: number;
	factors: FitFactorDetail[];
}

function isNightStep(step: ScheduleStep): boolean {
	if (!ACTIVE_NIGHT_KINDS.has(step.kind)) return false;
	const h = step.at.getHours();
	return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

function coldBulkShiftMin(schedule: ComputedSchedule): number {
	if (schedule.mode !== 'cold' || schedule.naturalColdBulkMin === null) return 0;
	// In cold mode schedule.ts always emits a bulk-cold step, so the find is
	// guaranteed to succeed — the `!` reflects that invariant.
	const actual = schedule.steps.find((s) => s.kind === 'bulk-cold')!;
	const delta = actual.durationMinutes - schedule.naturalColdBulkMin;
	return Math.abs(delta) < SHIFT_NOISE_FLOOR_MIN ? 0 : delta;
}

function coldBulkClampMin(schedule: ComputedSchedule): { short: number; long: number } {
	if (
		schedule.mode !== 'cold' ||
		schedule.naturalColdBulkMin === null ||
		schedule.desiredColdBulkMin === null
	) {
		return { short: 0, long: 0 };
	}
	const short = Math.max(0, COLD_BULK_FLOOR_MIN - schedule.desiredColdBulkMin);
	const long = Math.max(0, schedule.desiredColdBulkMin - COLD_BULK_CEIL_MIN);
	return { short, long };
}

function prefermentClampHours(schedule: ComputedSchedule): { short: number; long: number } {
	const natural = schedule.naturalPrefermentHours;
	if (natural === null) return { short: 0, long: 0 };
	// Actual duration on the emitted step — may be < natural when the wall-clock
	// window was too tight to fit the pre-ferment and we shrank it to honour
	// startAt. The pre-ferment-mix step is always present when naturalHours is
	// non-null, so a missing step would be a schedule-shape bug, not an input.
	const actualHours = schedule.steps.find((s) => s.kind === 'preferment-mix')!.durationMinutes / 60;
	// 'short' folds two reasons into one penalty: temperature wanted below
	// MIN, OR time-budget forced actual below MIN. The user reads this as
	// "the pre-ferment is too short" regardless of cause.
	const short = Math.max(0, PREFERMENT_MIN_HOURS - Math.min(natural, actualHours));
	const long = Math.max(0, natural - PREFERMENT_MAX_HOURS);
	return { short, long };
}

function outsideBand(value: number, low: number, high: number): number {
	if (value < low) return low - value;
	if (value > high) return value - high;
	return 0;
}

export function stepQualityFlags(
	step: ScheduleStep,
	schedule: ComputedSchedule
): StepQualityFlag[] {
	const flags: StepQualityFlag[] = [];
	if (isNightStep(step)) flags.push('night');

	if (step.kind === 'bulk-cold') {
		if (Math.abs(coldBulkShiftMin(schedule)) >= SHIFT_NOISE_FLOOR_MIN) {
			flags.push('cold-bulk-shifted');
		}
		const { short, long } = coldBulkClampMin(schedule);
		if (short > 0) flags.push('cold-bulk-clamped-short');
		if (long > 0) flags.push('cold-bulk-clamped-long');
	}

	if (step.kind === 'preferment-mix') {
		const { short, long } = prefermentClampHours(schedule);
		if (short > 0) flags.push('preferment-clamped-short');
		if (long > 0) flags.push('preferment-clamped-long');
	}

	return flags;
}

export function recipeFitScore(schedule: ComputedSchedule, inputs: DoughInputs): FitScore {
	const factors: FitFactorDetail[] = [];

	if (!schedule.feasible) factors.push({ factor: 'infeasible', delta: 0 });

	const shift = coldBulkShiftMin(schedule);
	if (Math.abs(shift) >= SHIFT_NOISE_FLOOR_MIN) {
		factors.push({ factor: 'cold-bulk-shifted', delta: Math.abs(shift) / 60 });
	}

	const coldClamp = coldBulkClampMin(schedule);
	if (coldClamp.short > 0) {
		factors.push({ factor: 'cold-bulk-clamped-short', delta: coldClamp.short / 60 });
	}
	if (coldClamp.long > 0) {
		factors.push({ factor: 'cold-bulk-clamped-long', delta: coldClamp.long / 60 });
	}

	const prefClamp = prefermentClampHours(schedule);
	if (prefClamp.short > 0) {
		factors.push({ factor: 'preferment-clamped-short', delta: prefClamp.short });
	}
	if (prefClamp.long > 0) {
		factors.push({ factor: 'preferment-clamped-long', delta: prefClamp.long });
	}

	if (schedule.warnings.includes('night-step')) {
		factors.push({ factor: 'night-step', delta: 0 });
	}

	const hyd = outsideBand(inputs.hydration, HYDRATION_LOW, HYDRATION_HIGH);
	if (hyd > 0) factors.push({ factor: 'hydration-off', delta: hyd });

	const salt = outsideBand(inputs.saltPercent, SALT_LOW, SALT_HIGH);
	if (salt > 0) factors.push({ factor: 'salt-off', delta: salt });

	const ball = outsideBand(inputs.ballWeight, BALL_LOW, BALL_HIGH);
	if (ball > 0) factors.push({ factor: 'ball-weight-off', delta: ball });

	const roomT = outsideBand(inputs.roomTempC, ROOM_TEMP_LOW, ROOM_TEMP_HIGH);
	if (roomT > 0) factors.push({ factor: 'room-temp-off', delta: roomT });

	const fridgeT = outsideBand(inputs.fridgeTempC, FRIDGE_TEMP_LOW, FRIDGE_TEMP_HIGH);
	if (fridgeT > 0) factors.push({ factor: 'fridge-temp-off', delta: fridgeT });

	if (schedule.yeastPercent < YEAST_PCT_LOW || schedule.yeastPercent > YEAST_PCT_HIGH) {
		factors.push({ factor: 'yeast-extreme', delta: 0 });
	}

	let deduction = 0;
	for (const f of factors) {
		switch (f.factor) {
			case 'infeasible':
				deduction += INFEASIBLE_PENALTY;
				break;
			case 'night-step':
				deduction += NIGHT_STEP_PENALTY;
				break;
			case 'cold-bulk-shifted':
				deduction += Math.min(MAX_SHIFT_DEDUCT, f.delta * SHIFT_PCT_PER_HOUR);
				break;
			case 'cold-bulk-clamped-short':
			case 'cold-bulk-clamped-long':
			case 'preferment-clamped-short':
			case 'preferment-clamped-long':
				deduction += Math.min(MAX_CLAMP_DEDUCT, f.delta * CLAMP_PCT_PER_HOUR);
				break;
			case 'hydration-off':
				deduction += Math.min(HYDRATION_MAX_DEDUCT, f.delta * HYDRATION_PCT_PER_POINT);
				break;
			case 'salt-off':
				deduction += Math.min(SALT_MAX_DEDUCT, f.delta * SALT_PCT_PER_POINT);
				break;
			case 'ball-weight-off':
				deduction += Math.min(BALL_MAX_DEDUCT, f.delta * BALL_PCT_PER_GRAM);
				break;
			case 'room-temp-off':
				deduction += Math.min(ROOM_TEMP_MAX_DEDUCT, f.delta * ROOM_TEMP_PCT_PER_DEGREE);
				break;
			case 'fridge-temp-off':
				deduction += Math.min(FRIDGE_TEMP_MAX_DEDUCT, f.delta * FRIDGE_TEMP_PCT_PER_DEGREE);
				break;
			case 'yeast-extreme':
				deduction += YEAST_EXTREME_PENALTY;
				break;
		}
	}

	const score = Math.max(0, Math.min(100, Math.round(100 - deduction)));
	return { score, factors };
}
