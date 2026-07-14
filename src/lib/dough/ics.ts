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
	'bulk-room',
	'bulk-cold',
	'proof-cold',
	'final-proof'
]);

export function buildIcs(steps: ScheduleStep[], describe: EventDescriptorFn): string {
	const dtstamp = formatUtc(new Date());
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kneadtime//EN', 'CALSCALE:GREGORIAN'];
	for (const step of steps) {
		const start = step.at;
		const end = new Date(start.getTime() + Math.max(1, step.durationMinutes) * 60_000);
		const { summary, description } = describe(step);
		const transp = FREE_KINDS.has(step.kind) ? 'TRANSPARENT' : 'OPAQUE';
		lines.push(
			'BEGIN:VEVENT',
			`UID:${stableUid(step)}@kneadtime`,
			`DTSTAMP:${dtstamp}`,
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

function stableUid(step: ScheduleStep): string {
	// Two parallel pre-ferment mixes can share a start time when both were
	// shrunk to the same wall budget — the type keeps their UIDs distinct.
	const typeSuffix = step.preFermentType ? `-${step.preFermentType}` : '';
	return `${step.kind}${typeSuffix}-${step.at.getTime()}`;
}
