import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, formatUtc } from './ics';
import type { ScheduleStep } from './types';

describe('formatUtc', () => {
	it('formats UTC times as YYYYMMDDTHHMMSSZ', () => {
		expect(formatUtc(new Date('2026-05-12T13:05:09Z'))).toBe('20260512T130509Z');
	});
});

describe('escapeText', () => {
	it('escapes commas, semicolons, backslashes, and newlines', () => {
		expect(escapeText('hi, ;\\\nworld')).toBe('hi\\, \\;\\\\\\nworld');
	});
});

describe('buildIcs', () => {
	const steps: ScheduleStep[] = [
		{
			kind: 'mix',
			at: new Date('2026-05-12T13:00:00Z'),
			durationMinutes: 15
		},
		{
			kind: 'ready',
			at: new Date('2026-05-12T19:00:00Z'),
			durationMinutes: 0
		}
	];
	const describe_ = () => ({ summary: 'S', description: 'D' });

	it('emits one VEVENT per step', () => {
		const out = buildIcs(steps, describe_);
		const events = out.match(/BEGIN:VEVENT/g) ?? [];
		expect(events.length).toBe(steps.length);
	});

	it('wraps with BEGIN/END:VCALENDAR', () => {
		const out = buildIcs(steps, describe_);
		expect(out.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
		expect(out.endsWith('END:VCALENDAR\r\n')).toBe(true);
	});

	it('uses DTEND ≥ DTSTART even for zero-duration steps', () => {
		const out = buildIcs(steps, describe_);
		expect(out.includes('DTSTART:20260512T190000Z')).toBe(true);
		expect(out.includes('DTEND:20260512T190100Z')).toBe(true);
	});

	it('uses CRLF line endings (RFC 5545)', () => {
		const out = buildIcs(steps, describe_);
		expect(out.includes('\r\n')).toBe(true);
		// no bare LFs except after CR
		const bareLfMatches = out.match(/(?<!\r)\n/g);
		expect(bareLfMatches).toBeNull();
	});
});
