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
	'warmup',
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
	return lines.join('\r\n');
}

export function escapeText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
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
	return `${step.kind}-${step.at.getTime()}`;
}
