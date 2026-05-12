import { padZero } from '../format';
import type { ScheduleStep } from './types';

export interface IcsEventDescriptor {
	summary: string;
	description: string;
}

export type EventDescriptorFn = (step: ScheduleStep) => IcsEventDescriptor;

export function buildIcs(steps: ScheduleStep[], describe: EventDescriptorFn): string {
	const dtstamp = formatUtc(new Date());
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kneadtime//EN', 'CALSCALE:GREGORIAN'];
	for (const step of steps) {
		const start = step.at;
		const end = new Date(start.getTime() + Math.max(1, step.durationMinutes) * 60_000);
		const { summary, description } = describe(step);
		lines.push(
			'BEGIN:VEVENT',
			`UID:${stableUid(step)}@kneadtime`,
			`DTSTAMP:${dtstamp}`,
			`DTSTART:${formatUtc(start)}`,
			`DTEND:${formatUtc(end)}`,
			`SUMMARY:${escapeText(summary)}`,
			`DESCRIPTION:${escapeText(description)}`,
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
