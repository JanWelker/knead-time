import { describe, expect, it } from 'vitest';
import { currentStepIndex } from './scheduleStatus';
import type { ScheduleStep } from './types';

function step(kind: ScheduleStep['kind'], iso: string, duration = 0): ScheduleStep {
	return { kind, at: new Date(iso), durationMinutes: duration };
}

const steps: ScheduleStep[] = [
	step('prep', '2026-05-14T10:00:00Z', 15),
	step('mix', '2026-05-14T10:15:00Z', 15),
	step('bulk-room', '2026-05-14T10:30:00Z', 240),
	step('divide', '2026-05-14T14:30:00Z', 15),
	step('final-proof', '2026-05-14T14:45:00Z', 60),
	step('ready', '2026-05-14T15:45:00Z')
];

describe('currentStepIndex', () => {
	it('returns -1 when now is before the first step', () => {
		expect(currentStepIndex(steps, new Date('2026-05-14T09:59:00Z'))).toBe(-1);
	});

	it('returns 0 the moment the first step starts', () => {
		expect(currentStepIndex(steps, new Date('2026-05-14T10:00:00Z'))).toBe(0);
	});

	it('returns the index of the most recently started step', () => {
		expect(currentStepIndex(steps, new Date('2026-05-14T12:00:00Z'))).toBe(2);
	});

	it('returns the last index once the ready time has passed', () => {
		expect(currentStepIndex(steps, new Date('2026-05-14T16:00:00Z'))).toBe(steps.length - 1);
	});

	it('returns -1 for an empty schedule', () => {
		expect(currentStepIndex([], new Date('2026-05-14T10:00:00Z'))).toBe(-1);
	});
});
