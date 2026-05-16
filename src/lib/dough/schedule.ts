import { computeIngredients } from './bakers';
import {
	idealMixWaterTempC,
	prefermentDurationHours,
	prefermentRefHours,
	TARGET_UNITS_FRESH,
	TARGET_UNITS_SOURDOUGH,
	temperatureFactor
} from './fermentation';
import type {
	ComputedSchedule,
	DoughInputs,
	FermentMode,
	PreFermentSpec,
	ScheduleStep,
	ScheduleStepKind,
	ScheduleWarning
} from './types';

export const PREP_MIN = 15;
export const MIX_MIN = 15;
export const DIVIDE_MIN = 15;
export const COLD_INITIAL_BULK_MIN = 60;
// In cold mode the balls come out of the fridge and sit on the counter through
// warm-up + finish proof — from the baker's perspective one "balls resting"
// phase, not two distinct ones. The 240 min equals the previous warmup (180)
// + final-proof (60); the yeast equivalent-hours sum is unchanged because both
// phases were at room temperature already.
export const COLD_FINAL_PROOF_MIN = 240;
export const COLD_BULK_FLOOR_MIN = 12 * 60;
export const COLD_BULK_CEIL_MIN = 48 * 60;

export const COLD_MODE_THRESHOLD_MIN = 16 * 60;
export const ROOM_MIN_TOTAL_MIN = 3 * 60;

// No baker-action steps may start during [NIGHT_START_HOUR, NIGHT_END_HOUR) of
// local time — the calculator shifts the schedule to keep mixes/divides out of
// the middle of the night. Bounds are read against the browser's local timezone.
export const NIGHT_START_HOUR = 22;
export const NIGHT_END_HOUR = 8;

// Sum of every fixed-duration step around the variable bulk-cold leg
// (prep + mix + initial bulk-room + divide + final proof). Lets the
// night-window adjuster map a candidate coldMin back to a prepAt without
// rebuilding the step list.
const COLD_PRE_POST_OFFSET_MIN =
	COLD_FINAL_PROOF_MIN + DIVIDE_MIN + COLD_INITIAL_BULK_MIN + MIX_MIN + PREP_MIN;

// Steps that require the baker to be active. 'final-proof' is passive (balls
// just sit on the counter) and 'ready' is the user-chosen bake moment, so
// neither participates in night-window checks. The pre-ferment mix is brief
// active work at the start of a multi-hour maturation block, so it counts as
// a night-aware action even though the maturation itself is passive.
const ACTIVE_NIGHT_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
	'preferment-mix',
	'prep',
	'mix',
	'bulk-room',
	'bulk-cold',
	'divide'
]);

