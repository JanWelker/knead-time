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

	it('keeps UIDs unique for two preferment-mix steps sharing a start time', () => {
		// Both pre-ferments can shrink to the same wall budget and start at the
		// same minute — the pre-ferment type must keep their UIDs apart or
		// calendars silently drop one event on import.
		const at = new Date('2026-05-12T08:00:00Z');
		const clashing: ScheduleStep[] = [
			{ kind: 'preferment-mix', at, durationMinutes: 300, preFermentType: 'biga' },
			{ kind: 'preferment-mix', at, durationMinutes: 300, preFermentType: 'poolish' }
		];
		const out = buildIcs(clashing, describe_);
		const uids = [...out.matchAll(/UID:([^\r\n]+)/g)].map((m) => m[1]);
		expect(uids).toHaveLength(2);
		expect(new Set(uids).size).toBe(2);
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

	it('marks active steps as busy (TRANSP:OPAQUE) and proofing steps as free (TRANSP:TRANSPARENT)', () => {
		// preferment-mix is mostly passive maturation, so it's marked TRANSPARENT
		// even though the first few minutes are active mixing — the calendar should
		// not block out the baker's day for the maturation.
		const mixedSteps: ScheduleStep[] = [
			{ kind: 'preferment-mix', at: new Date('2026-05-11T18:00:00Z'), durationMinutes: 720 },
			{ kind: 'prep', at: new Date('2026-05-12T06:00:00Z'), durationMinutes: 15 },
			{ kind: 'bulk-cold', at: new Date('2026-05-12T07:15:00Z'), durationMinutes: 720 },
			{ kind: 'final-proof', at: new Date('2026-05-12T18:00:00Z'), durationMinutes: 60 },
			{ kind: 'ready', at: new Date('2026-05-12T19:00:00Z'), durationMinutes: 0 }
		];
		const blocks = buildIcs(mixedSteps, describe_).split('BEGIN:VEVENT').slice(1);
		const transpByIndex = blocks.map((b) =>
			b.includes('TRANSP:OPAQUE')
				? 'OPAQUE'
				: b.includes('TRANSP:TRANSPARENT')
					? 'TRANSPARENT'
					: null
		);
		expect(transpByIndex).toEqual([
			'TRANSPARENT',
			'OPAQUE',
			'TRANSPARENT',
			'TRANSPARENT',
			'OPAQUE'
		]);
	});
});
