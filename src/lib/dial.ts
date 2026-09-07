import { NIGHT_END_HOUR, NIGHT_START_HOUR } from './dough/schedule';
import { isActiveStep } from './dough/scheduleStatus';
import type { PreFermentType, ScheduleStep, ScheduleStepKind } from './dough/types';

// Geometry for the bake dial: the schedule drawn as a coil on a 24-hour face.
//
// One revolution is one day, so the angle of a moment is its time of day and
// nothing else — which is what makes the night wedge a fixed shape whatever
// the plan looks like, and what makes a 72 h bake legible as three coils
// before a single number has been read. Noon sits at the top and the hours run
// clockwise, so the dark half of the face is the bottom half.
//
// Everything here is pure arithmetic over ScheduleStep[]. Nothing in
// src/lib/dough/ knows the dial exists; the dial reads the schedule the same
// way the table does.

/** The face is drawn in a square viewBox of this side, then scaled by CSS. */
export const DIAL_VIEWBOX = 100;
export const CENTRE = DIAL_VIEWBOX / 2;
export const MINUTES_PER_TURN = 24 * 60;

/** Where the coil lives. The bake is always on R_OUTER; time spirals outward. */
export const R_OUTER = 38;
// The inner radius is set by what has to fit inside it, not by the coil: the
// centre plate carries the bake time in words, and on a three-coil bake the
// innermost turn ran straight through it at 17.
export const R_INNER = 19;
/** The night wedge overhangs the coil band so its edges read as a wall. Its
    inner edge stops short of the centre on purpose: taken all the way in it
    reads as a pie slice rather than as a band the coils pass through. */
export const R_NIGHT_INNER = 16;
export const R_NIGHT_OUTER = 41.5;
export const R_TICK_OUTER = 44.5;
export const R_TICK_MAJOR = 41.5;
export const R_TICK_MINOR = 43;
export const R_HOUR_LABEL = 47.2;

/** Radial gap between two pre-ferments maturing in parallel. */
export const STRAND_GAP = 1.5;
/** Half-length of the radial tick that marks a step the baker has to be at. */
export const ACTION_TICK = 2.6;

/**
 * Below this arc length (in viewBox units, so ~1 % of the dial's width) a
 * phase cannot be read as an arc — a 15 min step near the inner coil is under
 * a pixel and a half on a phone. Those are drawn as a bead on the coil
 * instead, and the plain-text time in the readout is what carries the detail.
 */
export const MIN_ARC_LENGTH = 2.2;
/** No matter how brief a phase is, its hit area is at least this wide. */
export const MIN_HIT_DEGREES = 7;
/** The spiral is sampled, not arced: one line segment per this many degrees. */
export const SAMPLE_DEGREES = 3;

/** Temperature is the coil's colour, so every kind has to declare one. */
export const STEP_TEMPERATURE: Record<ScheduleStepKind, 'warm' | 'cold'> = {
	'preferment-mix': 'warm',
	prep: 'warm',
	autolyse: 'warm',
	mix: 'warm',
	'bulk-room': 'warm',
	'bulk-cold': 'cold',
	divide: 'warm',
	'proof-cold': 'cold',
	'final-proof': 'warm',
	ready: 'warm'
};

export interface DialPoint {
	x: number;
	y: number;
	/** Degrees clockwise from the top of the face. Unwrapped, so it grows. */
	angle: number;
	r: number;
}

export interface DialStrand {
	key: string;
	kind: ScheduleStepKind;
	preFermentType?: Exclude<PreFermentType, 'none'>;
	temperature: 'warm' | 'cold';
	/** Path along the middle of the phase's stroke. */
	d: string;
	/** Same shape, widened to a comfortable target for a finger. */
	hitD: string;
	sweepDegrees: number;
	/** Too brief to read as an arc — draw a bead at `middle` instead. */
	bead: boolean;
	start: DialPoint;
	middle: DialPoint;
	end: DialPoint;
	startMs: number;
	endMs: number;
}

export interface DialAction {
	key: string;
	kind: ScheduleStepKind;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	at: DialPoint;
}

export interface DialHour {
	hour: number;
	major: boolean;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	/** Only the quarter hours are labelled; the rest are bare ticks. */
	label: string | null;
	labelX: number;
	labelY: number;
}

export interface DialNow {
	angle: number;
	/** The hand always shows the time of day, whether or not the bake is on. */
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	/** Where now falls on the coil, or null when the bake has not begun/ended. */
	point: DialPoint | null;
}

export interface DialModel {
	cx: number;
	cy: number;
	/** Days the plan spans, fractional — 1.4 turns is a day and a bit. */
	turns: number;
	/** Radial distance between one coil and the next. */
	pitch: number;
	startMs: number;
	endMs: number;
	strands: DialStrand[];
	actions: DialAction[];
	hours: DialHour[];
	night: string;
	/** The bake: fixed on the rim, the point everything else unwinds from. */
	bake: DialPoint;
	/** The far end of the coil — the handle that lengthens the window. */
	tail: DialPoint;
	now: DialNow;
}

