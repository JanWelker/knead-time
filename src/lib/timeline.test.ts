import { describe, expect, it } from 'vitest';
import type { ScheduleStep, ScheduleStepKind } from './dough/types';
import {
	isColdKind,
	nightBands,
	nowState,
	spanPercent,
	stepProgressPercent,
	timelineSegments,
	timelineSpan
} from './timeline';

// Local wall-clock throughout: the whole app is wall-clock arithmetic and the
// vitest scripts pin TZ=UTC, so a bare "2026-05-12T09:00" is 09:00 local.
function step(kind: ScheduleStepKind, at: string, durationMinutes: number): ScheduleStep {
	return { kind, at: new Date(at), durationMinutes };
}

/** A one-day room plan: prep 09:00, bulk 09:15, divide 13:15, proof, bake 18:00. */
const ROOM: ScheduleStep[] = [
	step('prep', '2026-05-12T09:00', 15),
	step('bulk-room', '2026-05-12T09:15', 240),
	step('divide', '2026-05-12T13:15', 15),
	step('final-proof', '2026-05-12T13:30', 270),
	step('ready', '2026-05-12T18:00', 0)
];

describe('timelineSpan', () => {
	it('runs from the first step to the bake', () => {
		const span = timelineSpan(ROOM);
		expect(new Date(span.startMs).toISOString()).toBe('2026-05-12T09:00:00.000Z');
		expect(new Date(span.endMs).toISOString()).toBe('2026-05-12T18:00:00.000Z');
	});

	// A window shorter than the hands-on steps collapses the plan (issue #192);
	// a zero-length axis would make every position 0/0 and paint nothing. One
	// minute is the floor, so the bar still renders as "all of it is now".
	it('never has zero length', () => {
		const collapsed = [step('prep', '2026-05-12T09:00', 0), step('ready', '2026-05-12T09:00', 0)];
		const span = timelineSpan(collapsed);
		expect(span.endMs - span.startMs).toBe(60_000);
	});
});

describe('spanPercent', () => {
	const span = timelineSpan(ROOM);

	it('places a moment proportionally', () => {
		// 13:30 is 4 h 30 min into a 9 h axis.
		expect(spanPercent(new Date('2026-05-12T13:30').getTime(), span)).toBeCloseTo(50, 6);
	});

	it('clamps both ends rather than running off the rail', () => {
		expect(spanPercent(new Date('2026-05-11T00:00').getTime(), span)).toBe(0);
		expect(spanPercent(new Date('2026-05-13T00:00').getTime(), span)).toBe(100);
	});
});

describe('timelineSegments', () => {
	it('partitions the axis with no gaps and no ready marker', () => {
		const span = timelineSpan(ROOM);
		const segs = timelineSegments(ROOM, span);

		expect(segs.map((s) => s.kind)).toEqual(['prep', 'bulk-room', 'divide', 'final-proof']);
		expect(segs[0].fromPct).toBe(0);
		expect(segs[segs.length - 1].toPct).toBe(100);
		for (let i = 1; i < segs.length; i++) expect(segs[i].fromPct).toBe(segs[i - 1].toPct);
	});

	// The bar runs each segment to the NEXT step's start rather than to its own
	// stated duration. The two agree for a normal plan, and where they would
	// not the bar must still be a partition — an overview showing a gap the step
	// list does not have reads as a rendering fault.
	it('runs a segment to the next start even when the duration is shorter', () => {
		const gapped = [
			step('prep', '2026-05-12T09:00', 15),
			step('mix', '2026-05-12T11:00', 15),
			step('ready', '2026-05-12T13:00', 0)
		];
		const segs = timelineSegments(gapped, timelineSpan(gapped));
		expect(segs[0].toPct).toBe(50);
		expect(segs[1].fromPct).toBe(50);
	});

	it('marks only the fridge phases cold, and carries the pre-ferment type', () => {
		const cold: ScheduleStep[] = [
			{ ...step('preferment-mix', '2026-05-12T09:00', 60), preFermentType: 'biga' },
			step('bulk-cold', '2026-05-12T10:00', 60),
			step('proof-cold', '2026-05-12T11:00', 60),
			step('final-proof', '2026-05-12T12:00', 60),
			step('ready', '2026-05-12T13:00', 0)
		];
		const segs = timelineSegments(cold, timelineSpan(cold));
		expect(segs.map((s) => s.cold)).toEqual([false, true, true, false]);
		expect(segs[0].preFermentType).toBe('biga');
	});

	it('agrees with isColdKind about every step kind', () => {
		const kinds: ScheduleStepKind[] = [
			'preferment-mix',
			'prep',
			'autolyse',
			'mix',
			'bulk-room',
			'bulk-cold',
			'divide',
			'proof-cold',
			'final-proof',
			'ready'
		];
		// Membership, not a sample: a kind added to the schedule has to be
		// classified here on purpose rather than defaulting to warm.
		expect(kinds.filter(isColdKind)).toEqual(['bulk-cold', 'proof-cold']);
	});
});

