import type { ScheduleStep } from './types';

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
