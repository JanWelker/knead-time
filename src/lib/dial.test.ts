import { describe, expect, it } from 'vitest';
import {
	angleForMinuteOfDay,
	buildDial,
	CENTRE,
	MIN_ARC_LENGTH,
	MIN_HIT_DEGREES,
	nightWedgePath,
	pointerAngle,
	polar,
	R_INNER,
	R_OUTER,
	STRAND_GAP,
	stepKey,
	timeOfDayAngle,
	unwrapDelta
} from './dial';
import { computeSchedule } from './dough/schedule';
import { defaultInputs } from './dough/testFixtures';
import type { ScheduleStep } from './dough/types';

/** A step list built by hand, so an edge case can be stated in one line. */
function steps(spec: Array<[ScheduleStep['kind'], string, number]>): ScheduleStep[] {
	return spec.map(([kind, at, durationMinutes]) => ({
		kind,
		at: new Date(at),
		durationMinutes
	}));
}

describe('the face', () => {
	it('puts noon at the top and runs the hours clockwise', () => {
		expect(angleForMinuteOfDay(12 * 60)).toBe(0);
		expect(angleForMinuteOfDay(18 * 60)).toBe(90);
		expect(angleForMinuteOfDay(0)).toBe(-180);
		expect(angleForMinuteOfDay(6 * 60)).toBe(-90);
	});

	it('reads a moment as its time of day and nothing else', () => {
		// Same clock time, four days apart: the same place on the face. That
		// property is the whole reason the night wedge can be a fixed shape.
		expect(timeOfDayAngle(new Date(2026, 8, 1, 15, 0))).toBe(45);
		expect(timeOfDayAngle(new Date(2026, 8, 5, 15, 0))).toBe(45);
		expect(timeOfDayAngle(new Date(2026, 8, 1, 15, 30))).toBe(52.5);
	});

	it('places a point by radius and angle from the centre', () => {
		expect(polar(10, 0)).toEqual({ x: CENTRE, y: CENTRE - 10 });
		const right = polar(10, 90);
		expect(right.x).toBeCloseTo(CENTRE + 10, 6);
		expect(right.y).toBeCloseTo(CENTRE, 6);
	});

	it('shades 22:00–08:00 as one wedge across the bottom of the face', () => {
		const d = nightWedgePath();
		// 22:00 is 150°, 08:00 is 300° — 150° of face, so the wedge is drawn
		// with the large-arc flag off. A `1` here would wrap it the wrong way
		// round and shade the daylight instead.
		expect(d).toContain('0 0 1');
		const start = polar(41.5, 150);
		expect(d.startsWith(`M${Math.round(start.x * 100) / 100} `)).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
	});

	it('ticks all 24 hours and labels only the quarters', () => {
		const plan = buildDial(steps([['ready', '2026-09-01T12:00:00', 0]]), new Date());
		expect(plan.hours).toHaveLength(24);
		expect(plan.hours.filter((h) => h.major).map((h) => h.hour)).toEqual([0, 6, 12, 18]);
		expect(plan.hours.filter((h) => h.label !== null).map((h) => h.label)).toEqual([
			'00',
			'06',
			'12',
			'18'
		]);
		// A minor tick is shorter: it starts further out than a major one.
		const midnight = plan.hours[0];
		const oneAm = plan.hours[1];
		expect(Math.hypot(midnight.x1 - CENTRE, midnight.y1 - CENTRE)).toBeLessThan(
			Math.hypot(oneAm.x1 - CENTRE, oneAm.y1 - CENTRE)
		);
	});
});

describe('step keys', () => {
	it('distinguishes two pre-ferments that start at the same minute', () => {
		const [biga, poolish] = [
			{ kind: 'preferment-mix', at: new Date('2026-09-01T08:00:00'), durationMinutes: 600 },
			{ kind: 'preferment-mix', at: new Date('2026-09-01T08:00:00'), durationMinutes: 600 }
		] as ScheduleStep[];
		biga.preFermentType = 'biga';
		poolish.preFermentType = 'poolish';
		expect(stepKey(biga)).not.toBe(stepKey(poolish));
		// A step with no pre-ferment type still gets a stable key.
		expect(
			stepKey({ kind: 'prep', at: new Date('2026-09-01T08:00:00'), durationMinutes: 15 })
		).toBe('prep-');
		// ...and the key does not move when the step does. Keying on the start
		// time reset the dial's readout on every stop of a window drag.
		expect(
			stepKey({ kind: 'prep', at: new Date('2026-09-04T21:30:00'), durationMinutes: 15 })
		).toBe('prep-');
	});
});

