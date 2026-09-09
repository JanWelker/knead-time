import { isAtNight } from '../dough/schedule';
import { stableUid } from '../dough/ics';
import type { ComputedSchedule, ScheduleStepKind } from '../dough/types';
import type { Messages } from '../i18n/messages';
import { stepDetailText, stepTitle } from '../stepCopy';
import type { Reminder } from './bridge';

// iOS keeps at most this many pending notification requests per app and drops
// the excess *silently* — no error, no callback, just reminders that never
// arrive. The worst case this app can produce today is six (biga and poolish
// in parallel: two preferment mixes, prep, mix, divide, ready), so the headroom
// is enormous and the cap is a backstop rather than a constraint. It is applied
// on this side as well as in Swift because "silently" is the whole problem:
// whichever side forgets, the user simply stops being reminded.
export const MAX_PENDING = 64;

// The steps worth a buzz: the ones where the baker has to be at the counter,
// plus the bake itself. Everything else is dough sitting still.
//
// This is deliberately its own set rather than a call to isActiveStep(), even
// though the two agree today and a test below pins that they do. isActiveStep
// says so in its own comment — it exists "specifically for UI affordances" —
// and schedule.ts already carries a second, wider set (ACTIVE_NIGHT_KINDS) for
// exactly this reason: one notion of "active" could not serve two purposes.
// This is the third, and it is the one with a real-world cost when it moves.
// Retuning which step gets a bold row on screen must not silently change what
// wakes someone up.
export const REMINDED_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
	'preferment-mix',
	'prep',
	'mix',
	'divide',
	// Not a baker action — it is the moment the whole plan was scheduled
	// backwards from, and the one reminder nobody wants to miss.
	'ready'
]);

/**
 * The complete set of reminders for a recipe, as the native shell should hold
 * it. Always the whole list: the shell cancels everything pending and re-adds
 * this, so an abandoned plan cannot survive as a stale 03:00 buzz.
 *
 * `now` is injected rather than read, so the rule about past steps is testable
 * from both sides of the boundary instead of only from whichever side the
 * clock happens to be on.
 */
export function buildReminders(schedule: ComputedSchedule, msgs: Messages, now: Date): Reminder[] {
	// A window too short to be a plan has nothing to remind anyone about. One
	// rule in one place, so no caller has to remember it.
	if (!schedule.feasible) return [];

	const cutoff = now.getTime();
	return (
		schedule.steps
			.filter((step) => REMINDED_KINDS.has(step.kind))
			// Strictly past the cutoff, not at it. iOS fires a trigger for "now"
			// immediately, and buzzing about the step you are standing in is the bug.
			// It also drops past triggers without saying so, so this side has to be
			// the one that decides which steps are still ahead.
			.filter((step) => step.at.getTime() > cutoff)
			.slice(0, MAX_PENDING)
			.map((step) => ({
				id: stableUid(step),
				at: step.at.getTime(),
				title: stepTitle(step, msgs),
				// The same text the calendar event and the on-screen step carry, so a
				// lock screen never disagrees with the plan: the amounts this step puts
				// on the scale, then what to do with them. The beginner explanation is
				// left out — a notification has no page budget.
				body: stepDetailText(step, msgs, schedule, { includeDetail: false }),
				silent: isAtNight(step.at)
			}))
	);
}

/**
 * Whether two lists say the same thing.
 *
 * Every keystroke in the adjust sheet recomputes the schedule, and every post
 * across the bridge is a full cancel-and-re-add on the other side. Typing "28"
 * into the ball weight must not churn the OS's notification store twice.
 */
export function sameReminders(a: readonly Reminder[], b: readonly Reminder[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((x, i) => {
		const y = b[i];
		return (
			x.id === y.id &&
			x.at === y.at &&
			x.title === y.title &&
			x.body === y.body &&
			x.silent === y.silent
		);
	});
}
