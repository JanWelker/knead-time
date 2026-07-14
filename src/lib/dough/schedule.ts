import { computeIngredients } from './bakers';
import {
	idealMixWaterTempC,
	prefermentDurationHours,
	prefermentRefHours,
	TARGET_UNITS_FRESH,
	temperatureFactor,
	yeastMassFactor
} from './fermentation';
import type {
	ComputedSchedule,
	DoughInputs,
	FermentMode,
	MixingMethod,
	PreFermentSpec,
	ScheduleStep,
	ScheduleStepKind,
	ScheduleWarning,
	YeastType
} from './types';

export const PREP_MIN = 15;
// Machine mixing matches the pre-v4 fixed 15 min, so old share links keep
// their exact step times. Hand kneading needs the extra time for the
// knead-rest-knead cycles that replace the mixer's gluten development.
export const MIX_MIN_MACHINE = 15;
export const MIX_MIN_HAND = 25;
export const DIVIDE_MIN = 15;

export function mixMin(method: MixingMethod): number {
	return method === 'hand' ? MIX_MIN_HAND : MIX_MIN_MACHINE;
}
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
function coldPrePostOffsetMin(mixDurationMin: number): number {
	return COLD_FINAL_PROOF_MIN + DIVIDE_MIN + COLD_INITIAL_BULK_MIN + mixDurationMin + PREP_MIN;
}

// Steps that require the baker to be active. 'final-proof' is passive (balls
// just sit on the counter) and 'ready' is the user-chosen bake moment, so
// neither participates in night-window checks. The pre-ferment mix is brief
// active work at the start of a multi-hour maturation block, so it counts as
// a night-aware action even though the maturation itself is passive.
export const ACTIVE_NIGHT_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
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

function clusterClean(
	prepAt: Date,
	prefermentOffsetsMin: number[],
	mixDurationMin: number
): boolean {
	const offsets = [
		...prefermentOffsetsMin.map((m) => -m),
		0,
		PREP_MIN,
		PREP_MIN + mixDurationMin,
		PREP_MIN + mixDurationMin + COLD_INITIAL_BULK_MIN
	];
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
	prefermentOffsetsMin: number[],
	mixDurationMin: number
): number {
	const prepAtFor = (cm: number) =>
		new Date(readyBy.getTime() - (coldPrePostOffsetMin(mixDurationMin) + cm) * 60_000);

	for (let cm = naturalColdMin; cm >= 0; cm--) {
		if (clusterClean(prepAtFor(cm), prefermentOffsetsMin, mixDurationMin)) return cm;
	}
	return naturalColdMin;
}

// Sourdough recipes use the starter itself as their pre-ferment — adding a
// biga/poolish on top would stack two cultures, which is not what the user
// wants. Centralising this rule here keeps the bakers' module and UI from
// having to repeat the same check.
function effectivePreFerments(inputs: DoughInputs): PreFermentSpec[] {
	if (inputs.yeastType === 'sourdough') return [];
	return inputs.preFerments;
}

