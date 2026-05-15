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
		fridgeTempC: 4,
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

	it('renders a decimal ball weight identically across locales', () => {
		const r = computeSchedule(inputs({ ballWeight: 288.5 }));
		const divide = r.steps.find((s) => s.kind === 'divide')!;
		for (const locale of ['en', 'de', 'it'] as const) {
			const desc = stepDescription(divide, MESSAGES[locale], r);
			expect(desc, `${locale} should contain 288.5`).toContain('288.5');
		}
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

	it('omits the maturation duration (shown in the Duration column) and "overnight" wording', () => {
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
		expect(en).not.toContain(`${h}:${m}`);
		expect(en).not.toMatch(/HH:MM/i);
		expect(en).not.toContain('{duration}');
		expect(en.toLowerCase()).not.toContain('overnight');

		expect(stepDescription(pf, MESSAGES.de, r).toLowerCase()).not.toContain('über nacht');
		expect(stepDescription(pf, MESSAGES.it, r).toLowerCase()).not.toContain('per la notte');
	});
});

describe('stepDescription — proofing steps omit duration (shown in column)', () => {
	function descFor(
		kind: 'bulk-room' | 'bulk-cold' | 'final-proof',
		startAt: Date,
		readyBy: Date,
		msgs = MESSAGES.en
	) {
		const r = computeSchedule(inputs({ startAt, readyBy }));
		const step = r.steps.find((s) => s.kind === kind)!;
		return { desc: stepDescription(step, msgs, r), minutes: step.durationMinutes };
	}

	function hhmmOf(minutes: number) {
		const h = String(Math.floor(minutes / 60)).padStart(2, '0');
		const m = String(minutes % 60).padStart(2, '0');
		return `${h}:${m}`;
	}

	it('bulk-room description has no duration and no placeholder (room mode)', () => {
		const { desc, minutes } = descFor(
			'bulk-room',
			new Date('2026-05-12T13:00:00Z'),
			new Date('2026-05-12T19:00:00Z')
		);
		expect(desc).not.toContain(hhmmOf(minutes));
		expect(desc).not.toContain('{duration}');
		expect(desc).not.toMatch(/HH:MM/i);
	});

	it('bulk-cold and final-proof descriptions have no duration (cold mode)', () => {
		const startAt = new Date('2026-05-11T07:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		for (const kind of ['bulk-cold', 'final-proof'] as const) {
			const { desc, minutes } = descFor(kind, startAt, readyBy);
			expect(desc, `${kind} should not contain HH:MM`).not.toContain(hhmmOf(minutes));
			expect(desc).not.toContain('{duration}');
			expect(desc).not.toMatch(/HH:MM/i);
		}
	});

	it('de and it proofing descriptions also drop the duration', () => {
		const startAt = new Date('2026-05-12T13:00:00Z');
		const readyBy = new Date('2026-05-12T19:00:00Z');
		const de = descFor('bulk-room', startAt, readyBy, MESSAGES.de);
		const it = descFor('bulk-room', startAt, readyBy, MESSAGES.it);
		expect(de.desc).not.toContain(hhmmOf(de.minutes));
		expect(it.desc).not.toContain(hhmmOf(it.minutes));
		expect(de.desc).not.toMatch(/HH:MM/i);
		expect(it.desc).not.toMatch(/HH:MM/i);
	});
});

