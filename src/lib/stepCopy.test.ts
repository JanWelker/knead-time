import { describe, expect, it } from 'vitest';
import { computeSchedule } from './dough/schedule';
import type { DoughInputs } from './dough/types';
import { MESSAGES } from './i18n/messages';
import { stepDescription, stepTitle } from './stepCopy';

function inputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return {
		readyBy: new Date('2026-05-12T19:00:00Z'),
		startAt: new Date('2026-05-12T13:00:00Z'),
		pizzaCount: 6,
		ballWeight: 288.5,
		hydration: 70,
		saltPercent: 3,
		yeastType: 'fresh',
		starterHydration: 100,
		roomTempC: 22,
		preFerment: null,
		...overrides
	};
}

describe('stepDescription — divide step', () => {
	it('interpolates pizza count and ball weight into the description (en)', () => {
		const r = computeSchedule(inputs());
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		const desc = stepDescription(divide, MESSAGES.en, r);
		expect(desc).toContain('6');
		expect(desc).toContain('288.5');
		expect(desc).not.toContain('{n}');
		expect(desc).not.toContain('{weight}');
	});

	it('interpolates in German', () => {
		const r = computeSchedule(inputs({ pizzaCount: 4, ballWeight: 280 }));
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		const desc = stepDescription(divide, MESSAGES.de, r);
		expect(desc).toContain('4');
		expect(desc).toContain('280');
		expect(desc).toContain('Teiglinge');
	});

	it('interpolates in Italian', () => {
		const r = computeSchedule(inputs({ pizzaCount: 8, ballWeight: 250 }));
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		const desc = stepDescription(divide, MESSAGES.it, r);
		expect(desc).toContain('8');
		expect(desc).toContain('250');
		expect(desc).toContain('panetti');
	});

	it('falls back to the raw template when no schedule context is supplied', () => {
		const r = computeSchedule(inputs());
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		expect(stepDescription(divide, MESSAGES.en)).toBe(MESSAGES.en.steps.divide_desc);
	});

	it('shows the ball weight at 0.1 g precision so Round-numbers shifts are visible', () => {
		const r = computeSchedule(inputs({ ballWeight: 288.5 }));
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		const desc = stepDescription(divide, MESSAGES.en, r);
		expect(desc).toContain('288.5');
	});

	it('omits the decimal for integer ball weights', () => {
		const r = computeSchedule(inputs({ ballWeight: 280 }));
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		const desc = stepDescription(divide, MESSAGES.en, r);
		expect(desc).toContain('280 g');
		expect(desc).not.toContain('280.0');
	});
});

describe('stepTitle', () => {
	it('returns the localized step title', () => {
		const r = computeSchedule(inputs());
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		expect(stepTitle(divide, MESSAGES.en)).toBe('Divide & ball');
		expect(stepTitle(divide, MESSAGES.de)).toBe('Portionieren');
		expect(stepTitle(divide, MESSAGES.it)).toBe('Staglio');
	});
});

describe('stepDescription — prep / mix weights', () => {
	it('interpolates ingredient weights and fresh-yeast label', () => {
		const r = computeSchedule(inputs());
		const prep = r.steps.find((s) => s.kind === 'prep')!;
		const desc = stepDescription(prep, MESSAGES.en, r);
		expect(desc).toContain(`${Math.round(r.ingredients.flour)} g flour`);
		expect(desc).toContain(`${Math.round(r.ingredients.water)} g water`);
		expect(desc).toContain(`${Math.round(r.ingredients.salt)} g salt`);
		expect(desc).toContain('fresh yeast');
		expect(desc).not.toContain('{');
	});

	it('uses the sourdough-starter label when yeast is sourdough', () => {
		const r = computeSchedule(inputs({ yeastType: 'sourdough' }));
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		const desc = stepDescription(mix, MESSAGES.en, r);
		expect(desc).toContain('sourdough starter');
		expect(desc).not.toContain('fresh yeast');
	});

	it('localizes the inline yeast label', () => {
		const r = computeSchedule(inputs());
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		expect(stepDescription(mix, MESSAGES.de, r)).toContain('Frischhefe');
		expect(stepDescription(mix, MESSAGES.it, r)).toContain('lievito fresco');
	});

	it('falls back to the raw template when no schedule context is supplied', () => {
		const r = computeSchedule(inputs());
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		expect(stepDescription(mix, MESSAGES.en)).toBe(MESSAGES.en.steps.mix_desc);
	});
});

