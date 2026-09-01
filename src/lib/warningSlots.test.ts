import { describe, expect, it } from 'vitest';
import type { ScheduleWarning } from './dough/types';
import { WARNING_SLOT, warningsFor, type WarningSlot } from './warningSlots';

const ALL = Object.keys(WARNING_SLOT) as ScheduleWarning[];
const SLOTS: WarningSlot[] = ['window', 'temperature', 'ingredients'];

describe('WARNING_SLOT', () => {
	it('places every warning the schedule can raise', () => {
		// The Record type already enforces this at compile time; asserting it
		// here too means a warning added with a placeholder slot still has to be
		// thought about rather than silently landing wherever.
		expect(ALL).toEqual([
			'too-short',
			'night-step',
			'flour-window-long',
			'flour-window-short',
			'too-cold',
			'too-warm',
			'yeast-tiny',
			'yeast-large'
		]);
	});

	it('uses only slots the UI actually renders', () => {
		for (const w of ALL) expect(SLOTS).toContain(WARNING_SLOT[w]);
	});

	it('leaves no slot empty — an unused slot is a mount point nobody sees', () => {
		for (const slot of SLOTS) {
			expect(ALL.some((w) => WARNING_SLOT[w] === slot)).toBe(true);
		}
	});
});

describe('warningsFor', () => {
	it('returns only the warnings belonging to that slot', () => {
		expect(warningsFor('window', ALL)).toEqual([
			'too-short',
			'night-step',
			'flour-window-long',
			'flour-window-short'
		]);
		expect(warningsFor('temperature', ALL)).toEqual(['too-cold', 'too-warm']);
		expect(warningsFor('ingredients', ALL)).toEqual(['yeast-tiny', 'yeast-large']);
	});

	it('shows every warning exactly once across the three slots', () => {
		// The whole point of splitting them up: nothing may be dropped on the
		// floor, and nothing may be shouted twice in two places.
		const rendered = SLOTS.flatMap((slot) => warningsFor(slot, ALL));
		expect([...rendered].sort()).toEqual([...ALL].sort());
		expect(new Set(rendered).size).toBe(ALL.length);
	});

	it('keeps the schedule’s own ordering within a slot', () => {
		expect(warningsFor('window', ['flour-window-long', 'too-short'])).toEqual([
			'flour-window-long',
			'too-short'
		]);
	});

	it('is empty for a slot with nothing to say', () => {
		expect(warningsFor('temperature', ['too-short', 'yeast-tiny'])).toEqual([]);
		expect(warningsFor('window', [])).toEqual([]);
	});
});