/** Degrees clockwise from the top for a minute of the day. Noon is up. */
export function angleForMinuteOfDay(minutes: number): number {
	return ((minutes - MINUTES_PER_TURN / 2) / MINUTES_PER_TURN) * 360;
}

/** The angle a wall-clock moment sits at, ignoring which day it is. */
export function timeOfDayAngle(date: Date): number {
	return angleForMinuteOfDay(date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60);
}

export function polar(r: number, degrees: number): { x: number; y: number } {
	const rad = (degrees * Math.PI) / 180;
	return { x: CENTRE + r * Math.sin(rad), y: CENTRE - r * Math.cos(rad) };
}

/** Two decimals is well under a device pixel and keeps the paths readable. */
function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function coord(r: number, degrees: number): string {
	const p = polar(r, degrees);
	return `${round(p.x)} ${round(p.y)}`;
}

const NIGHT_LENGTH_HOURS = 24 - NIGHT_START_HOUR + NIGHT_END_HOUR;

/**
 * The night wedge: 22:00–08:00 as an annulus sector, fixed on the face because
 * the angle of a moment is its time of day. Every coil passes through it.
 *
 * The large-arc flag is hard-coded rather than derived: the night is ten hours,
 * which is 150° of the face, and a wedge under 180° never needs it. A schedule
 * whose night ran past half the day would be a different design problem.
 */
export function nightWedgePath(): string {
	const from = angleForMinuteOfDay(NIGHT_START_HOUR * 60);
	const to = from + (NIGHT_LENGTH_HOURS / 24) * 360;
	return [
		`M${coord(R_NIGHT_OUTER, from)}`,
		`A${R_NIGHT_OUTER} ${R_NIGHT_OUTER} 0 0 1 ${coord(R_NIGHT_OUTER, to)}`,
		`L${coord(R_NIGHT_INNER, to)}`,
		`A${R_NIGHT_INNER} ${R_NIGHT_INNER} 0 0 0 ${coord(R_NIGHT_INNER, from)}`,
		'Z'
	].join('');
}

function hourRing(): DialHour[] {
	const out: DialHour[] = [];
	for (let hour = 0; hour < 24; hour++) {
		const angle = angleForMinuteOfDay(hour * 60);
		const major = hour % 6 === 0;
		const inner = polar(major ? R_TICK_MAJOR : R_TICK_MINOR, angle);
		const outer = polar(R_TICK_OUTER, angle);
		const label = polar(R_HOUR_LABEL, angle);
		out.push({
			hour,
			major,
			x1: round(inner.x),
			y1: round(inner.y),
			x2: round(outer.x),
			y2: round(outer.y),
			label: major ? String(hour).padStart(2, '0') : null,
			labelX: round(label.x),
			labelY: round(label.y)
		});
	}
	return out;
}

/**
 * A step's identity, shared by the dial and the plan list so a selection means
 * the same thing in both. Deliberately NOT the start time: every kind appears
 * at most once in a schedule and the two pre-ferments differ by type, so kind
 * plus type is already unique — and it survives an edit that moves every step,
 * which is what keeps the readout on "Bulk fermentation" while the window
 * slider is being dragged instead of resetting on each stop.
 */
export function stepKey(step: ScheduleStep): string {
	return `${step.kind}-${step.preFermentType ?? ''}`;
}

