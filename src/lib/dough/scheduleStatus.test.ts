import { describe, expect, it } from 'vitest';
import { isActiveStep } from './scheduleStatus';
import type { ScheduleStepKind } from './types';

describe('isActiveStep', () => {
	const active: ScheduleStepKind[] = ['preferment-mix', 'prep', 'mix', 'divide'];
	const passive: ScheduleStepKind[] = [
		'bulk-room',
		'bulk-cold',
		'proof-cold',
		'final-proof',
		'ready'
	];

	it.each(active)('marks %s as active (baker action)', (kind) => {
		expect(isActiveStep(kind)).toBe(true);
	});

	it.each(passive)('marks %s as passive (waiting / end marker)', (kind) => {
		expect(isActiveStep(kind)).toBe(false);
	});
});