export function computeSchedule(inputs: DoughInputs): ComputedSchedule {
	const preFerments = effectivePreFerments(inputs);
	const mixDurationMin = mixMin(inputs.mixingMethod);
	const totalAvailableMin = Math.floor(
		(inputs.readyBy.getTime() - inputs.startAt.getTime()) / 60_000
	);
	// Temperature-driven wall-clock duration per pre-ferment, clamped to the
	// [8, 24] h band in fermentation.prefermentDurationHours. All pre-ferments
	// mature in parallel and end at prep, so the schedule only reserves the
	// longest one; shorter ones start later inside that window. Durations may
	// still be shrunk below the natural values if the wall-clock window can't
	// accommodate them (see the room-mode overflow branch).
	let prefermentDurationsMin = preFerments.map((pf) => ({
		type: pf.type,
		min: Math.round(prefermentDurationHours(pf.type, inputs.roomTempC) * 60)
	}));
	const naturalPrefermentMin = prefermentDurationsMin.reduce((max, d) => Math.max(max, d.min), 0);
	// Yeast splits across the pre-ferments proportional to flour share, so
	// each pre-ferment's equivalent hours count only for the yeast fraction
	// it carries: eq = Σ wᵢ · hoursᵢ · f(T). With a single pre-ferment w = 1,
	// which reproduces the pre-v4 solve exactly.
	const totalShare = preFerments.reduce((sum, pf) => sum + pf.flourPercent, 0);
	const prefermentEquivalentHours = (durations: typeof prefermentDurationsMin) =>
		durations.reduce(
			(sum, d, i) =>
				sum +
				(preFerments[i].flourPercent / totalShare) *
					(d.min / 60) *
					temperatureFactor(inputs.roomTempC),
			0
		);
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

	let yeastPct: number;
	let steps: ScheduleStep[];
	let naturalColdBulkMin: number | null = null;
	let desiredColdBulkMin: number | null = null;

	if (mode === 'cold') {
		const fixedMin =
			PREP_MIN + mixDurationMin + COLD_INITIAL_BULK_MIN + DIVIDE_MIN + COLD_FINAL_PROOF_MIN;
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
			prefermentDurationsMin.map((d) => d.min),
			mixDurationMin
		);

		const equivalentHours =
			prefermentEquivalentHours(prefermentDurationsMin) +
			((COLD_INITIAL_BULK_MIN + COLD_FINAL_PROOF_MIN) / 60) * temperatureFactor(inputs.roomTempC) +
			(coldMin / 60) * temperatureFactor(inputs.fridgeTempC);

		yeastPct = unitsToPercent(inputs.yeastType, equivalentHours);
		steps = buildSteps({
			readyBy: inputs.readyBy,
			prefermentDurationsMin,
			mixDurationMin,
			bulkRoomMin: COLD_INITIAL_BULK_MIN,
			bulkColdMin: coldMin,
			finalProofMin: COLD_FINAL_PROOF_MIN
		});
	} else {
		const roomFixedMin = PREP_MIN + mixDurationMin + DIVIDE_MIN;
		const fermentBudget = totalAvailableMin - roomFixedMin - naturalPrefermentMin;
		let bulkMin: number;
		let finalProofMin: number;
		if (fermentBudget >= 0) {
			// Pre-ferments fit; the rest goes to bulk + final-proof in roughly
			// a 2:1 ratio. Both can shrink to 0 if the window is very tight.
			finalProofMin = Math.min(90, Math.max(0, Math.floor(fermentBudget / 3)));
			bulkMin = Math.max(0, fermentBudget - finalProofMin);
		} else {
			// The longest pre-ferment alone overflows. Cap every pre-ferment at
			// the wall budget so first-step >= startAt still holds — shorter
			// ones may fit untouched. Bulk and final-proof are 0.
			const budget = Math.max(0, totalAvailableMin - roomFixedMin);
			prefermentDurationsMin = prefermentDurationsMin.map((d) => ({
				...d,
				min: Math.min(d.min, budget)
			}));
			bulkMin = 0;
			finalProofMin = 0;
		}

		const equivalentHours =
			prefermentEquivalentHours(prefermentDurationsMin) +
			((bulkMin + finalProofMin) / 60) * temperatureFactor(inputs.roomTempC);
		yeastPct = unitsToPercent(inputs.yeastType, equivalentHours);
		steps = buildSteps({
			readyBy: inputs.readyBy,
			prefermentDurationsMin,
			mixDurationMin,
			bulkRoomMin: bulkMin,
			bulkColdMin: null,
			finalProofMin
		});
	}

	// Sanity bands live in fresh-equivalent terms so every carrier is judged
	// on leavening power, not on its own gram scale (0.5 g IDY ≈ 1.5 g fresh).
	const freshEquivalentPct = yeastPct / yeastMassFactor(inputs.yeastType);
	if (freshEquivalentPct > 0 && freshEquivalentPct < 0.02) warnings.push('yeast-tiny');
	if (freshEquivalentPct > 2) warnings.push('yeast-large');

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
		oilPercent: inputs.oilPercent,
		sugarPercent: inputs.sugarPercent,
		yeastPercent: yeastPct,
		yeastType: inputs.yeastType,
		starterHydration: inputs.starterHydration,
		preFerments
	});

	// Unclamped pre-ferment durations the math wanted at this temperature — the
	// "natural" values the [8, 24] h clamp may have pulled in. Quality scoring
	// uses the gap between these and the actual step durations, matched by type.
	const naturalPreferments = preFerments.map((pf) => ({
		type: pf.type,
		naturalHours: prefermentRefHours(pf.type) / temperatureFactor(inputs.roomTempC)
	}));

	return {
		mode,
		steps,
		ingredients,
		feasible,
		yeastPercent: yeastPct,
		yeastType: inputs.yeastType,
		preFerments,
		warnings,
		pizzaCount: inputs.pizzaCount,
		ballWeight: inputs.ballWeight,
		mixingMethod: inputs.mixingMethod,
		idealWaterTempC: idealMixWaterTempC(inputs.roomTempC, inputs.mixingMethod),
		naturalColdBulkMin,
		desiredColdBulkMin,
		naturalPreferments
	};
}