function isAtNight(d: Date): boolean {
	const h = d.getHours();
	return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

function clusterClean(prepAt: Date, prefermentOffsetMin: number | null): boolean {
	const base = [0, PREP_MIN, PREP_MIN + MIX_MIN, PREP_MIN + MIX_MIN + COLD_INITIAL_BULK_MIN];
	const offsets = prefermentOffsetMin !== null ? [-prefermentOffsetMin, ...base] : base;
	for (const o of offsets) {
		if (isAtNight(new Date(prepAt.getTime() + o * 60_000))) return false;
	}
	return true;
}

// Find a cold-bulk duration in [0, naturalColdMin] that keeps every pre-cold
// action step out of the night window, preferring the candidate closest to the
// natural value. The search never extends above naturalColdMin — that would
// pull the first step before startAt, which the schedule contract forbids.
// Returns the natural value untouched if no clean coldMin exists.
function adjustColdMinForNight(
	readyBy: Date,
	naturalColdMin: number,
	prefermentOffsetMin: number | null
): number {
	const prepAtFor = (cm: number) =>
		new Date(readyBy.getTime() - (COLD_PRE_POST_OFFSET_MIN + cm) * 60_000);

	for (let cm = naturalColdMin; cm >= 0; cm--) {
		if (clusterClean(prepAtFor(cm), prefermentOffsetMin)) return cm;
	}
	return naturalColdMin;
}

// Sourdough recipes use the starter itself as their pre-ferment — adding a
// biga/poolish on top would stack two cultures, which is not what the user
// wants. Centralising this rule here keeps the bakers' module and UI from
// having to repeat the same check.
function effectivePreFerment(inputs: DoughInputs): PreFermentSpec | null {
	if (inputs.yeastType === 'sourdough') return null;
	return inputs.preFerment;
}

export function computeSchedule(inputs: DoughInputs): ComputedSchedule {
	const preFerment = effectivePreFerment(inputs);
	const totalAvailableMin = Math.floor(
		(inputs.readyBy.getTime() - inputs.startAt.getTime()) / 60_000
	);
	// Temperature-driven pre-ferment duration, clamped to the [8, 24] h band
	// in fermentation.prefermentDurationHours. May still be shrunk below this
	// natural value if the wall-clock window can't accommodate it (see below).
	const naturalPrefermentMin = preFerment
		? Math.round(prefermentDurationHours(preFerment.type, inputs.roomTempC) * 60)
		: 0;
	const warnings: ScheduleWarning[] = [];

	if (inputs.roomTempC < 14) warnings.push('too-cold');
	if (inputs.roomTempC > 30) warnings.push('too-warm');

	// Cold mode is gated on the time available AFTER the natural pre-ferment
	// fits — a 17 h window with a 12 h poolish leaves 5 h, well in room-mode
	// territory. Below the threshold the math also doesn't try to schedule a
	// cold ferment that wouldn't develop properly.
	const availableMin = totalAvailableMin - naturalPrefermentMin;
	const useCold = availableMin >= COLD_MODE_THRESHOLD_MIN;
	const mode: FermentMode = useCold ? 'cold' : 'room';
	const feasible = totalAvailableMin >= ROOM_MIN_TOTAL_MIN;
	if (!feasible) warnings.push('too-short');

	let prefermentDurationMin = naturalPrefermentMin;
	let yeastPct: number;
	let steps: ScheduleStep[];
	let naturalColdBulkMin: number | null = null;
	let desiredColdBulkMin: number | null = null;

	if (mode === 'cold') {
		const fixedMin = PREP_MIN + MIX_MIN + COLD_INITIAL_BULK_MIN + DIVIDE_MIN + COLD_FINAL_PROOF_MIN;
		// Cold mode is only entered when totalAvailable − naturalPreferment ≥
		// 16 h, so this is always ≥ ~10 h — the pre-ferment-overflow branch
		// can only fire in room mode.
		const desired = totalAvailableMin - fixedMin - naturalPrefermentMin;
		desiredColdBulkMin = desired;
		// Cap cold-bulk at the 48 h ceiling. We do NOT clamp UP to the 12 h
		// floor — that would pull the schedule's first step before startAt,
		// which the contract forbids. Sub-floor cold-bulk is allowed and
		// flagged via the recipe-fit score.
		const naturalColdMin = Math.min(COLD_BULK_CEIL_MIN, desired);
		naturalColdBulkMin = naturalColdMin;
		const coldMin = adjustColdMinForNight(
			inputs.readyBy,
			naturalColdMin,
			preFerment ? prefermentDurationMin : null
		);

		const equivalentHours =
			(prefermentDurationMin / 60) * temperatureFactor(inputs.roomTempC) +
			((COLD_INITIAL_BULK_MIN + COLD_FINAL_PROOF_MIN) / 60) * temperatureFactor(inputs.roomTempC) +
			(coldMin / 60) * temperatureFactor(inputs.fridgeTempC);

		yeastPct = unitsToPercent(inputs.yeastType, equivalentHours);
		steps = buildColdSteps({
			readyBy: inputs.readyBy,
			coldMin,
			prefermentDurationMin: preFerment ? prefermentDurationMin : null
		});
	} else {
		const roomFixedMin = PREP_MIN + MIX_MIN + DIVIDE_MIN;
		const fermentBudget = totalAvailableMin - roomFixedMin - naturalPrefermentMin;
		let bulkMin: number;
		let finalProofMin: number;
		if (fermentBudget >= 0) {
			// Pre-ferment fits; the rest goes to bulk + final-proof in roughly
			// a 2:1 ratio. Both can shrink to 0 if the window is very tight.
			finalProofMin = Math.min(90, Math.max(0, Math.floor(fermentBudget / 3)));
			bulkMin = Math.max(0, fermentBudget - finalProofMin);
		} else {
			// Pre-ferment alone overflows. Shrink it so first-step >= startAt
			// still holds; bulk and final-proof are 0.
			prefermentDurationMin = Math.max(0, totalAvailableMin - roomFixedMin);
			bulkMin = 0;
			finalProofMin = 0;
		}

		const equivalentHours =
			((prefermentDurationMin + bulkMin + finalProofMin) / 60) *
			temperatureFactor(inputs.roomTempC);
		yeastPct = unitsToPercent(inputs.yeastType, equivalentHours);
		steps = buildRoomSteps({
			readyBy: inputs.readyBy,
			bulkMin,
			finalProofMin,
			prefermentDurationMin: preFerment ? prefermentDurationMin : null
		});
	}

	if (inputs.yeastType === 'fresh') {
		if (yeastPct > 0 && yeastPct < 0.02) warnings.push('yeast-tiny');
		if (yeastPct > 2) warnings.push('yeast-large');
	}

	// Cold mode shifts coldMin to avoid the night window for the pre-cold
	// cluster, but the post-cold divide is anchored to readyBy and room mode
	// has no slack — warn if anything still lands at night.
	if (steps.some((s) => ACTIVE_NIGHT_KINDS.has(s.kind) && isAtNight(s.at))) {
		warnings.push('night-step');
	}

	const ingredients = computeIngredients({
		pizzaCount: inputs.pizzaCount,
		ballWeight: inputs.ballWeight,
		hydration: inputs.hydration,
		saltPercent: inputs.saltPercent,
		yeastPercent: yeastPct,
		yeastType: inputs.yeastType,
		starterHydration: inputs.starterHydration,
		preFermentFlourPercent: preFerment ? preFerment.flourPercent : 0,
		preFermentHydration: preFerment?.type === 'biga' ? 50 : 100
	});

	// Unclamped pre-ferment duration the math wanted at this temperature — the
	// "natural" value the [8, 24] h clamp may have pulled in. Quality scoring
	// uses the gap between this and the actual duration.
	const naturalPrefermentHours = preFerment
		? prefermentRefHours(preFerment.type) / temperatureFactor(inputs.roomTempC)
		: null;

	return {
		mode,
		steps,
		ingredients,
		feasible,
		yeastPercent: yeastPct,
		yeastType: inputs.yeastType,
		preFerment,
		warnings,
		pizzaCount: inputs.pizzaCount,
		ballWeight: inputs.ballWeight,
		idealWaterTempC: idealMixWaterTempC(inputs.roomTempC),
		naturalColdBulkMin,
		desiredColdBulkMin,
		naturalPrefermentHours
	};
}

function unitsToPercent(yeastType: 'fresh' | 'sourdough', equivalentHours: number): number {
	const target = yeastType === 'fresh' ? TARGET_UNITS_FRESH : TARGET_UNITS_SOURDOUGH;
	// equivalentHours can hit 0 when the window is so short that every
	// fermentation phase shrinks to nothing — feasibility is already false
	// in that case, so callers see the warning rather than an Infinity %.
	if (equivalentHours <= 0) return 0;
	return target / equivalentHours;
}

function subMin(d: Date, min: number): Date {
	return new Date(d.getTime() - min * 60_000);
}

interface ColdArgs {
	readyBy: Date;
	coldMin: number;
	prefermentDurationMin: number | null;
}

function buildColdSteps({ readyBy, coldMin, prefermentDurationMin }: ColdArgs): ScheduleStep[] {
	const finalProofAt = subMin(readyBy, COLD_FINAL_PROOF_MIN);
	const divideAt = subMin(finalProofAt, DIVIDE_MIN);
	const bulkColdAt = subMin(divideAt, coldMin);
	const bulkRoomAt = subMin(bulkColdAt, COLD_INITIAL_BULK_MIN);
	const mixAt = subMin(bulkRoomAt, MIX_MIN);
	const prepAt = subMin(mixAt, PREP_MIN);

	const steps: ScheduleStep[] = [];
	if (prefermentDurationMin !== null) {
		const prefermentMixAt = subMin(prepAt, prefermentDurationMin);
		// One row covers the brief active mixing plus the long maturation — the
		// schedule table reads "until prep at HH:MM" from this duration.
		steps.push({
			kind: 'preferment-mix',
			at: prefermentMixAt,
			durationMinutes: prefermentDurationMin
		});
	}
	steps.push({ kind: 'prep', at: prepAt, durationMinutes: PREP_MIN });
	steps.push({ kind: 'mix', at: mixAt, durationMinutes: MIX_MIN });
	steps.push({ kind: 'bulk-room', at: bulkRoomAt, durationMinutes: COLD_INITIAL_BULK_MIN });
	steps.push({ kind: 'bulk-cold', at: bulkColdAt, durationMinutes: coldMin });
	steps.push({ kind: 'divide', at: divideAt, durationMinutes: DIVIDE_MIN });
	steps.push({ kind: 'final-proof', at: finalProofAt, durationMinutes: COLD_FINAL_PROOF_MIN });
	steps.push({ kind: 'ready', at: readyBy, durationMinutes: 0 });
	return steps;
}

interface RoomArgs {
	readyBy: Date;
	bulkMin: number;
	finalProofMin: number;
	prefermentDurationMin: number | null;
}

function buildRoomSteps({
	readyBy,
	bulkMin,
	finalProofMin,
	prefermentDurationMin
}: RoomArgs): ScheduleStep[] {
	const finalProofAt = subMin(readyBy, finalProofMin);
	const divideAt = subMin(finalProofAt, DIVIDE_MIN);
	const bulkAt = subMin(divideAt, bulkMin);
	const mixAt = subMin(bulkAt, MIX_MIN);
	const prepAt = subMin(mixAt, PREP_MIN);

	const steps: ScheduleStep[] = [];
	if (prefermentDurationMin !== null) {
		const prefermentMixAt = subMin(prepAt, prefermentDurationMin);
		steps.push({
			kind: 'preferment-mix',
			at: prefermentMixAt,
			durationMinutes: prefermentDurationMin
		});
	}
	steps.push({ kind: 'prep', at: prepAt, durationMinutes: PREP_MIN });
	steps.push({ kind: 'mix', at: mixAt, durationMinutes: MIX_MIN });
	steps.push({ kind: 'bulk-room', at: bulkAt, durationMinutes: bulkMin });
	steps.push({ kind: 'divide', at: divideAt, durationMinutes: DIVIDE_MIN });
	steps.push({ kind: 'final-proof', at: finalProofAt, durationMinutes: finalProofMin });
	steps.push({ kind: 'ready', at: readyBy, durationMinutes: 0 });
	return steps;
}
