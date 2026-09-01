import type { ScheduleWarning } from './dough/types';

// Where each schedule warning is rendered.
//
// A warning is only useful next to the thing you would change because of it.
// Collected at the foot of the form they all read as one undifferentiated
// complaint, and "longer than this flour tolerates" in particular ends up a
// screen below the slider that set the window.
//
//   window       — the fermentation window is the cause and the cure
//   temperature  — a room that is too cold or too hot for the schedule
//   ingredients  — a solved amount you have to weigh out
//
// `Record<ScheduleWarning, …>` is the point of this table: a new warning fails
// to compile until it has been given a home, so none can silently fall back to
// a catch-all.
export type WarningSlot = 'window' | 'temperature' | 'ingredients';

export const WARNING_SLOT: Record<ScheduleWarning, WarningSlot> = {
	// Every one of these is answered by moving the bake time or dragging the
	// window — which is exactly what their copy tells you to do.
	'too-short': 'window',
	'night-step': 'window',
	'flour-window-long': 'window',
	'flour-window-short': 'window',
	// Both fire on roomTempC alone.
	'too-cold': 'temperature',
	'too-warm': 'temperature',
	// These are about the number on the scale ("measure carefully", "double-check
	// the inputs"), so they belong with the weights rather than with the window
	// that produced them — and the yeast field itself is expert-only, while a
	// beginner can reach both extremes through the window alone.
	'yeast-tiny': 'ingredients',
	'yeast-large': 'ingredients'
};

export function warningsFor(slot: WarningSlot, warnings: ScheduleWarning[]): ScheduleWarning[] {
	return warnings.filter((w) => WARNING_SLOT[w] === slot);
}