function unitsToPercent(yeastType: YeastType, equivalentHours: number): number {
	// equivalentHours can hit 0 when the window is so short that every
	// fermentation phase shrinks to nothing — feasibility is already false
	// in that case, so callers see the warning rather than an Infinity %.
	if (equivalentHours <= 0) return 0;
	// Solve in fresh-equivalent percent, then convert to the chosen carrier's
	// mass — one factor covers dry-yeast conversions and sourdough activity.
	return (TARGET_UNITS_FRESH / equivalentHours) * yeastMassFactor(yeastType);
}

function subMin(d: Date, min: number): Date {
	return new Date(d.getTime() - min * 60_000);
}

interface BuildArgs {
	readyBy: Date;
	prefermentDurationsMin: Array<{ type: PreFermentSpec['type']; min: number }>;
	mixDurationMin: number;
	bulkRoomMin: number;
	// `null` ⇒ room-only schedule (no cold leg). Non-null ⇒ cold-bulk
	// sandwiched between the initial room bulk and divide.
	bulkColdMin: number | null;
	finalProofMin: number;
}

function buildSteps({
	readyBy,
	prefermentDurationsMin,
	mixDurationMin,
	bulkRoomMin,
	bulkColdMin,
	finalProofMin
}: BuildArgs): ScheduleStep[] {
	const finalProofAt = subMin(readyBy, finalProofMin);
	const divideAt = subMin(finalProofAt, DIVIDE_MIN);
	const bulkColdAt = bulkColdMin !== null ? subMin(divideAt, bulkColdMin) : null;
	const bulkRoomAt = subMin(bulkColdAt ?? divideAt, bulkRoomMin);
	const mixAt = subMin(bulkRoomAt, mixDurationMin);
	const prepAt = subMin(mixAt, PREP_MIN);

	const steps: ScheduleStep[] = [];
	// One row per pre-ferment covers the brief active mixing plus the long
	// maturation — the schedule table reads "until prep at HH:MM" from the
	// duration. All end at prep, so the longest starts first; emitting
	// longest-first keeps the list in forward time order (the sort is stable,
	// preserving canonical biga-first order on equal durations).
	for (const d of [...prefermentDurationsMin].sort((a, b) => b.min - a.min)) {
		steps.push({
			kind: 'preferment-mix',
			at: subMin(prepAt, d.min),
			durationMinutes: d.min,
			preFermentType: d.type
		});
	}
	steps.push({ kind: 'prep', at: prepAt, durationMinutes: PREP_MIN });
	steps.push({ kind: 'mix', at: mixAt, durationMinutes: mixDurationMin });
	steps.push({ kind: 'bulk-room', at: bulkRoomAt, durationMinutes: bulkRoomMin });
	if (bulkColdAt !== null && bulkColdMin !== null) {
		steps.push({ kind: 'bulk-cold', at: bulkColdAt, durationMinutes: bulkColdMin });
	}
	steps.push({ kind: 'divide', at: divideAt, durationMinutes: DIVIDE_MIN });
	steps.push({ kind: 'final-proof', at: finalProofAt, durationMinutes: finalProofMin });
	steps.push({ kind: 'ready', at: readyBy, durationMinutes: 0 });
	return steps;
}