describe('stepDescription — mix step water-temp recommendation', () => {
	it('interpolates the recommended water temperature into the mix description', () => {
		const r = computeSchedule(inputs());
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		const desc = stepDescription(mix, MESSAGES.en, r);
		expect(desc).toContain(`${r.idealWaterTempC} °C`);
		expect(desc).not.toContain('{water_temp}');
	});

	it('mentions chilling with ice for the baker with a hot kitchen', () => {
		const r = computeSchedule(inputs({ roomTempC: 30 }));
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		const desc = stepDescription(mix, MESSAGES.en, r);
		expect(desc.toLowerCase()).toContain('ice');
	});

	it('flows the water temperature through the biga and poolish mix copy too', () => {
		for (const type of ['biga', 'poolish'] as const) {
			const r = computeSchedule(inputs({ preFerment: { type, flourPercent: 30 } }));
			const mix = r.steps.find((s) => s.kind === 'mix')!;
			const desc = stepDescription(mix, MESSAGES.en, r);
			expect(desc, `${type} mix should interpolate water temp`).toContain(
				`${r.idealWaterTempC} °C`
			);
			expect(desc).not.toContain('{water_temp}');
		}
	});
});

describe('stepDescription — mix step with pre-ferment', () => {
	it('names the pre-ferment by type so the baker knows what to fold in', () => {
		const poolish = computeSchedule(inputs({ preFerment: { type: 'poolish', flourPercent: 30 } }));
		const poolishMix = poolish.steps.find((s) => s.kind === 'mix')!;
		expect(stepDescription(poolishMix, MESSAGES.en, poolish).toLowerCase()).toContain('poolish');
		expect(stepDescription(poolishMix, MESSAGES.de, poolish).toLowerCase()).toContain('poolish');
		expect(stepDescription(poolishMix, MESSAGES.it, poolish).toLowerCase()).toContain('poolish');

		const biga = computeSchedule(inputs({ preFerment: { type: 'biga', flourPercent: 30 } }));
		const bigaMix = biga.steps.find((s) => s.kind === 'mix')!;
		expect(stepDescription(bigaMix, MESSAGES.en, biga).toLowerCase()).toContain('biga');
		expect(stepDescription(bigaMix, MESSAGES.de, biga).toLowerCase()).toContain('biga');
		expect(stepDescription(bigaMix, MESSAGES.it, biga).toLowerCase()).toContain('biga');
	});

	it('omits the yeast field on the mix step because the pre-ferment carries it', () => {
		const r = computeSchedule(inputs({ preFerment: { type: 'poolish', flourPercent: 30 } }));
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		const desc = stepDescription(mix, MESSAGES.en, r);
		expect(desc).not.toContain('fresh yeast');
		expect(desc).not.toMatch(/\b0 g\b/);
	});

	it('falls back to the no-preferment mix copy when no pre-ferment is set', () => {
		const r = computeSchedule(inputs());
		const mix = r.steps.find((s) => s.kind === 'mix')!;
		const desc = stepDescription(mix, MESSAGES.en, r);
		expect(desc.toLowerCase()).not.toContain('biga');
		expect(desc.toLowerCase()).not.toContain('poolish');
		expect(desc).toContain('fresh yeast');
	});
});

describe('stepDescription — prep step with pre-ferment', () => {
	it('flags the remaining ingredients and notes the yeast lives in the pre-ferment', () => {
		const r = computeSchedule(inputs({ preFerment: { type: 'poolish', flourPercent: 30 } }));
		const prep = r.steps.find((s) => s.kind === 'prep')!;
		const desc = stepDescription(prep, MESSAGES.en, r);
		expect(desc).not.toContain('fresh yeast');
		// remaining flour/water for prep should match the main-dough amounts
		expect(desc).toContain(`${Math.round(r.ingredients.flour)} g flour`);
	});
});

describe('stepDescription — ready step', () => {
	it('returns the raw template (no interpolation) for the ready step', () => {
		const r = computeSchedule(inputs());
		const ready = r.steps.find((s) => s.kind === 'ready')!;
		expect(stepDescription(ready, MESSAGES.en, r)).toBe(MESSAGES.en.steps.ready_desc);
		expect(stepDescription(ready, MESSAGES.de, r)).toBe(MESSAGES.de.steps.ready_desc);
		expect(stepDescription(ready, MESSAGES.it, r)).toBe(MESSAGES.it.steps.ready_desc);
	});
});
