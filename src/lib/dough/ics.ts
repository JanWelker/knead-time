import { padZero } from '../format';
import type { ScheduleStep, ScheduleStepKind } from './types';

export interface IcsEventDescriptor {
	summary: string;
	description: string;
}

export type EventDescriptorFn = (step: ScheduleStep) => IcsEventDescriptor;

// Passive proofing/maturation steps are reported as free time; everything else
// is busy work the baker has to be present for. preferment-mix spans the full
// pre-ferment block — the active mixing at the start is a few minutes, but the
// VEVENT runs through the maturation, so it's free time for calendar purposes.
const FREE_KINDS: ReadonlySet<ScheduleStepKind> = new Set([
	'preferment-mix',
	// Autolyse is a passive flour+water rest — the baker walks away.
	'autolyse',
	'bulk-room',
	'bulk-cold',
	'proof-cold',
	'final-proof'
]);

// `now` is the export moment. It is a parameter rather than a `new Date()`
// inside, so the module stays pure and a test can pin DTSTAMP and SEQUENCE.
export function buildIcs(steps: ScheduleStep[], describe: EventDescriptorFn, now: Date): string {
	const dtstamp = formatUtc(now);
	// A re-export is only an update if the calendar can tell it is newer than
	// what it already holds under the same UID. RFC 5545 §3.8.7.4 leaves that
	// to SEQUENCE, and Google Calendar in particular ignores a re-import whose
	// SEQUENCE has not risen — DTSTAMP alone is not enough there. Unix seconds
	// of the export moment is a sequence number that only ever goes up.
	const sequence = Math.floor(now.getTime() / 1000);
	const bakeDay = bakeDayOf(steps);
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kneadtime//EN', 'CALSCALE:GREGORIAN'];
	for (const step of steps) {
		const start = step.at;
		const end = new Date(start.getTime() + Math.max(1, step.durationMinutes) * 60_000);
		const { summary, description } = describe(step);
		const transp = FREE_KINDS.has(step.kind) ? 'TRANSPARENT' : 'OPAQUE';
		lines.push(
			'BEGIN:VEVENT',
			`UID:${stableUid(step, bakeDay)}@kneadtime`,
			`DTSTAMP:${dtstamp}`,
			`SEQUENCE:${sequence}`,
			`DTSTART:${formatUtc(start)}`,
			`DTEND:${formatUtc(end)}`,
			`SUMMARY:${escapeText(summary)}`,
			`DESCRIPTION:${escapeText(description)}`,
			`TRANSP:${transp}`,
			'END:VEVENT'
		);
	}
	lines.push('END:VCALENDAR', '');
	// Folding is a final pass over each fully-assembled content line so it
	// composes with escaping — a fold can legally land between the backslash
	// and the 'n' of an escaped newline, and unfolding restores it.
	return lines.map(foldLine).join('\r\n');
}

// RFC 5545 §3.1: a content line must not exceed 75 octets (UTF-8 bytes, not
// code points; the CRLF delimiter doesn't count). Longer lines fold onto
// continuation lines that begin with a single space, which does count toward
// their 75. Splits always land on code-point boundaries — German/French copy
// carries umlauts/accents whose multi-byte sequences must never be cut.
const MAX_LINE_OCTETS = 75;
const encoder = new TextEncoder();

export function foldLine(line: string): string {
	if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;
	const folded: string[] = [];
	let chunk = '';
	let octets = 0;
	// for...of iterates code points, so surrogate pairs stay intact too.
	for (const char of line) {
		const charOctets = encoder.encode(char).length;
		if (octets + charOctets > MAX_LINE_OCTETS) {
			folded.push(chunk);
			chunk = ' ';
			octets = 1;
		}
		chunk += char;
		octets += charOctets;
	}
	folded.push(chunk);
	return folded.join('\r\n');
}

export function escapeText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

export function formatUtc(date: Date): string {
	return (
		date.getUTCFullYear().toString() +
		padZero(date.getUTCMonth() + 1) +
		padZero(date.getUTCDate()) +
		'T' +
		padZero(date.getUTCHours()) +
		padZero(date.getUTCMinutes()) +
		padZero(date.getUTCSeconds()) +
		'Z'
	);
}

// The day of the bake, as YYYYMMDD in UTC — the `ready` step is always the
// last one and sits exactly on readyBy. UTC rather than local because every
// time in this file is written as a UTC `Z` value, so the day that anchors
// the UIDs is read off the same clock the events are.
function bakeDayOf(steps: ScheduleStep[]): string {
	return formatUtc(steps[steps.length - 1].at).slice(0, 8);
}

function stableUid(step: ScheduleStep, bakeDay: string): string {
	// Two parallel pre-ferment mixes can share a start time when both were
	// shrunk to the same wall budget — the type keeps their UIDs distinct.
	const typeSuffix = step.preFermentType ? `-${step.preFermentType}` : '';
	// The UID is keyed on the bake DAY, not the step's own time. Every step
	// time derives from readyBy, so a UID carrying the step's timestamp
	// changed on every edit — nudging the bake by 15 minutes and exporting
	// again left the baker with two whole schedules in the calendar, on an
	// app people live inside for two days, across the one edit they make
	// most. Keyed on the day, a re-export of the same day's bake carries the
	// same UIDs and the calendar updates the events in place. The trade is
	// that two different bakes on the same day share UIDs and the second
	// import overwrites the first; a second bake on one day is rare enough,
	// and a doubled schedule common enough, that this is the right side.
	return `${step.kind}${typeSuffix}-${bakeDay}`;
}
