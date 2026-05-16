export type YeastType = 'fresh' | 'sourdough';

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
	preFerment: PreFermentSpec | null;
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
	preFerment: {
		flour: number;
		water: number;
		yeast: number;
	} | null;
}

export type ScheduleStepKind =
	| 'preferment-mix'
	| 'prep'
	| 'mix'
	| 'bulk-room'
	| 'bulk-cold'
	| 'divide'
	| 'final-proof'
	| 'ready';

export interface ScheduleStep {
	kind: ScheduleStepKind;
	at: Date;
	durationMinutes: number;
}

export type FermentMode = 'room' | 'cold';

export interface ComputedSchedule {
	mode: FermentMode;
	steps: ScheduleStep[];
	ingredients: Ingredients;
	feasible: boolean;
	yeastPercent: number;
	yeastType: YeastType;
	// Pre-ferment that was actually used to build the schedule. May be null
	// even when DoughInputs.preFerment was set (sourdough collapses it).
	preFerment: PreFermentSpec | null;
	warnings: ScheduleWarning[];
	pizzaCount: number;
	ballWeight: number;
	idealWaterTempC: number;
	// Pre-clamp / pre-shift values used by the recipe fit-score metric. A
	// "perfect" schedule keeps the actual durations equal to these naturals;
	// quality.ts deducts a percentage for each gap. Null when the field
	// doesn't apply (cold-only fields in room mode, no-preferment field
	// when no pre-ferment is set).
	naturalColdBulkMin: number | null;
	desiredColdBulkMin: number | null;
	naturalPrefermentHours: number | null;
}

export type ScheduleWarning =
	| 'too-short'
	| 'too-cold'
	| 'too-warm'
	| 'yeast-tiny'
	| 'yeast-large'
	| 'night-step';