describe('the coil', () => {
	it('anchors the bake on the rim and unwinds the dough backwards from it', () => {
		const plan = buildDial(
			steps([
				['prep', '2026-09-01T09:00:00', 15],
				['bulk-room', '2026-09-01T09:15:00', 300],
				['ready', '2026-09-01T14:15:00', 0]
			]),
			new Date('2026-09-01T10:00:00')
		);

		expect(plan.bake.r).toBeCloseTo(R_OUTER, 6);
		// 5 h 15 min of window: the coil's tail sits inside the rim by that
		// fraction of one day's pitch, nowhere near the inner radius.
		expect(plan.turns).toBeCloseTo(5.25 / 24, 6);
		expect(plan.tail.r).toBeGreaterThan(R_INNER);
		expect(plan.tail.r).toBeCloseTo(R_OUTER - plan.turns * plan.pitch, 6);
		// 09:00 is 45° before noon, i.e. −45° on the face.
		expect(plan.tail.angle).toBeCloseTo(-45, 6);
	});

	it('draws a 72 h bake as three coils, evenly spaced', () => {
		const plan = buildDial(
			steps([
				['prep', '2026-09-01T09:00:00', 15],
				['bulk-cold', '2026-09-01T09:15:00', 71 * 60 + 45],
				['ready', '2026-09-04T09:00:00', 0]
			]),
			new Date('2026-09-02T10:00:00')
		);

		expect(plan.turns).toBeCloseTo(3, 6);
		expect(plan.pitch).toBeCloseTo((R_OUTER - R_INNER) / 3, 6);
		expect(plan.tail.r).toBeCloseTo(R_INNER, 6);
		// Three revolutions of face for three days of dough.
		const cold = plan.strands.find((s) => s.kind === 'bulk-cold')!;
		expect(cold.sweepDegrees).toBeCloseTo((71.75 / 24) * 360, 4);
		expect(cold.temperature).toBe('cold');
	});

	it('keeps a bake shorter than one revolution on the outer coil', () => {
		// Six hours: a quarter turn. The pitch must not be stretched to fill the
		// whole radial band, or a short bake would draw as a fat spiral ramp.
		const plan = buildDial(
			steps([
				['prep', '2026-09-01T11:00:00', 15],
				['bulk-room', '2026-09-01T11:15:00', 345],
				['ready', '2026-09-01T17:00:00', 0]
			]),
			new Date('2026-09-01T12:00:00')
		);

		expect(plan.turns).toBeLessThan(1);
		expect(plan.pitch).toBeCloseTo(R_OUTER - R_INNER, 6);
		expect(plan.tail.r).toBeCloseTo(R_OUTER - plan.turns * (R_OUTER - R_INNER), 6);
	});

	it('crosses midnight without the coil jumping', () => {
		// The angle is unwrapped, so an overnight phase keeps counting past the
		// bottom of the face instead of snapping back a full turn. A wrapped
		// angle here drew the night leg as a stroke going the wrong way round.
		const plan = buildDial(
			steps([
				['prep', '2026-09-01T21:00:00', 15],
				['bulk-room', '2026-09-01T21:15:00', 600],
				['ready', '2026-09-02T07:15:00', 0]
			]),
			new Date('2026-09-01T22:00:00')
		);

		const overnight = plan.strands.find((s) => s.kind === 'bulk-room')!;
		expect(overnight.sweepDegrees).toBeCloseTo(150, 6);
		expect(overnight.middle.angle).toBeGreaterThan(overnight.start.angle);
		// 21:15 → 138.75°, and ten hours later the angle has grown past 180°
		// (the bottom of the face) rather than wrapping to a negative number.
		expect(overnight.start.angle).toBeCloseTo(138.75, 6);
		expect(plan.bake.angle).toBeCloseTo(288.75, 6);
	});

	it('samples the spiral finely enough that a long arc is a curve', () => {
		const plan = buildDial(
			steps([
				['bulk-cold', '2026-09-01T09:00:00', 24 * 60],
				['ready', '2026-09-02T09:00:00', 0]
			]),
			new Date('2026-09-01T10:00:00')
		);
		const cold = plan.strands[0];
		// 360° at 3° per segment: 120 segments, so 121 points.
		expect(cold.d.startsWith('M')).toBe(true);
		expect(cold.d.split('L')).toHaveLength(121);
	});
});

