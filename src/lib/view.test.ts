import { describe, expect, it } from 'vitest';
import {
	ASK_STEPS,
	askSteps,
	initialLocation,
	nextStep,
	parseViewHash,
	prevStep,
	stepIndex,
	viewHash,
	visibleAskStep
} from './view';

const SIMPLE = askSteps('beginner');
const ADVANCED = askSteps('expert');

describe('parseViewHash', () => {
	it('reads the three views', () => {
		expect(parseViewHash('#plan')).toEqual({ view: 'plan', step: 'mode' });
		expect(parseViewHash('#library')).toEqual({ view: 'library', step: 'mode' });
		expect(parseViewHash('#ask')).toEqual({ view: 'ask', step: 'mode' });
	});

	it('reads a question by name', () => {
		expect(parseViewHash('#ask/window')).toEqual({ view: 'ask', step: 'window' });
		expect(parseViewHash('ask/method')).toEqual({ view: 'ask', step: 'method' });
	});

	// Parsing knows the full list and nothing about the view mode: a fragment
	// written by someone on the advanced walk has to survive being read by
	// someone on the simple one, and it is `visibleAskStep` that decides what to
	// do about it — not the parser, which would otherwise return null and lose
	// the fact that the fragment was ours at all.
	it('reads an advanced question the simple walk does not ask', () => {
		expect(parseViewHash('#ask/leaven')).toEqual({ view: 'ask', step: 'leaven' });
	});

	it('is not ours when the fragment names nothing we know', () => {
		expect(parseViewHash('')).toBeNull();
		expect(parseViewHash('#')).toBeNull();
		expect(parseViewHash('#schedule')).toBeNull();
		// A step name that is not on the list, and a step under the wrong view.
		expect(parseViewHash('#ask/salt')).toBeNull();
		expect(parseViewHash('#plan/window')).toBeNull();
	});
});

describe('viewHash', () => {
	it('round-trips every location', () => {
		for (const step of ASK_STEPS) {
			const loc = { view: 'ask', step } as const;
			expect(parseViewHash(viewHash(loc))).toEqual(loc);
		}
		for (const view of ['plan', 'library'] as const) {
			const loc = { view, step: 'mode' } as const;
			expect(parseViewHash(viewHash(loc))).toEqual(loc);
		}
	});
});

describe('initialLocation', () => {
	it('honours an explicit fragment over everything else', () => {
		expect(initialLocation({ hash: '#ask/flour', hasRecipe: true, hasMemory: true })).toEqual({
			view: 'ask',
			step: 'flour'
		});
	});

	// The failure mode this whole module exists to prevent: a returning baker
	// with a share link or a saved recipe being walked through the questions
	// again. The plan is the destination for anyone who already has a recipe.
	it('sends anyone carrying a recipe straight to the plan', () => {
		expect(initialLocation({ hash: '', hasRecipe: true, hasMemory: false }).view).toBe('plan');
		expect(initialLocation({ hash: '', hasRecipe: false, hasMemory: true }).view).toBe('plan');
	});

	it('asks the questions only on a genuinely fresh visit', () => {
		expect(initialLocation({ hash: '', hasRecipe: false, hasMemory: false })).toEqual({
			view: 'ask',
			step: 'mode'
		});
	});
});

describe('walking the questions', () => {
	// Pinned as a literal list, in order. The order is the recipe sheet's own —
	// the bake moment and what bounds it, then the batch, then the percentages,
	// then how it is worked, then what leavens it and where it proofs — and the
	// point of writing it out here is that a change to either surface's order
	// has to be a change to the other's too.
	it('asks in the recipe sheet order, starting with which route to take', () => {
		expect([...ASK_STEPS]).toEqual([
			'mode',
			'when',
			'flour',
			'window',
			'batch',
			'dough',
			'method',
			'leaven',
			'proof'
		]);
	});

	// The simple walk is the same list with three lifted out, never a reordered
	// second one: whatever both modes ask, they ask in the same sequence.
	it('cuts the simple walk out of the one list without resequencing it', () => {
		expect([...SIMPLE]).toEqual(['mode', 'when', 'flour', 'window', 'batch', 'method']);
		expect([...ADVANCED]).toEqual([...ASK_STEPS]);
		expect(SIMPLE.filter((s) => !ADVANCED.includes(s))).toEqual([]);
		expect(ADVANCED.filter((s) => !SIMPLE.includes(s))).toEqual(['dough', 'leaven', 'proof']);
	});

	it('has no step before the first or after the last', () => {
		expect(prevStep('mode', SIMPLE)).toBeNull();
		expect(nextStep('method', SIMPLE)).toBeNull();
		expect(nextStep('proof', ADVANCED)).toBeNull();
	});

	// The whole reason these take a walk rather than defaulting to the full
	// list: 'batch' is followed by the mixing method on the simple route and by
	// the percentages on the advanced one, and answering that from the wrong
	// list steps a visitor onto a screen their mode does not show.
	it('steps through the walk it was given, not through all nine', () => {
		expect(nextStep('batch', SIMPLE)).toBe('method');
		expect(nextStep('batch', ADVANCED)).toBe('dough');
		expect(prevStep('method', SIMPLE)).toBe('batch');
		expect(prevStep('method', ADVANCED)).toBe('dough');
		expect(stepIndex('method', SIMPLE)).toBe(5);
		expect(stepIndex('method', ADVANCED)).toBe(6);
	});

	// A step the walk does not contain has no neighbours on it. Reachable from a
	// hand-typed fragment in the instant before `visibleAskStep` clamps it.
	it('has no neighbours for a step this walk does not ask', () => {
		expect(prevStep('leaven', SIMPLE)).toBeNull();
		expect(nextStep('leaven', SIMPLE)).toBeNull();
	});
});

describe('visibleAskStep', () => {
	it('leaves alone any question this mode does ask', () => {
		expect(visibleAskStep('window', 'beginner')).toBe('window');
		expect(visibleAskStep('leaven', 'expert')).toBe('leaven');
	});

	// A hand-typed #ask/leaven, a link from someone on the advanced walk, or the
	// simple route being chosen while standing on one of the three advanced
	// screens: all three land on a question with no Back and no Next.
	it('falls back to the first question when the mode does not ask it', () => {
		expect(visibleAskStep('leaven', 'beginner')).toBe('mode');
		expect(visibleAskStep('dough', 'beginner')).toBe('mode');
		expect(visibleAskStep('proof', 'beginner')).toBe('mode');
	});
});
