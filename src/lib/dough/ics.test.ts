import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../i18n/messages';
import { stepDetailText, stepTitle } from '../stepCopy';
import { buildIcs, escapeText, foldLine, formatUtc } from './ics';
import { computeSchedule } from './schedule';
import { defaultInputs } from './testFixtures';
import type { ScheduleStep } from './types';

const encoder = new TextEncoder();

function octets(line: string): number {
	return encoder.encode(line).length;
}

// RFC 5545 §3.1 unfolding: remove CRLF immediately followed by a single
// whitespace character.
function unfold(text: string): string {
	return text.replace(/\r\n /g, '');
}

describe('formatUtc', () => {
	it('formats UTC times as YYYYMMDDTHHMMSSZ', () => {
		expect(formatUtc(new Date('2026-05-12T13:05:09Z'))).toBe('20260512T130509Z');
	});
});

describe('escapeText', () => {
	it('escapes commas, semicolons, backslashes, and newlines', () => {
		expect(escapeText('hi, ;\\\nworld')).toBe('hi\\, \\;\\\\\\nworld');
	});

	it('escapes a lone carriage return as \\n', () => {
		expect(escapeText('a\rb')).toBe('a\\nb');
	});
});

describe('foldLine', () => {
	it('leaves a line of exactly 75 octets unfolded', () => {
		const line = 'x'.repeat(75);
		expect(foldLine(line)).toBe(line);
	});

	it('folds an overlong ASCII line into ≤75-octet lines that unfold losslessly', () => {
		const line = `DESCRIPTION:${'abcde '.repeat(40)}`;
		const folded = foldLine(line);
		const physical = folded.split('\r\n');
		expect(physical.length).toBeGreaterThan(1);
		expect(physical[0].length).toBe(75);
		for (const p of physical) expect(octets(p)).toBeLessThanOrEqual(75);
		for (const p of physical.slice(1)) expect(p.startsWith(' ')).toBe(true);
		expect(unfold(folded)).toBe(line);
	});

	it('backs off to a character boundary when the 75-octet limit falls inside an umlaut', () => {
		// 74 ASCII octets, then 'ü' (2 octets in UTF-8) — a naive byte-slice at
		// 75 would cut the sequence in half. The fold must break before it.
		const line = 'x'.repeat(74) + 'üabc';
		const folded = foldLine(line);
		const physical = folded.split('\r\n');
		expect(physical[0]).toBe('x'.repeat(74));
		expect(physical[1]).toBe(' üabc');
		for (const p of physical) expect(octets(p)).toBeLessThanOrEqual(75);
		expect(unfold(folded)).toBe(line);
	});

	it('keeps every line ≤75 octets on all-multi-byte content', () => {
		const line = 'ü'.repeat(80);
		const folded = foldLine(line);
		for (const p of folded.split('\r\n')) expect(octets(p)).toBeLessThanOrEqual(75);
		expect(unfold(folded)).toBe(line);
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

	it('folds every content line to ≤75 octets for the worst-case German schedule', () => {
		// Cold mode + biga + poolish with the descriptive detail paragraph in
		// German — the longest DESCRIPTION the app can produce.
		const schedule = computeSchedule(
			defaultInputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			})
		);
		const msgs = MESSAGES.de;
		const out = buildIcs(schedule.steps, (step) => ({
			summary: stepTitle(step, msgs),
			description: stepDetailText(step, msgs, schedule, { includeDetail: true })
		}));
		const physical = out.split('\r\n');
		const over = physical.filter((line) => octets(line) > 75);
		expect(over).toEqual([]);
		// The folding actually exercised a long line and unfolds losslessly.
		expect(physical.some((line) => line.startsWith(' '))).toBe(true);
		const logical = unfold(out).split('\r\n');
		const descriptions = logical.filter((line) => line.startsWith('DESCRIPTION:'));
		expect(descriptions.length).toBe(schedule.steps.length);
		for (const step of schedule.steps) {
			const expected = `DESCRIPTION:${escapeText(
				stepDetailText(step, msgs, schedule, { includeDetail: true })
			)}`;
			expect(descriptions).toContain(expected);
		}
	});

	it('uses CRLF line endings (RFC 5545)', () => {
		const out = buildIcs(steps, describe_);
		expect(out.includes('\r\n')).toBe(true);
		// no bare LFs except after CR
		const bareLfMatches = out.match(/(?<!\r)\n/g);
		expect(bareLfMatches).toBeNull();
	});

	it('marks active steps as busy (TRANSP:OPAQUE) and proofing steps as free (TRANSP:TRANSPARENT)', () => {
		// Every step kind, not a sample of five: autolyse, bulk-room and
		// proof-cold could each be dropped from the free set without failing a
		// thing, and a step wrongly marked busy blocks out the baker's whole
		// calendar day for a rest they walk away from.
		//
		// preferment-mix is mostly passive maturation, so it's TRANSPARENT even
		// though the first few minutes are active mixing. Autolyse is a passive
		// flour+water rest. 'ready' is OPAQUE — the bake is the appointment the
		// whole schedule exists for.
		const start = new Date('2026-05-11T06:00:00Z').getTime();
		const at = (hoursIn: number) => new Date(start + hoursIn * 3_600_000);
		const expected: Array<[ScheduleStep['kind'], 'OPAQUE' | 'TRANSPARENT']> = [
			['preferment-mix', 'TRANSPARENT'],
			['prep', 'OPAQUE'],
			['autolyse', 'TRANSPARENT'],
			['mix', 'OPAQUE'],
			['bulk-room', 'TRANSPARENT'],
			['bulk-cold', 'TRANSPARENT'],
			['divide', 'OPAQUE'],
			['proof-cold', 'TRANSPARENT'],
			['final-proof', 'TRANSPARENT'],
			['ready', 'OPAQUE']
		];
		const mixedSteps: ScheduleStep[] = expected.map(([kind], i) => ({
			kind,
			at: at(i),
			durationMinutes: 30
		}));
		const blocks = buildIcs(mixedSteps, describe_).split('BEGIN:VEVENT').slice(1);
		const transpByIndex = blocks.map((b) =>
			b.includes('TRANSP:OPAQUE')
				? 'OPAQUE'
				: b.includes('TRANSP:TRANSPARENT')
					? 'TRANSPARENT'
					: null
		);
		expect(transpByIndex).toEqual(expected.map(([, transp]) => transp));
	});
});
