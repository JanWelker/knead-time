import type { ScheduleStep, ScheduleStepKind } from './types';

// Index of the step the baker should be acting on at `now`: the latest step
// whose `at` has already passed. Returns -1 when every step is still in the
// future (i.e. `now` is before the first step). Drives the TRMNL view's
// "current vs. next" highlight without rebuilding the whole schedule.
export function currentStepIndex(steps: readonly ScheduleStep[], now: Date): number {
	const t = now.getTime();
	let idx = -1;
	for (let i = 0; i < steps.length; i++) {
		if (steps[i].at.getTime() <= t) idx = i;
		else break;
	}
	return idx;
}

// Baker-action steps require the baker to *do* something (preferment-mix,
// prep, mix, divide); passive steps are waiting/fermenting phases. `ready`
// is neither — it's the end marker. The schedule.ts night-window guard
// uses a wider notion of "anchored to wall-clock"; this is specifically
// for UI affordances that flag "is the baker on the clock here?".
export function isActiveStep(kind: ScheduleStepKind): boolean {
	switch (kind) {
		case 'preferment-mix':
		case 'prep':
		case 'mix':
		case 'divide':
			return true;
		case 'bulk-room':
		case 'bulk-cold':
		case 'warmup':
		case 'final-proof':
		case 'ready':
			return false;
	}
}
