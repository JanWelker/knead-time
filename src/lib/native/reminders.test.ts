import { describe, expect, it } from 'vitest';
import { isActiveStep } from '../dough/scheduleStatus';
import { computeSchedule } from '../dough/schedule';
import { defaultInputs } from '../dough/testFixtures';
import { LOCALES, MESSAGES } from '../i18n/messages';
import { stepTitle } from '../stepCopy';
import type { ComputedSchedule, ScheduleStep, ScheduleStepKind } from '../dough/types';
import { buildReminders, MAX_PENDING, REMINDED_KINDS, sameReminders } from './reminders';

const en = MESSAGES.en;
/** Long before any fixture's first step, so nothing is filtered as past. */
const LONG_AGO = new Date('2020-01-01T00:00:00Z');

const ALL_KINDS: ScheduleStepKind[] = [
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

/** A schedule with exactly these steps, for the rules that are about one field. */
function scheduleOf(steps: ScheduleStep[], feasible = true): ComputedSchedule {
	const real = computeSchedule(defaultInputs());
	return { ...real, steps, feasible };
}

describe('which steps are worth a buzz', () => {
	// Membership, not a sample: a sampled set covers the entries it happens to
	// name and leaves every other one free to be deleted.
	it('is the baker-action steps plus the bake', () => {
		expect([...REMINDED_KINDS].sort()).toEqual(
			['divide', 'mix', 'prep', 'preferment-mix', 'ready'].sort()
		);
	});

	// Every kind decided rather than defaulted — a new ScheduleStepKind has to
	// be argued about here instead of silently inheriting "no reminder".
	it.each([
		['preferment-mix', true],
		['prep', true],
		// A flour-and-water rest with no yeast in it: the baker has already
		// walked away, and walks back for the mix that follows it.
		['autolyse', false],
		['mix', true],
		['bulk-room', false],
		['bulk-cold', false],
		['divide', true],
		['proof-cold', false],
		['final-proof', false],
		['ready', true]
	] as const)('%s is reminded: %s', (kind, reminded) => {
		expect(REMINDED_KINDS.has(kind)).toBe(reminded);
	});

	it('has an opinion about every kind there is', () => {
		expect(ALL_KINDS).toHaveLength(10);
	});

	// The coupling, stated once. The two sets agree today, and this is what
	// makes them drift on purpose rather than by accident: retuning which step
	// gets a bold row on screen must not silently change what wakes someone up.
	it('is exactly the UI’s active steps plus the bake, today', () => {
		const fromUi = new Set<ScheduleStepKind>(ALL_KINDS.filter(isActiveStep));
		fromUi.add('ready');
		expect([...REMINDED_KINDS].sort()).toEqual([...fromUi].sort());
	});
});

describe('building the reminder list', () => {
	// The shape that made stableUid carry preFermentType in the first place:
	// biga and poolish mature in parallel and can be shrunk to the same wall
	// budget, so two preferment-mix steps can share a start instant. Two
	// notification requests with one id means the second silently replaces the
	// first — the baker is never told to mix the poolish.
	const coldTwoPreferments = computeSchedule(
		defaultInputs({
			readyBy: new Date('2026-05-14T18:00:00Z'),
			startAt: new Date('2026-05-12T08:00:00Z'),
			preFerments: [
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			]
		})
	);

	it('covers a cold biga-and-poolish plan with six reminders and six distinct ids', () => {
		const list = buildReminders(coldTwoPreferments, en, LONG_AGO);
		expect(list).toHaveLength(6);
		expect(list.map((r) => r.id.replace(/-\d+$/, ''))).toEqual([
			'preferment-mix-biga',
			'preferment-mix-poolish',
			'prep',
			'mix',
			'divide',
			'ready'
		]);
		expect(new Set(list.map((r) => r.id)).size).toBe(6);
	});

	it('carries each step’s own start instant, and the copy the plan shows', () => {
		const list = buildReminders(coldTwoPreferments, en, LONG_AGO);
		for (const reminder of list) {
			const step = coldTwoPreferments.steps.find(
				(s) => s.at.getTime() === reminder.at && REMINDED_KINDS.has(s.kind)
			);
			expect(step).toBeDefined();
			expect(reminder.title).toBe(stepTitle(step!, en));
			expect(reminder.body.length).toBeGreaterThan(0);
		}
	});

	// A window too short to be a plan has nothing to remind anyone about, and
	// the rule lives here so no caller has to remember it.
	it('is empty for a schedule that is not feasible', () => {
		const infeasible = computeSchedule(
			defaultInputs({
				readyBy: new Date('2026-05-12T13:30:00Z'),
				startAt: new Date('2026-05-12T13:00:00Z')
			})
		);
		expect(infeasible.feasible).toBe(false);
		expect(buildReminders(infeasible, en, LONG_AGO)).toEqual([]);
	});
});

describe('the line between a step that is ahead and one that is not', () => {
	const at = new Date('2026-05-12T15:00:00Z');
	const steps: ScheduleStep[] = [{ kind: 'mix', at, durationMinutes: 15 }];

	// Both sides of the boundary and the boundary itself. iOS fires a trigger
	// for "now" immediately, so a step at exactly the cutoff must be dropped —
	// buzzing about the step you are standing in is the bug.
	it.each([
		['a millisecond before it', -1, 1],
		['exactly on it', 0, 0],
		['a millisecond after it', 1, 0]
	])('a step whose start is %s', (_label, offsetMs, expected) => {
		const now = new Date(at.getTime() + offsetMs);
		expect(buildReminders(scheduleOf(steps), en, now)).toHaveLength(expected);
	});
});

describe('a step that lands in the night', () => {
	// The schedule already refuses to place work in [22:00, 08:00) where it can
	// and warns where it cannot. A reminder should not be louder than the plan
	// that produced it: it still fires at the real time — the dough does not
	// wait — but it does not wake anyone.
	//
	// Local hours, because isAtNight reads local hours; the suite runs in TZ=UTC.
	it.each([
		['21:59, still the evening', '2026-05-12T21:59:00Z', false],
		['22:00, the edge itself', '2026-05-12T22:00:00Z', true],
		['07:59, still the night', '2026-05-12T07:59:00Z', true],
		['08:00, morning', '2026-05-12T08:00:00Z', false]
	])('at %s is silent: %s', (_label, iso, silent) => {
		const steps: ScheduleStep[] = [{ kind: 'mix', at: new Date(iso), durationMinutes: 15 }];
		expect(buildReminders(scheduleOf(steps), en, LONG_AGO)[0].silent).toBe(silent);
	});
});

describe('the cap iOS enforces silently', () => {
	it('is 64', () => {
		expect(MAX_PENDING).toBe(64);
	});

	// iOS drops everything past the cap without an error or a callback, so a
	// list that overflows does not fail — it just stops reminding anyone. The
	// app can't produce 100 steps today; the backstop is pinned anyway.
	it('keeps the first 64 and no more', () => {
		const base = new Date('2026-05-12T00:00:00Z').getTime();
		const many: ScheduleStep[] = Array.from({ length: 100 }, (_, i) => ({
			kind: 'mix' as const,
			at: new Date(base + i * 3_600_000),
			durationMinutes: 15
		}));
		const list = buildReminders(scheduleOf(many), en, LONG_AGO);
		expect(list).toHaveLength(64);
		expect(list[63].at).toBe(base + 63 * 3_600_000);
	});
});

describe('the copy that reaches a lock screen', () => {
	// Same shape as the TRMNL payload suite: every locale, because a missing
	// key or an un-substituted placeholder only shows up in the one language
	// nobody develops in.
	it.each(LOCALES)('is complete and fully substituted in %s', (locale) => {
		const schedule = computeSchedule(
			defaultInputs({ preFerments: [{ type: 'biga', flourPercent: 30 }] })
		);
		const list = buildReminders(schedule, MESSAGES[locale], LONG_AGO);
		expect(list.length).toBeGreaterThan(0);
		for (const reminder of list) {
			expect(reminder.title.length).toBeGreaterThan(0);
			expect(reminder.body.length).toBeGreaterThan(0);
			// A leftover {token} means an interpolation was never applied.
			expect(reminder.body).not.toMatch(/\{[a-z_]+\}/i);
			expect(reminder.title).not.toMatch(/\{[a-z_]+\}/i);
		}
	});
});

describe('deciding whether the list actually changed', () => {
	const one = { id: 'mix-1', at: 1, title: 'Mix', body: 'Knead it', silent: false };

	it('says two identical lists are the same', () => {
		expect(sameReminders([one], [{ ...one }])).toBe(true);
		expect(sameReminders([], [])).toBe(true);
	});

	// Every field, because a comparison that misses one is a reminder that
	// silently never updates — the worst direction for this to fail in.
	it.each([
		['id', { id: 'mix-2' }],
		['at', { at: 2 }],
		['title', { title: 'Mix now' }],
		['body', { body: 'Knead it well' }],
		['silent', { silent: true }]
	])('notices a changed %s', (_field, patch) => {
		expect(sameReminders([one], [{ ...one, ...patch }])).toBe(false);
	});

	it('notices a changed length', () => {
		expect(sameReminders([one], [one, { ...one, id: 'ready-2' }])).toBe(false);
		expect(sameReminders([one], [])).toBe(false);
	});
});
