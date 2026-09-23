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
	const now = new Date('2026-05-10T09:30:00Z');
	const uidsOf = (out: string) => [...out.matchAll(/UID:([^\r\n]+)/g)].map((m) => m[1]);

	it('emits one VEVENT per step', () => {
		const out = buildIcs(steps, describe_, now);
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
		const out = buildIcs(clashing, describe_, now);
		const uids = uidsOf(out);
		expect(uids).toHaveLength(2);
		expect(new Set(uids).size).toBe(2);
	});

	// The UID rule: `<kind>[-<preFermentType>]-<bake day>@kneadtime`, the bake
	// day being the ready step's UTC date. The old rule keyed every UID on the
	// step's own timestamp, and since every step time derives from readyBy,
	// nudging the bake by 15 minutes and exporting again put a second copy of
	// the whole schedule in the calendar instead of updating the first. The
	// suite never caught it because it only ever asserted UIDs were unique
	// within one export, never that they were stable across two.
	const bakeOn = (readyBy: string) =>
		computeSchedule(
			defaultInputs({
				startAt: new Date(new Date(readyBy).getTime() - 30 * 3_600_000),
				readyBy: new Date(readyBy),
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			})
		);

	it("keys every UID on the ready step's UTC day, not on the step's own time", () => {
		const out = buildIcs(bakeOn('2026-05-12T19:00:00Z').steps, describe_, now);
		expect(uidsOf(out)).toEqual([
			'preferment-mix-biga-20260512@kneadtime',
			'preferment-mix-poolish-20260512@kneadtime',
			'prep-20260512@kneadtime',
			'mix-20260512@kneadtime',
			'bulk-room-20260512@kneadtime',
			'bulk-cold-20260512@kneadtime',
			'divide-20260512@kneadtime',
			'final-proof-20260512@kneadtime',
			'ready-20260512@kneadtime'
		]);
	});

	it('re-exporting the same bake nudged by 15 minutes carries identical UIDs', () => {
		// The edit people make most on a plan they live inside for two days.
		// Every step moved, so under the old rule not one UID survived.
		const before = buildIcs(bakeOn('2026-05-12T19:00:00Z').steps, describe_, now);
		const after = buildIcs(bakeOn('2026-05-12T19:15:00Z').steps, describe_, now);
		expect(uidsOf(after)).toEqual(uidsOf(before));
		// And the events really did move — this is an update, not a no-op.
		expect(after).not.toBe(before);
		expect(before.includes('DTSTART:20260512T190000Z')).toBe(true);
		expect(after.includes('DTSTART:20260512T191500Z')).toBe(true);
	});

	it('a bake on a different day gets a different set of UIDs', () => {
		// Two bakes a week apart are two schedules and must coexist in the
		// calendar; the day is what keeps them apart.
		const monday = uidsOf(buildIcs(bakeOn('2026-05-12T19:00:00Z').steps, describe_, now));
		const nextMonday = uidsOf(buildIcs(bakeOn('2026-05-19T19:00:00Z').steps, describe_, now));
		expect(nextMonday).toHaveLength(monday.length);
		for (const uid of nextMonday) expect(monday).not.toContain(uid);
	});

	it('keeps every UID unique within the 9-step worst case (biga + poolish, cold)', () => {
		// Keying on the day throws away the timestamp that used to separate
		// the steps, so uniqueness now rests on the kind (and the pre-ferment
		// type) alone. The longest schedule the app emits is the one to check.
		const schedule = bakeOn('2026-05-12T19:00:00Z');
		expect(schedule.steps).toHaveLength(9);
		const uids = uidsOf(buildIcs(schedule.steps, describe_, now));
		expect(uids).toHaveLength(9);
		expect(new Set(uids).size).toBe(9);
	});

	it('stamps DTSTAMP with the export moment and SEQUENCE with its unix seconds', () => {
		// A calendar treats a re-import under a known UID as an update only
		// when it can see it is newer; Google Calendar reads SEQUENCE for that
		// and ignores a re-import whose SEQUENCE has not risen. Both come from
		// the `now` parameter, so this can be pinned to a literal.
		const out = buildIcs(steps, describe_, now);
		const dtstamps = out.match(/DTSTAMP:[^\r\n]+/g);
		expect(dtstamps).toEqual(['DTSTAMP:20260510T093000Z', 'DTSTAMP:20260510T093000Z']);
		const sequences = out.match(/SEQUENCE:[^\r\n]+/g);
		expect(sequences).toEqual(['SEQUENCE:1778405400', 'SEQUENCE:1778405400']);
		// A later export outranks an earlier one.
		const later = buildIcs(steps, describe_, new Date(now.getTime() + 60_000));
		expect(later.includes('SEQUENCE:1778405460')).toBe(true);
	});

	it('wraps with BEGIN/END:VCALENDAR', () => {
		const out = buildIcs(steps, describe_, now);
		expect(out.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
		expect(out.endsWith('END:VCALENDAR\r\n')).toBe(true);
	});

	it('uses DTEND ≥ DTSTART even for zero-duration steps', () => {
		const out = buildIcs(steps, describe_, now);
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
		const out = buildIcs(
			schedule.steps,
			(step) => ({
				summary: stepTitle(step, msgs),
				description: stepDetailText(step, msgs, schedule, { includeDetail: true })
			}),
			now
		);
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
		const out = buildIcs(steps, describe_, now);
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
		const blocks = buildIcs(mixedSteps, describe_, now).split('BEGIN:VEVENT').slice(1);
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