describe('phases too brief to draw', () => {
	const plan = buildDial(
		steps([
			['prep', '2026-09-01T09:00:00', 15],
			['bulk-cold', '2026-09-01T09:15:00', 40 * 60],
			['divide', '2026-09-03T01:15:00', 15],
			['final-proof', '2026-09-03T01:30:00', 240],
			['ready', '2026-09-03T05:30:00', 0]
		]),
		new Date('2026-09-01T10:00:00')
	);

	it('marks a 15-minute step as a bead rather than an arc', () => {
		const prep = plan.strands.find((s) => s.kind === 'prep')!;
		expect(prep.bead).toBe(true);
		expect((prep.sweepDegrees * Math.PI * prep.middle.r) / 180).toBeLessThan(MIN_ARC_LENGTH);
		const proof = plan.strands.find((s) => s.kind === 'final-proof')!;
		expect(proof.bead).toBe(false);
	});

	it('still gives it a hit area a finger can land on', () => {
		const prep = plan.strands.find((s) => s.kind === 'prep')!;
		// 15 min is 3.75° of face; the hit path is padded out to at least 7°,
		// which it may only do because it is invisible and may overlap.
		expect(prep.hitD.length).toBeGreaterThan(prep.d.length);
		const points = prep.hitD
			.slice(1)
			.split('L')
			.map((p) => p.split(' ').map(Number));
		const angleOf = ([x, y]: number[]) => (Math.atan2(x - CENTRE, CENTRE - y) * 180) / Math.PI;
		// Path coordinates are rounded to two decimals, so the measured sweep
		// lands a hundredth under the constant it was built from.
		expect(MIN_HIT_DEGREES).toBe(7);
		expect(Math.abs(angleOf(points.at(-1)!) - angleOf(points[0]))).toBeGreaterThan(
			MIN_HIT_DEGREES - 0.05
		);
	});

	it('leaves out phases with no duration at all', () => {
		// `ready` is a moment, not a phase, and room mode can hand back a
		// zero-length bulk. Neither may become a zero-length stroke.
		expect(plan.strands.map((s) => s.kind)).not.toContain('ready');
		const roomOnly = buildDial(
			steps([
				['prep', '2026-09-01T09:00:00', 15],
				['bulk-room', '2026-09-01T09:15:00', 0],
				['divide', '2026-09-01T09:15:00', 15],
				['ready', '2026-09-01T09:30:00', 0]
			]),
			new Date('2026-09-01T09:20:00')
		);
		expect(roomOnly.strands.map((s) => s.kind)).toEqual(['prep', 'divide']);
	});
});

