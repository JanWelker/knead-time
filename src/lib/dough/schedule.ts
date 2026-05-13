import { computeIngredients } from './bakers';
import {
	prefermentDurationHours,
	prefermentEquivHours,
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
export const COLD_WARMUP_MIN = 180;
export const COLD_FINAL_PROOF_MIN = 60;
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
// (prep + mix + initial bulk-room + divide + warmup + final proof). Lets the
// night-window adjuster map a candidate coldMin back to a prepAt without
// rebuilding the step list.
const COLD_PRE_POST_OFFSET_MIN =
	COLD_FINAL_PROOF_MIN + COLD_WARMUP_MIN + DIVIDE_MIN + COLD_INITIAL_BULK_MIN + MIX_MIN + PREP_MIN;

// Steps that require the baker to be active. 'final-proof' is passive (balls
// just sit on the counter after warmup) and 'ready' is the user-chosen bake
// moment, so neither participates in night-window checks. The pre-ferment mix
// is brief active work at the start of a multi-hour maturation block, so it
// counts as a night-aware action even though the maturation itself is passive.
const ACTIVE_NIGHT_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
	'preferment-mix',
	'prep',
	'mix',
	'bulk-room',
	'bulk-cold',
	'divide',
	'warmup'
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

// Find a cold-bulk duration within [FLOOR, CEIL] that keeps every pre-cold
// action step out of the night window, preferring the candidate closest to the
// natural value. Returns the natural value untouched if no clean coldMin exists.
function adjustColdMinForNight(
	readyBy: Date,
	naturalColdMin: number,
	prefermentOffsetMin: number | null
): number {
	const prepAtFor = (cm: number) =>
		new Date(readyBy.getTime() - (COLD_PRE_POST_OFFSET_MIN + cm) * 60_000);

	if (clusterClean(prepAtFor(naturalColdMin), prefermentOffsetMin)) return naturalColdMin;

	let best = naturalColdMin;
	let bestDelta = Infinity;
	for (let cm = COLD_BULK_FLOOR_MIN; cm <= COLD_BULK_CEIL_MIN; cm++) {
		if (!clusterClean(prepAtFor(cm), prefermentOffsetMin)) continue;
		const delta = Math.abs(cm - naturalColdMin);
		if (delta <= bestDelta) {
			bestDelta = delta;
			best = cm;
		}
	}
	return best;
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
	// A pre-ferment matures for several hours before mix-day prep; reserve that
	// span so preferment-mix lands at/after startAt instead of before it. The
	// duration is temperature-driven (see fermentation.prefermentDurationHours).
	const prefermentDurationMin = preFerment
		? Math.round(prefermentDurationHours(preFerment.type, inputs.roomTempC) * 60)
		: 0;
	const availableMin = totalAvailableMin - prefermentDurationMin;
	const warnings: ScheduleWarning[] = [];

	if (inputs.roomTempC < 14) warnings.push('too-cold');
	if (inputs.roomTempC > 30) warnings.push('too-warm');

	const useCold = availableMin >= COLD_MODE_THRESHOLD_MIN;
	const mode: FermentMode = useCold ? 'cold' : 'room';
	const feasible = availableMin >= ROOM_MIN_TOTAL_MIN;
	if (!feasible) warnings.push('too-short');

	// Pre-ferment contributes equivalent-hours-at-22°C to the fermentation
	// budget like every other phase. Inside the wall-clock clamp this is the
	// type's reference load (14 h biga / 12 h poolish); at the band edges it's
	// the clamped wall-clock × f(T).
	const prefermentEqHours = preFerment
		? prefermentEquivHours(preFerment.type, inputs.roomTempC)
		: 0;

	let yeastPct: number;
	let steps: ScheduleStep[];

	if (mode === 'cold') {
		const fixedMin =
			PREP_MIN +
			MIX_MIN +
			COLD_INITIAL_BULK_MIN +
			DIVIDE_MIN +
			COLD_WARMUP_MIN +
			COLD_FINAL_PROOF_MIN;
		const desired = availableMin - fixedMin;
		const naturalColdMin = Math.min(COLD_BULK_CEIL_MIN, Math.max(COLD_BULK_FLOOR_MIN, desired));
		const coldMin = adjustColdMinForNight(
			inputs.readyBy,
			naturalColdMin,
			preFerment ? prefermentDurationMin : null
		);

		const equivalentHours =
			prefermentEqHours +
			((COLD_INITIAL_BULK_MIN + COLD_WARMUP_MIN + COLD_FINAL_PROOF_MIN) / 60) *
				temperatureFactor(inputs.roomTempC) +
			(coldMin / 60) * temperatureFactor(inputs.fridgeTempC);

		yeastPct = unitsToPercent(inputs.yeastType, equivalentHours);
		steps = buildColdSteps({
			readyBy: inputs.readyBy,
			coldMin,
			prefermentDurationMin: preFerment ? prefermentDurationMin : null
		});
	} else {
		const totalMin = Math.max(ROOM_MIN_TOTAL_MIN, availableMin);
		const ferment = totalMin - (PREP_MIN + MIX_MIN + DIVIDE_MIN);
		const finalProofMin = clamp(Math.floor(ferment / 3), 30, 90);
		const bulkMin = Math.max(30, ferment - finalProofMin);

		const equivalentHours =
			prefermentEqHours + ((bulkMin + finalProofMin) / 60) * temperatureFactor(inputs.roomTempC);
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
	// cluster, but post-cold steps (divide/warmup) are anchored to readyBy and
	// room mode has no slack — warn if anything still lands at night.
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
		ballWeight: inputs.ballWeight
	};
}

function unitsToPercent(yeastType: 'fresh' | 'sourdough', equivalentHours: number): number {
	const target = yeastType === 'fresh' ? TARGET_UNITS_FRESH : TARGET_UNITS_SOURDOUGH;
	return target / equivalentHours;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
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
	const warmupAt = subMin(finalProofAt, COLD_WARMUP_MIN);
	const divideAt = subMin(warmupAt, DIVIDE_MIN);
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
	steps.push({ kind: 'warmup', at: warmupAt, durationMinutes: COLD_WARMUP_MIN });
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
