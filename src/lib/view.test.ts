import { describe, expect, it } from 'vitest';
import {
	ASK_STEPS,
	initialLocation,
	nextStep,
	parseViewHash,
	prevStep,
	stepIndex,
	viewHash
} from './view';

describe('parseViewHash', () => {
	it('reads the three views', () => {
		expect(parseViewHash('#plan')).toEqual({ view: 'plan', step: 'when' });
		expect(parseViewHash('#library')).toEqual({ view: 'library', step: 'when' });
		expect(parseViewHash('#ask')).toEqual({ view: 'ask', step: 'when' });
	});

	it('reads a question by name', () => {
		expect(parseViewHash('#ask/window')).toEqual({ view: 'ask', step: 'window' });
		expect(parseViewHash('ask/method')).toEqual({ view: 'ask', step: 'method' });
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
			const loc = { view, step: 'when' } as const;
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
			step: 'when'
		});
	});
});

describe('walking the questions', () => {
	it('runs from the bake moment to the way the dough is worked', () => {
		expect([...ASK_STEPS]).toEqual(['when', 'pizzas', 'flour', 'window', 'method']);
	});

	it('has no step before the first or after the last', () => {
		expect(prevStep('when')).toBeNull();
		expect(nextStep('method')).toBeNull();
		expect(nextStep('when')).toBe('pizzas');
		expect(prevStep('window')).toBe('flour');
		expect(stepIndex('window')).toBe(3);
	});
});
