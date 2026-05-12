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
	yeastType: YeastType;
	starterHydration: number;
	roomTempC: number;
	preFerment: PreFermentSpec | null;
}

export interface Ingredients {
	flour: number;
	water: number;
	salt: number;
	yeast: number;
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
	| 'warmup'
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
	warnings: ScheduleWarning[];
	pizzaCount: number;
	ballWeight: number;
}

export type ScheduleWarning =
	| 'too-short'
	| 'too-cold'
	| 'too-warm'
	| 'yeast-tiny'
	| 'yeast-large'
	| 'night-step';