export function buildDial(steps: ScheduleStep[], now: Date): DialModel {
	const startMs = Math.min(...steps.map((s) => s.at.getTime()));
	const endMs = Math.max(...steps.map((s) => s.at.getTime() + s.durationMinutes * 60_000));
	// A window can be minutes long (the documented sub-startAt case), and a
	// zero span would divide by nothing.
	const spanMinutes = Math.max(1, (endMs - startMs) / 60_000);
	const turns = spanMinutes / MINUTES_PER_TURN;
	// One coil per day, with the pitch shared out over however many there are.
	// Under a day the coil simply does not reach the inner radius.
	const pitch = (R_OUTER - R_INNER) / Math.max(turns, 1);
	const baseAngle = timeOfDayAngle(new Date(startMs));

	const angleAt = (ms: number) => baseAngle + ((ms - startMs) / 60_000 / MINUTES_PER_TURN) * 360;
	const radiusAt = (ms: number) => R_OUTER - ((endMs - ms) / 60_000 / MINUTES_PER_TURN) * pitch;

	const pointAt = (ms: number, offset: number): DialPoint => {
		const angle = angleAt(ms);
		const r = radiusAt(ms) + offset;
		const p = polar(r, angle);
		return { x: round(p.x), y: round(p.y), angle, r };
	};

	const pathBetween = (fromMs: number, toMs: number, offset: number): string => {
		const sweep = Math.abs(angleAt(toMs) - angleAt(fromMs));
		const segments = Math.max(2, Math.ceil(sweep / SAMPLE_DEGREES));
		let d = '';
		for (let i = 0; i <= segments; i++) {
			const p = pointAt(fromMs + ((toMs - fromMs) * i) / segments, offset);
			d += `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
		}
		return d;
	};

	// Pre-ferments mature in parallel and all finish at prep, so they overlap in
	// time. Give each its own radial lane so two strands read as two doughs
	// running side by side rather than one arc drawn twice.
	const parallel = steps.filter((s) => s.kind === 'preferment-mix');
	const laneOf = (step: ScheduleStep): number => {
		const index = parallel.indexOf(step);
		if (index < 0) return 0;
		return (index - (parallel.length - 1) / 2) * STRAND_GAP;
	};

	const strands: DialStrand[] = steps
		.filter((s) => s.durationMinutes > 0)
		.map((step) => {
			const offset = laneOf(step);
			const stepStart = step.at.getTime();
			const stepEnd = stepStart + step.durationMinutes * 60_000;
			const sweepDegrees = angleAt(stepEnd) - angleAt(stepStart);
			const middle = pointAt((stepStart + stepEnd) / 2, offset);
			// Arc length, not sweep: the same fifteen minutes is a readable
			// stroke on the outer coil and invisible on the inner one.
			const bead = (sweepDegrees * Math.PI * middle.r) / 180 < MIN_ARC_LENGTH;
			// The hit area may run past the phase's real minutes and over its
			// neighbours — it is invisible, and a phase nobody can tap is worse.
			const padMs =
				(Math.max(0, MIN_HIT_DEGREES - sweepDegrees) / 360) * MINUTES_PER_TURN * 60_000 * 0.5;
			return {
				key: stepKey(step),
				kind: step.kind,
				preFermentType: step.preFermentType,
				temperature: STEP_TEMPERATURE[step.kind],
				d: pathBetween(stepStart, stepEnd, offset),
				hitD: pathBetween(stepStart - padMs, stepEnd + padMs, offset),
				sweepDegrees,
				bead,
				start: pointAt(stepStart, offset),
				middle,
				end: pointAt(stepEnd, offset),
				startMs: stepStart,
				endMs: stepEnd
			};
		});

	const actions: DialAction[] = steps
		.filter((s) => isActiveStep(s.kind))
		.map((step) => {
			const at = pointAt(step.at.getTime(), laneOf(step));
			const inner = polar(at.r - ACTION_TICK, at.angle);
			const outer = polar(at.r + ACTION_TICK, at.angle);
			return {
				key: stepKey(step),
				kind: step.kind,
				x1: round(inner.x),
				y1: round(inner.y),
				x2: round(outer.x),
				y2: round(outer.y),
				at
			};
		});

	const nowMs = now.getTime();
	const nowAngle = timeOfDayAngle(now);
	// The hand starts at the coil's inner edge, not at the axis: the centre of
	// the face carries the bake time in words, and a line through it reads as
	// a stray stroke rather than as a hand.
	const handInner = polar(R_INNER + 1, nowAngle);
	const handOuter = polar(R_TICK_OUTER, nowAngle);

	return {
		cx: CENTRE,
		cy: CENTRE,
		turns,
		pitch,
		startMs,
		endMs,
		strands,
		actions,
		hours: hourRing(),
		night: nightWedgePath(),
		bake: pointAt(endMs, 0),
		tail: pointAt(startMs, 0),
		now: {
			angle: nowAngle,
			x1: round(handInner.x),
			y1: round(handInner.y),
			x2: round(handOuter.x),
			y2: round(handOuter.y),
			point: nowMs >= startMs && nowMs <= endMs ? pointAt(nowMs, 0) : null
		}
	};
}

/**
 * Turn a pointer position into an angle on the face, so a drag on the coil's
 * tail reads as turning a knob: one full revolution is one day of window.
 * `box` is the rendered square of the dial in client coordinates.
 */
export function pointerAngle(
	box: { left: number; top: number; width: number; height: number },
	clientX: number,
	clientY: number
): number {
	const dx = clientX - (box.left + box.width / 2);
	const dy = clientY - (box.top + box.height / 2);
	return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

/**
 * Accumulate a turn across the ±180° seam. A knob keeps counting when it
 * passes the top; the raw angle jumps by a full turn, which would send the
 * window from six hours to eighty in one frame.
 */
export function unwrapDelta(previous: number, next: number): number {
	let delta = next - previous;
	while (delta > 180) delta -= 360;
	while (delta < -180) delta += 360;
	return delta;
}
