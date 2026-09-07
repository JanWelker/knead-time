import { NIGHT_END_HOUR, NIGHT_START_HOUR } from './dough/schedule';
import type { ScheduleStep, ScheduleStepKind } from './dough/types';

// Geometry for the overview rail above the schedule — where each phase sits on
// one proportional bar, which stretches of it are night, and where "now" falls.
// Presentation only: nothing here feeds a duration, a temperature or the yeast
// solve, which is why it lives beside ingredientRows.ts rather than in
// src/lib/dough/. The step list it reads is already final.

export interface TimelineSpan {
	startMs: number;
	endMs: number;
}

/** The whole bake on one axis: the first step's start to the bake moment. */
export function timelineSpan(steps: ScheduleStep[]): TimelineSpan {
	const first = steps[0];
	const last = steps[steps.length - 1];
	const startMs = first.at.getTime();
	// A zero-length axis would make every position 0/0. It can happen for real:
	// a window shorter than the hands-on steps collapses the plan (issue #192).
	const endMs = Math.max(last.at.getTime(), startMs + 60_000);
	return { startMs, endMs };
}

/** Where a moment sits on the axis, 0–100, clamped to the ends. */
export function spanPercent(ms: number, span: TimelineSpan): number {
	const pct = ((ms - span.startMs) / (span.endMs - span.startMs)) * 100;
	return Math.min(100, Math.max(0, pct));
}

/** Fridge phases. The bar paints these cold; everything else is a warm phase. */
const COLD_KINDS: ReadonlySet<ScheduleStepKind> = new Set(['bulk-cold', 'proof-cold']);

export function isColdKind(kind: ScheduleStepKind): boolean {
	return COLD_KINDS.has(kind);
}

export interface TimelineSegment {
	kind: ScheduleStepKind;
	preFermentType?: ScheduleStep['preFermentType'];
	cold: boolean;
	fromPct: number;
	toPct: number;
}

/**
 * One segment per step, running to the next step's start rather than to its own
 * stated duration — the bar is a partition of the axis, so it can never show a
 * gap the step list does not have. The final `ready` marker has no width.
 */
export function timelineSegments(steps: ScheduleStep[], span: TimelineSpan): TimelineSegment[] {
	const out: TimelineSegment[] = [];
	for (let i = 0; i < steps.length - 1; i++) {
		const step = steps[i];
		out.push({
			kind: step.kind,
			preFermentType: step.preFermentType,
			cold: isColdKind(step.kind),
			fromPct: spanPercent(step.at.getTime(), span),
			toPct: spanPercent(steps[i + 1].at.getTime(), span)
		});
	}
	return out;
}

export interface NightBand {
	fromPct: number;
	toPct: number;
}

/**
 * The [22:00, 08:00) stretches the night-window guard already reasons about,
 * projected onto the axis. Walks local midnights rather than adding 24 h, so a
 * daylight-saving change keeps the shading on the right wall-clock hours.
 */
export function nightBands(span: TimelineSpan): NightBand[] {
	const out: NightBand[] = [];
	const cursor = new Date(span.startMs);
	cursor.setHours(0, 0, 0, 0);
	// Start a day early: the night that began before the axis did still covers
	// its opening hours.
	cursor.setDate(cursor.getDate() - 1);
	while (cursor.getTime() < span.endMs) {
		const from = new Date(cursor);
		from.setHours(NIGHT_START_HOUR, 0, 0, 0);
		const to = new Date(cursor);
		to.setDate(to.getDate() + 1);
		to.setHours(NIGHT_END_HOUR, 0, 0, 0);
		if (to.getTime() > span.startMs && from.getTime() < span.endMs) {
			out.push({
				fromPct: spanPercent(from.getTime(), span),
				toPct: spanPercent(to.getTime(), span)
			});
		}
		cursor.setDate(cursor.getDate() + 1);
	}
	return out;
}

export type NowState =
	| { phase: 'before'; step: ScheduleStep; startsInMin: number }
	| { phase: 'during'; step: ScheduleStep; elapsedMin: number; untilNextMin: number }
	| { phase: 'after'; step: ScheduleStep };

/**
 * What the baker is in the middle of. "During" runs to the next step's start,
 * not to the step's own duration, so the answer to "what am I doing" is never
 * "nothing" — and the same partition the bar is drawn from decides it.
 */
export function nowState(steps: ScheduleStep[], now: Date): NowState {
	const ms = now.getTime();
	const last = steps[steps.length - 1];
	if (ms < steps[0].at.getTime()) {
		return {
			phase: 'before',
			step: steps[0],
			startsInMin: (steps[0].at.getTime() - ms) / 60_000
		};
	}
	if (ms >= last.at.getTime()) return { phase: 'after', step: last };
	let i = 0;
	while (i + 1 < steps.length && steps[i + 1].at.getTime() <= ms) i++;
	const start = steps[i].at.getTime();
	const next = steps[i + 1].at.getTime();
	return {
		phase: 'during',
		step: steps[i],
		elapsedMin: (ms - start) / 60_000,
		untilNextMin: (next - ms) / 60_000
	};
}

/**
 * How far through the current step, 0–100. Two pre-ferments clamped to the wall
 * budget can start on the same minute, so the divisor is floored at one
 * millisecond rather than branched on — a zero-width step reads as complete.
 */
export function stepProgressPercent(elapsedMin: number, untilNextMin: number): number {
	const total = Math.max(elapsedMin + untilNextMin, 1 / 60_000);
	return Math.min(100, Math.max(0, (elapsedMin / total) * 100));
}
