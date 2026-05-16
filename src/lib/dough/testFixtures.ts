import type { ComputedSchedule, DoughInputs, ScheduleStep, ScheduleStepKind } from './types';

// Shared fixtures + helpers for the dough-side test suites. Excluded from
// coverage by vitest.config — production code shouldn't import from here.

export function defaultInputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return {
		readyBy: new Date('2026-05-12T19:00:00Z'),
		startAt: new Date('2026-05-12T13:00:00Z'),
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
		preFerment: null,
		...overrides
	};
}

// Sugar over the repeated `schedule.steps.find((s) => s.kind === kind)!`
// dance. Tests that look up a known step throw if the kind is somehow
// missing, so we assert non-null at the boundary.
export function findStep(schedule: ComputedSchedule, kind: ScheduleStepKind): ScheduleStep {
	const step = schedule.steps.find((s) => s.kind === kind);
	if (!step) throw new Error(`Expected step of kind "${kind}" in schedule, found none.`);
	return step;
}
