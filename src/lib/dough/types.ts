// Non-sourdough types all drive the same fresh-calibrated model; their masses
// differ by yeastMassFactor in fermentation.ts.
export type YeastType = 'fresh' | 'instant' | 'active-dry' | 'sourdough';

// Where the cold leg happens in cold mode: 'room' = classic bulk-cold then
// divide with a room-temperature ball proof (the pre-v4 shape); 'cold' =
// divide first, then the balls proof in the fridge and temper on the counter.
// Room mode has no cold leg, so the choice is inert there.
export type BallProof = 'room' | 'cold';

export type MixingMethod = 'hand' | 'machine';

export type PreFermentType = 'none' | 'biga' | 'poolish';

export interface PreFermentSpec {
	type: Exclude<PreFermentType, 'none'>;
	flourPercent: number;
}

export interface DoughInputs {
	readyBy: Date;
	startAt: Date;
	pizzaCount: number;
	ballWeight: number;
	hydration: number;
	saltPercent: number;
	// Optional baker's-percentage additions. 0 = absent. They expand pctSum
	// like salt does: every gram of oil/sugar is a separately-weighed mass
	// that comes out of the ball-weight budget.
	oilPercent: number;
	sugarPercent: number;
	yeastType: YeastType;
	starterHydration: number;
	roomTempC: number;
	fridgeTempC: number;
	// Where the pre-ferments mature. null = on the counter at roomTempC; a
	// number means a cellar or wine fridge — durations and the yeast solve
	// use it for the pre-ferment legs only.
	preFermentTempC: number | null;
	ballProof: BallProof;
	mixingMethod: MixingMethod;
	// Pre-ferments mature in parallel, each ending at prep. Empty = none.
	// Types are unique (the form exposes one toggle per type) and the list is
	// kept in canonical biga-first order. Σ flourPercent ≤ 80.
	preFerments: PreFermentSpec[];
}

export interface Ingredients {
	flour: number;
	water: number;
	salt: number;
	yeast: number;
	// 0 when the recipe doesn't call for them. UI hides the rows on 0.
	oil: number;
	sugar: number;
	totalDough: number;
	// One pre-dough per enabled pre-ferment; empty when the recipe has none.
	// The solved yeast mass is split across the entries proportional to their
	// flour share — the main dough carries no yeast whenever this is non-empty.
	preFerments: Array<{
		type: Exclude<PreFermentType, 'none'>;
		flour: number;
		water: number;
		yeast: number;
	}>;
}

export type ScheduleStepKind =
	| 'preferment-mix'
	| 'prep'
	| 'mix'
	| 'bulk-room'
	| 'bulk-cold'
	| 'divide'
	// The cold leg after divide when ballProof === 'cold' — same length and
	// temperature as bulk-cold, different position and copy.
	| 'proof-cold'
	| 'final-proof'
	| 'ready';

export interface ScheduleStep {
	kind: ScheduleStepKind;
	at: Date;
	durationMinutes: number;
	// Set only on 'preferment-mix' steps — with biga and poolish running in
	// parallel the schedule emits one such step per pre-ferment, and copy,
	// row keys and calendar UIDs all need to tell them apart.
	preFermentType?: Exclude<PreFermentType, 'none'>;
}

export type FermentMode = 'room' | 'cold';

export interface ComputedSchedule {
	mode: FermentMode;
	steps: ScheduleStep[];
	ingredients: Ingredients;
	feasible: boolean;
	yeastPercent: number;
	yeastType: YeastType;
	// Pre-ferments actually used to build the schedule. May be empty even
	// when DoughInputs.preFerments was set (sourdough collapses them).
	preFerments: PreFermentSpec[];
	warnings: ScheduleWarning[];
	pizzaCount: number;
	ballWeight: number;
	mixingMethod: MixingMethod;
	// Effective maturation temperature of the pre-ferments, null when they
	// simply follow roomTempC — copy renders a note only when it differs.
	preFermentTempC: number | null;
	idealWaterTempC: number;
	// Pre-clamp / pre-shift values used by the recipe fit-score metric. A
	// "perfect" schedule keeps the actual durations equal to these naturals;
	// quality.ts deducts a percentage for each gap. Null when the field
	// doesn't apply (cold-only fields in room mode); naturalPreferments is
	// empty when no pre-ferment is set, with one entry per pre-ferment
	// matched to its step via ScheduleStep.preFermentType.
	naturalColdBulkMin: number | null;
	desiredColdBulkMin: number | null;
	naturalPreferments: Array<{ type: Exclude<PreFermentType, 'none'>; naturalHours: number }>;
}

export type ScheduleWarning =
	'too-short' | 'too-cold' | 'too-warm' | 'yeast-tiny' | 'yeast-large' | 'night-step';
