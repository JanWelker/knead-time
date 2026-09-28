// What a device is reminded of, and in which words. Pure: the dialog hands the
// result to api.ts, and the server never holds copy of its own — every title
// and body arrives from here, already in the reader's language.

import type { ComputedSchedule, ScheduleStep, ScheduleStepKind } from '../dough/types';
import { formatDateTime, formatTime } from '../format';
import { interpolate } from '../i18n/interpolate';
import type { Locale, Messages } from '../i18n/messages';
import { stepDescription, stepIngredients, stepTitle } from '../stepCopy';

// Every moment the baker touches the dough, fridge in and fridge out included.
// Not `autolyse`, which starts on its own when prep ends, and not `bulk-room`,
// which starts where mix ends: a second buzz fifteen minutes after the first.
export const REMINDER_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
	'preferment-mix',
	'prep',
	'mix',
	'bulk-cold',
	'divide',
	'proof-cold',
	'final-proof',
	'ready'
]);

// iOS shows about four lines of a notification body; past that it is cut mid-word.
export const BODY_MAX_CHARS = 240;

export interface Reminder {
	uid: string;
	at: string;
	title: string;
	body: string;
}

export interface Receipt {
	title: string;
	body: string;
}

export interface SchedulePayload {
	receipt: Receipt;
	reminders: Reminder[];
}

/** The `.ics` UID shape without the day: the server replaces a whole schedule, so the day is implied. */
export function reminderUid(step: ScheduleStep): string {
	return step.preFermentType ? `${step.kind}-${step.preFermentType}` : step.kind;
}

export function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max - 1);
	const boundary = text[cut.length] === ' ' ? cut.length : cut.lastIndexOf(' ');
	return `${boundary > max / 2 ? cut.slice(0, boundary) : cut}…`;
}

/** The time first, so a push that arrives late reads as late; then what to weigh, then what to do. */
export function reminderBody(
	step: ScheduleStep,
	msgs: Messages,
	schedule: ComputedSchedule,
	locale: Locale
): string {
	const parts = [formatTime(step.at, locale)];
	const weighed = stepIngredients(step, msgs, schedule, locale)
		.map((ing) => `${ing.amount} ${ing.name}`)
		.join(', ');
	if (weighed) parts.push(weighed);
	parts.push(stepDescription(step, msgs, schedule, locale));
	return truncate(parts.join(' · '), BODY_MAX_CHARS);
}

export function reminderSteps(schedule: ComputedSchedule, now: Date): ScheduleStep[] {
	return schedule.steps.filter((step) => REMINDER_KINDS.has(step.kind) && step.at >= now);
}

export function buildSchedulePayload(
	schedule: ComputedSchedule,
	msgs: Messages,
	locale: Locale,
	now: Date
): SchedulePayload {
	const steps = reminderSteps(schedule, now);
	const reminders = steps.map((step) => ({
		uid: reminderUid(step),
		at: step.at.toISOString(),
		title: stepTitle(step, msgs),
		body: reminderBody(step, msgs, schedule, locale)
	}));
	const first = steps[0];
	const body = first
		? interpolate(steps.length === 1 ? msgs.reminders.count_one : msgs.reminders.count_many, {
				n: steps.length,
				title: stepTitle(first, msgs),
				when: formatDateTime(first.at, locale)
			})
		: msgs.reminders.none_ahead;
	return { receipt: { title: msgs.reminders.receipt_title, body }, reminders };
}
