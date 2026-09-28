import { describe, expect, it } from 'vitest';
import { computeSchedule } from '../dough/schedule';
import { defaultInputs } from '../dough/testFixtures';
import type { DoughInputs, ScheduleStepKind } from '../dough/types';
import { formatDateTime, formatTime } from '../format';
import { LOCALES, MESSAGES } from '../i18n/messages';
import { stepTitle } from '../stepCopy';
import {
	BODY_MAX_CHARS,
	buildSchedulePayload,
	REMINDER_KINDS,
	reminderBody,
	reminderSteps,
	reminderUid,
	truncate
} from './reminders';

function inputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return defaultInputs(overrides);
}

// Biga + poolish over a long window: every kind the schedule can emit but one.
const BOTH = inputs({
	startAt: new Date('2026-05-11T07:00:00Z'),
	readyBy: new Date('2026-05-13T19:00:00Z'),
	preFerments: [
		{ type: 'biga', flourPercent: 30 },
		{ type: 'poolish', flourPercent: 20 }
	]
});

describe('REMINDER_KINDS', () => {
	// Pinned by membership: every kind the baker has to act on, and neither of
	// the two that start on their own.
	it('is every hands-on moment, fridge in and out included', () => {
		expect([...REMINDER_KINDS].sort()).toEqual(
			(
				[
					'preferment-mix',
					'prep',
					'mix',
					'bulk-cold',
					'divide',
					'proof-cold',
					'final-proof',
					'ready'
				] as ScheduleStepKind[]
			).sort()
		);
		expect(REMINDER_KINDS.has('autolyse')).toBe(false);
		expect(REMINDER_KINDS.has('bulk-room')).toBe(false);
	});
});

describe('reminderUid', () => {
	it('is the kind, with the pre-ferment type when two mixes share a kind', () => {
		const s = computeSchedule(BOTH);
		const uids = s.steps.map(reminderUid);
		expect(uids).toContain('preferment-mix-biga');
		expect(uids).toContain('preferment-mix-poolish');
		expect(uids).toContain('prep');
		expect(new Set(uids).size).toBe(uids.length);
	});

	it('is a valid Web Push topic: at most 32 URL-safe characters', () => {
		for (const step of computeSchedule(BOTH).steps) {
			expect(reminderUid(step)).toMatch(/^[A-Za-z0-9_-]{1,32}$/);
		}
	});
});

describe('truncate', () => {
	it('leaves short text alone', () => {
		expect(truncate('Mix the dough', 20)).toBe('Mix the dough');
	});

	it('cuts on a word boundary and marks the cut', () => {
		expect(truncate('Mix the dough until it is smooth', 20)).toBe('Mix the dough until…');
		expect(truncate('Mix the dough until it is smooth', 20).length).toBeLessThanOrEqual(20);
	});

	it('cuts mid-word rather than losing more than half the room', () => {
		expect(truncate('Supercalifragilistic expialidocious', 12)).toBe('Supercalifr…');
	});
});

describe('reminderBody', () => {
	it('opens with the time, then the weights, then the method', () => {
		const s = computeSchedule(inputs());
		const prep = s.steps.find((step) => step.kind === 'prep')!;
		const body = reminderBody(prep, MESSAGES.en, s, 'en');
		expect(body.startsWith(`${formatTime(prep.at, 'en')} · `)).toBe(true);
		expect(body).toContain(' g ');
		expect(body.length).toBeLessThanOrEqual(BODY_MAX_CHARS);
	});

	it('never exceeds the body cap in any locale', () => {
		const s = computeSchedule(BOTH);
		for (const locale of LOCALES) {
			for (const step of s.steps) {
				expect(reminderBody(step, MESSAGES[locale], s, locale).length).toBeLessThanOrEqual(
					BODY_MAX_CHARS
				);
			}
		}
	});

	it('takes the reader’s decimal punctuation', () => {
		const s = computeSchedule(inputs({ ballWeight: 288.5, pizzaCount: 1 }));
		const prep = s.steps.find((step) => step.kind === 'prep')!;
		expect(reminderBody(prep, MESSAGES.de, s, 'de')).toMatch(/\d,\d g/);
	});

	it('skips the weights on a step that puts nothing on the scale', () => {
		const s = computeSchedule(inputs());
		const ready = s.steps.find((step) => step.kind === 'ready')!;
		const body = reminderBody(ready, MESSAGES.en, s, 'en');
		expect(body.split(' · ')).toHaveLength(2);
	});
});

describe('reminderSteps', () => {
	it('keeps the hands-on steps still ahead, in order', () => {
		const s = computeSchedule(BOTH);
		const steps = reminderSteps(s, new Date(0));
		expect(steps.map((step) => step.kind)).toEqual(
			s.steps.filter((step) => REMINDER_KINDS.has(step.kind)).map((step) => step.kind)
		);
		expect(steps.length).toBeGreaterThanOrEqual(6);
	});

	it('drops what is already behind', () => {
		const s = computeSchedule(BOTH);
		const all = reminderSteps(s, new Date(0));
		const later = reminderSteps(s, new Date(all[1].at.getTime() + 1));
		expect(later).toEqual(all.slice(2));
		expect(reminderSteps(s, new Date('2030-01-01T00:00:00Z'))).toEqual([]);
	});
});

describe('buildSchedulePayload', () => {
	it('carries one reminder per hands-on step, with ISO instants', () => {
		const s = computeSchedule(BOTH);
		const payload = buildSchedulePayload(s, MESSAGES.en, 'en', new Date(0));
		const steps = reminderSteps(s, new Date(0));
		expect(payload.reminders).toHaveLength(steps.length);
		expect(payload.reminders[0]).toEqual({
			uid: reminderUid(steps[0]),
			at: steps[0].at.toISOString(),
			title: stepTitle(steps[0], MESSAGES.en),
			body: reminderBody(steps[0], MESSAGES.en, s, 'en')
		});
		expect(payload.reminders.length).toBeLessThanOrEqual(16);
	});

	it('the receipt names the count and the first step', () => {
		const s = computeSchedule(BOTH);
		const payload = buildSchedulePayload(s, MESSAGES.de, 'de', new Date(0));
		const first = reminderSteps(s, new Date(0))[0];
		expect(payload.receipt.title).toBe(MESSAGES.de.reminders.receipt_title);
		expect(payload.receipt.body).toContain(String(payload.reminders.length));
		expect(payload.receipt.body).toContain(stepTitle(first, MESSAGES.de));
		expect(payload.receipt.body).toContain(formatDateTime(first.at, 'de'));
	});

	it('uses the singular when one step is left', () => {
		const s = computeSchedule(inputs());
		const ready = s.steps[s.steps.length - 1];
		const payload = buildSchedulePayload(
			s,
			MESSAGES.en,
			'en',
			new Date(ready.at.getTime() - 60_000)
		);
		expect(payload.reminders).toHaveLength(1);
		expect(payload.receipt.body).toBe(
			`One reminder: ${stepTitle(ready, MESSAGES.en)}, ${formatDateTime(ready.at, 'en')}.`
		);
	});

	it('says so when nothing is ahead', () => {
		const s = computeSchedule(inputs());
		const payload = buildSchedulePayload(s, MESSAGES.en, 'en', new Date('2030-01-01'));
		expect(payload.reminders).toEqual([]);
		expect(payload.receipt.body).toBe(MESSAGES.en.reminders.none_ahead);
	});
});