describe('stepDescription — preferment-mix weights', () => {
	it('interpolates pre-ferment ingredient weights when a pre-ferment is set', () => {
		const r = computeSchedule(
			inputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'poolish', flourPercent: 30 }
			})
		);
		const pf = r.steps.find((s) => s.kind === 'preferment-mix')!;
		const desc = stepDescription(pf, MESSAGES.en, r);
		expect(r.ingredients.preFerment).not.toBeNull();
		expect(desc).toContain(`${Math.round(r.ingredients.preFerment!.flour)} g flour`);
		expect(desc).toContain(`${Math.round(r.ingredients.preFerment!.water)} g water`);
		expect(desc).not.toContain('{');
	});

	it('shows the maturation duration in HH:MM and drops "overnight" wording', () => {
		const r = computeSchedule(
			inputs({
				startAt: new Date('2026-05-11T07:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z'),
				preFerment: { type: 'biga', flourPercent: 30 }
			})
		);
		const pf = r.steps.find((s) => s.kind === 'preferment-mix')!;
		const prep = r.steps.find((s) => s.kind === 'prep')!;
		const expectedMin = Math.round((prep.at.getTime() - pf.at.getTime()) / 60_000);
		const h = String(Math.floor(expectedMin / 60)).padStart(2, '0');
		const m = String(expectedMin % 60).padStart(2, '0');

		const en = stepDescription(pf, MESSAGES.en, r);
		expect(en).toContain(`${h}:${m}`);
		expect(en.toLowerCase()).not.toContain('overnight');

		expect(stepDescription(pf, MESSAGES.de, r).toLowerCase()).not.toContain('über nacht');
		expect(stepDescription(pf, MESSAGES.it, r).toLowerCase()).not.toContain('per la notte');
	});
});

describe('stepDescription — proofing step durations', () => {
	function descAndMin(
		kind: 'bulk-room' | 'bulk-cold' | 'warmup' | 'final-proof',
		startAt: Date,
		readyBy: Date
	) {
		const r = computeSchedule(inputs({ startAt, readyBy }));
		const step = r.steps.find((s) => s.kind === kind)!;
		return { desc: stepDescription(step, MESSAGES.en, r), minutes: step.durationMinutes };
	}

	it('renders bulk-room duration as HH:MM (room mode)', () => {
		const { desc, minutes } = descAndMin(
			'bulk-room',
			new Date('2026-05-12T13:00:00Z'),
			new Date('2026-05-12T19:00:00Z')
		);
		const h = String(Math.floor(minutes / 60)).padStart(2, '0');
		const m = String(minutes % 60).padStart(2, '0');
		expect(desc).toContain(`${h}:${m}`);
		expect(desc).not.toContain('{duration}');
	});

	it('renders bulk-cold, warmup and final-proof durations as HH:MM (cold mode)', () => {
		const startAt = new Date('2026-05-11T07:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		for (const kind of ['bulk-cold', 'warmup', 'final-proof'] as const) {
			const { desc, minutes } = descAndMin(kind, startAt, readyBy);
			const h = String(Math.floor(minutes / 60)).padStart(2, '0');
			const m = String(minutes % 60).padStart(2, '0');
			expect(desc, `${kind} missing HH:MM`).toContain(`${h}:${m}`);
			expect(desc).not.toContain('{duration}');
		}
	});

	it('interpolates proofing duration even without schedule context (step has it)', () => {
		const r = computeSchedule(inputs());
		const bulk = r.steps.find((s) => s.kind === 'bulk-room')!;
		const desc = stepDescription(bulk, MESSAGES.en);
		expect(desc).not.toContain('{duration}');
	});

	it('localizes proofing duration in de and it', () => {
		const r = computeSchedule(inputs());
		const bulk = r.steps.find((s) => s.kind === 'bulk-room')!;
		const h = String(Math.floor(bulk.durationMinutes / 60)).padStart(2, '0');
		const m = String(bulk.durationMinutes % 60).padStart(2, '0');
		expect(stepDescription(bulk, MESSAGES.de, r)).toContain(`${h}:${m}`);
		expect(stepDescription(bulk, MESSAGES.it, r)).toContain(`${h}:${m}`);
	});
});

describe('stepDescription — mix step with pre-ferment', () => {
	it('tells the baker to add the ripe pre-dough', () => {
		const r = computeSchedule(inputs({ preFerment: { type: 'poolish', flourPercent: 30 } }));
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		expect(stepDescription(mix, MESSAGES.en, r)).toContain('pre-dough');
		expect(stepDescription(mix, MESSAGES.de, r)).toContain('Vorteig');
		expect(stepDescription(mix, MESSAGES.it, r)).toContain('preimpasto');
	});

	it('omits the pre-dough mention when no pre-ferment is set', () => {
		const r = computeSchedule(inputs());
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		expect(stepDescription(mix, MESSAGES.en, r)).not.toContain('pre-dough');
	});
});