describe('parallel pre-ferments', () => {
	it('gives biga and poolish a lane each, and everything else the middle', () => {
		const schedule = computeSchedule(
			defaultInputs({
				startAt: new Date(2026, 8, 1, 9, 0),
				readyBy: new Date(2026, 8, 3, 17, 0),
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			})
		);
		const plan = buildDial(schedule.steps, new Date(2026, 8, 2, 10, 0));

		const pre = plan.strands.filter((s) => s.kind === 'preferment-mix');
		expect(pre).toHaveLength(2);
		// Both end at prep, so without lanes they would be drawn on top of each
		// other for their whole overlap.
		// Both finish at prep, so the same moment on two lanes is the check.
		expect(pre[0].endMs).toBe(pre[1].endMs);
		expect(pre[0].end.r - pre[1].end.r).toBeCloseTo(-STRAND_GAP, 6);
		// Everything after them is back on the centre lane.
		const mix = plan.strands.find((s) => s.kind === 'mix')!;
		expect(mix.end.r).toBeCloseTo(mix.middle.r + (mix.end.r - mix.middle.r), 6);
		expect(mix.startMs).toBeGreaterThan(pre[0].startMs);
	});

	it('marks every step the baker has to be present for', () => {
		const schedule = computeSchedule(
			defaultInputs({
				startAt: new Date(2026, 8, 1, 9, 0),
				readyBy: new Date(2026, 8, 3, 17, 0),
				preFerments: [{ type: 'biga', flourPercent: 30 }]
			})
		);
		const plan = buildDial(schedule.steps, new Date(2026, 8, 2, 10, 0));

		expect(plan.actions.map((a) => a.kind)).toEqual(['preferment-mix', 'prep', 'mix', 'divide']);
		// The tick crosses the coil, so it reaches inside and outside the strand.
		const prep = plan.actions.find((a) => a.kind === 'prep')!;
		expect(Math.hypot(prep.x1 - CENTRE, prep.y1 - CENTRE)).toBeLessThan(prep.at.r);
		expect(Math.hypot(prep.x2 - CENTRE, prep.y2 - CENTRE)).toBeGreaterThan(prep.at.r);
	});
});

describe('the hand at now', () => {
	const plan = (now: string) =>
		buildDial(
			steps([
				['prep', '2026-09-01T09:00:00', 15],
				['bulk-room', '2026-09-01T09:15:00', 300],
				['ready', '2026-09-01T14:15:00', 0]
			]),
			new Date(now)
		);

	it('sits on the coil while the bake is running', () => {
		const p = plan('2026-09-01T11:00:00');
		expect(p.now.point).not.toBeNull();
		expect(p.now.point!.angle).toBeCloseTo(-15, 6);
		expect(p.now.angle).toBeCloseTo(-15, 6);
	});

	it('still shows the time of day before the plan starts and after the bake', () => {
		// The hand is a clock hand first: it has to point somewhere even when
		// the dough has nothing to say, or the face reads as broken.
		const early = plan('2026-09-01T06:00:00');
		expect(early.now.point).toBeNull();
		expect(early.now.angle).toBeCloseTo(-90, 6);

		const late = plan('2026-09-01T20:00:00');
		expect(late.now.point).toBeNull();
		expect(Math.hypot(late.now.x2 - CENTRE, late.now.y2 - CENTRE)).toBeGreaterThan(R_OUTER);
	});
});

describe('turning the coil', () => {
	const box = { left: 0, top: 0, width: 200, height: 200 };

	it('reads a pointer as an angle on the face', () => {
		expect(pointerAngle(box, 100, 0)).toBeCloseTo(0, 6);
		expect(pointerAngle(box, 200, 100)).toBeCloseTo(90, 6);
		expect(pointerAngle(box, 100, 200)).toBeCloseTo(180, 6);
		expect(pointerAngle(box, 0, 100)).toBeCloseTo(-90, 6);
	});

	it('keeps counting when a drag crosses the seam', () => {
		// Without unwrapping, a drag past the top jumps by a full turn — which
		// on this dial is a whole day of fermentation in one frame.
		expect(unwrapDelta(170, -170)).toBeCloseTo(20, 6);
		expect(unwrapDelta(-170, 170)).toBeCloseTo(-20, 6);
		expect(unwrapDelta(10, 30)).toBeCloseTo(20, 6);
	});
});

describe('a real schedule', () => {
	it('covers a cold plan end to end, with no gap between phases', () => {
		const schedule = computeSchedule(
			defaultInputs({
				startAt: new Date(2026, 8, 1, 9, 0),
				readyBy: new Date(2026, 8, 2, 18, 0)
			})
		);
		const plan = buildDial(schedule.steps, new Date(2026, 8, 1, 20, 0));

		expect(schedule.mode).toBe('cold');
		expect(plan.strands[0].startMs).toBe(plan.startMs);
		expect(plan.strands.at(-1)!.endMs).toBe(plan.endMs);
		for (let i = 1; i < plan.strands.length; i++) {
			expect(plan.strands[i].startMs).toBe(plan.strands[i - 1].endMs);
		}
		expect(plan.strands.some((s) => s.temperature === 'cold')).toBe(true);
	});
});
