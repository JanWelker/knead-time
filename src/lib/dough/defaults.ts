import type { DoughInputs } from './types';

// Single source of truth for the recipe-parameter defaults. Consumed by both
// FormState (screen) and the /print route's SSR skeleton so the two can never
// drift apart again (issue #191). Dates are excluded: they depend on "now",
// so defaultInputs() builds them fresh.
export const RECIPE_DEFAULTS: Omit<DoughInputs, 'readyBy' | 'startAt' | 'preFerments'> = {
	pizzaCount: 6,
	ballWeight: 280,
	hydration: 70,
	saltPercent: 3,
	oilPercent: 0,
	sugarPercent: 0,
	yeastType: 'fresh',
	starterHydration: 100,
	roomTempC: 22,
	fridgeTempC: 4,
	preFermentTempC: null,
	ballProof: 'room',
	mixingMethod: 'spiral'
};

// Mutates the given date to the default bake time: tomorrow at 19:00 local.
// Generic so FormState can pass a SvelteDate and keep its reactivity.
export function toDefaultReadyBy<D extends Date>(d: D): D {
	d.setDate(d.getDate() + 1);
	d.setHours(19, 0, 0, 0);
	return d;
}

export function defaultInputs(now: Date = new Date()): DoughInputs {
	return {
		...RECIPE_DEFAULTS,
		preFerments: [],
		readyBy: toDefaultReadyBy(new Date(now)),
		startAt: new Date(now)
	};
}