describe('nightBands', () => {
	it('shades 22:00 to 08:00 and nothing else', () => {
		// 09:00 Tue to 18:00 Wed: one night, 22:00–08:00, inside a 33 h axis.
		const steps = [step('prep', '2026-05-12T09:00', 15), step('ready', '2026-05-13T18:00', 0)];
		const span = timelineSpan(steps);
		const bands = nightBands(span);

		expect(bands).toHaveLength(1);
		expect(bands[0].fromPct).toBeCloseTo((13 / 33) * 100, 6);
		expect(bands[0].toPct).toBeCloseTo((23 / 33) * 100, 6);
	});

	// The night that began before the plan did still covers its opening hours,
	// so the walk starts a day early. Without that, a schedule whose first step
	// is at 06:00 opened with two unshaded hours of darkness.
	it('shades a night already under way when the plan starts', () => {
		const steps = [step('prep', '2026-05-12T06:00', 15), step('ready', '2026-05-12T18:00', 0)];
		const bands = nightBands(timelineSpan(steps));

		expect(bands).toHaveLength(1);
		expect(bands[0].fromPct).toBe(0);
		expect(bands[0].toPct).toBeCloseTo((2 / 12) * 100, 6);
	});

	it('shades every night of a three-day plan', () => {
		const steps = [step('prep', '2026-05-12T09:00', 15), step('ready', '2026-05-15T09:00', 0)];
		expect(nightBands(timelineSpan(steps))).toHaveLength(3);
	});
});

describe('nowState', () => {
	it('counts down to a plan that has not started', () => {
		const state = nowState(ROOM, new Date('2026-05-12T08:30'));
		expect(state.phase).toBe('before');
		expect(state.step.kind).toBe('prep');
		expect(state).toMatchObject({ startsInMin: 30 });
	});

	it('names the step under way, with both sides of it', () => {
		const state = nowState(ROOM, new Date('2026-05-12T10:15'));
		expect(state.phase).toBe('during');
		expect(state.step.kind).toBe('bulk-room');
		expect(state).toMatchObject({ elapsedMin: 60, untilNextMin: 180 });
	});

	// The step list is a partition of the axis, so a moment inside a step whose
	// stated duration has already run out is still that step — "nothing to do"
	// is never the honest answer while the dough is on the counter.
	it('stays on the current step past its stated duration', () => {
		const state = nowState(ROOM, new Date('2026-05-12T09:14'));
		expect(state.step.kind).toBe('prep');
		expect(state).toMatchObject({ elapsedMin: 14 });
	});

	it('is done once the bake moment arrives', () => {
		expect(nowState(ROOM, new Date('2026-05-12T18:00')).phase).toBe('after');
		expect(nowState(ROOM, new Date('2026-05-13T09:00')).phase).toBe('after');
	});

	it('picks the later of two pre-ferments that start on the same minute', () => {
		// Biga and poolish both clamped to the wall budget share a start.
		const steps: ScheduleStep[] = [
			{ ...step('preferment-mix', '2026-05-12T09:00', 60), preFermentType: 'biga' },
			{ ...step('preferment-mix', '2026-05-12T09:00', 60), preFermentType: 'poolish' },
			step('prep', '2026-05-12T10:00', 15),
			step('ready', '2026-05-12T12:00', 0)
		];
		const state = nowState(steps, new Date('2026-05-12T09:30'));
		expect(state.step.preFermentType).toBe('poolish');
	});
});

describe('stepProgressPercent', () => {
	it('reports how far through the step the baker is', () => {
		expect(stepProgressPercent(60, 180)).toBe(25);
	});

	// A pre-ferment clamped to nothing can start on the same minute as the step
	// after it. Dividing by that span is 0/0, and NaN goes straight into a
	// `width:` declaration where it paints nothing and reports nothing; the
	// floored divisor keeps it a number.
	it('stays a number for a zero-length step', () => {
		expect(stepProgressPercent(0, 0)).toBe(0);
	});

	it('clamps to the ends', () => {
		expect(stepProgressPercent(-10, 100)).toBe(0);
		expect(stepProgressPercent(200, -100)).toBe(100);
	});
});
