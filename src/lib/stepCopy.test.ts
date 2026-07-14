import { describe, expect, it } from 'vitest';
import { computeSchedule } from './dough/schedule';
import { defaultInputs, findStep } from './dough/testFixtures';
import type { DoughInputs, PreFermentType } from './dough/types';
import { formatGrams } from './format';
import { MESSAGES } from './i18n/messages';
import {
	stepDescription,
	stepDetail,
	stepDetailText,
	stepIngredients,
	stepTitle
} from './stepCopy';

// stepCopy tests use the decimal ball weight (288.5 g) by default because
// formatBallWeight's decimal-rendering is a regression worth covering.
function inputs(overrides: Partial<DoughInputs> = {}): DoughInputs {
	return defaultInputs({ ballWeight: 288.5, ...overrides });
}

// A window wide enough to fit a pre-ferment phase.
function prefermentInputs(type: PreFermentType, overrides: Partial<DoughInputs> = {}): DoughInputs {
	return inputs({
		startAt: new Date('2026-05-11T07:00:00Z'),
		readyBy: new Date('2026-05-12T19:00:00Z'),
		preFerments: type === 'none' ? [] : [{ type, flourPercent: 30 }],
		...overrides
	});
}

describe('stepTitle', () => {
	it('returns the localized step title', () => {
		const r = computeSchedule(inputs());
		const divide = findStep(r, 'divide');
		expect(stepTitle(divide, MESSAGES.en)).toBe('Divide & ball');
		expect(stepTitle(divide, MESSAGES.de)).toBe('Portionieren');
		expect(stepTitle(divide, MESSAGES.it)).toBe('Staglio');
	});

	it('titles each preferment-mix step by its own type', () => {
		const r = computeSchedule(
			prefermentInputs('biga', {
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			})
		);
		const [biga, poolish] = r.steps.filter((s) => s.kind === 'preferment-mix');
		expect(stepTitle(biga, MESSAGES.en)).toBe(MESSAGES.en.steps.preferment_mix_biga);
		expect(stepTitle(poolish, MESSAGES.en)).toBe(MESSAGES.en.steps.preferment_mix_poolish);
	});
});

describe('stepDescription — divide step', () => {
	it('interpolates pizza count and ball weight into the description (en)', () => {
		const r = computeSchedule(inputs());
		const divide = findStep(r, 'divide');
		const desc = stepDescription(divide, MESSAGES.en, r);
		expect(desc).toContain('6');
		expect(desc).toContain('288.5');
		expect(desc).not.toContain('{n}');
		expect(desc).not.toContain('{weight}');
	});

	it('interpolates in German', () => {
		const r = computeSchedule(inputs({ pizzaCount: 4, ballWeight: 280 }));
		const desc = stepDescription(findStep(r, 'divide'), MESSAGES.de, r);
		expect(desc).toContain('4');
		expect(desc).toContain('280');
		expect(desc).toContain('Teiglinge');
	});

	it('shows the ball weight at 0.1 g precision so Round-numbers shifts are visible', () => {
		const r = computeSchedule(inputs({ ballWeight: 288.5 }));
		expect(stepDescription(findStep(r, 'divide'), MESSAGES.en, r)).toContain('288.5');
	});

	it('omits the decimal for integer ball weights', () => {
		const r = computeSchedule(inputs({ ballWeight: 280 }));
		const desc = stepDescription(findStep(r, 'divide'), MESSAGES.en, r);
		expect(desc).toContain('280 g');
		expect(desc).not.toContain('280.0');
	});

	it('falls back to the raw template when no schedule context is supplied', () => {
		const r = computeSchedule(inputs());
		expect(stepDescription(findStep(r, 'divide'), MESSAGES.en)).toBe(MESSAGES.en.steps.divide_desc);
	});
});

describe('stepDescription — prep / mix method copy', () => {
	it('drops the ingredient amounts from the prose (they move to the list)', () => {
		const r = computeSchedule(inputs());
		const prep = stepDescription(findStep(r, 'prep'), MESSAGES.en, r);
		const mix = stepDescription(findStep(r, 'mix'), MESSAGES.en, r);
		expect(prep).not.toMatch(/\d+ g flour/);
		expect(mix).not.toMatch(/\d+ g flour/);
		expect(prep).not.toContain('{');
		expect(mix).not.toContain('{');
	});

	it('interpolates the recommended water temperature into the mix method', () => {
		const r = computeSchedule(inputs());
		const desc = stepDescription(findStep(r, 'mix'), MESSAGES.en, r);
		expect(desc).toContain(`${r.idealWaterTempC} °C`);
		expect(desc).not.toContain('{water_temp}');
	});

	it('mentions chilling with ice for the baker with a hot kitchen', () => {
		const r = computeSchedule(inputs({ roomTempC: 30 }));
		expect(stepDescription(findStep(r, 'mix'), MESSAGES.en, r).toLowerCase()).toContain('ice');
	});

	it('falls back to the raw mix template when no schedule context is supplied', () => {
		const r = computeSchedule(inputs());
		expect(stepDescription(findStep(r, 'mix'), MESSAGES.en)).toBe(MESSAGES.en.steps.mix_desc);
	});

	it('appends the machine kneading technique to the mix method by default', () => {
		const r = computeSchedule(inputs());
		const desc = stepDescription(findStep(r, 'mix'), MESSAGES.en, r);
		expect(desc).toContain(MESSAGES.en.steps.mix_technique_machine);
		expect(desc).not.toContain(MESSAGES.en.steps.mix_technique_hand);
	});

	it('appends the hand kneading technique when mixing by hand, also under a pre-ferment', () => {
		const plain = computeSchedule(inputs({ mixingMethod: 'hand' }));
		expect(stepDescription(findStep(plain, 'mix'), MESSAGES.en, plain)).toContain(
			MESSAGES.en.steps.mix_technique_hand
		);
		const withBiga = computeSchedule(prefermentInputs('biga', { mixingMethod: 'hand' }));
		const desc = stepDescription(findStep(withBiga, 'mix'), MESSAGES.en, withBiga);
		expect(desc).toContain(MESSAGES.en.steps.mix_desc_with_biga.split('{')[0]);
		expect(desc).toContain(MESSAGES.en.steps.mix_technique_hand);
	});

	it('uses the with-preferment prep copy and notes the yeast lives in the pre-dough', () => {
		const r = computeSchedule(prefermentInputs('poolish'));
		const desc = stepDescription(findStep(r, 'prep'), MESSAGES.en, r);
		expect(desc).toBe(MESSAGES.en.steps.prep_desc_with_preferment);
		expect(desc.toLowerCase()).toContain('yeast');
	});

	it('names the pre-ferment by type in the mix method, across locales', () => {
		for (const type of ['biga', 'poolish'] as const) {
			const r = computeSchedule(prefermentInputs(type));
			const mix = findStep(r, 'mix');
			for (const locale of ['en', 'de', 'it'] as const) {
				expect(stepDescription(mix, MESSAGES[locale], r).toLowerCase()).toContain(type);
			}
			expect(stepDescription(mix, MESSAGES.en, r)).toContain(`${r.idealWaterTempC} °C`);
		}
	});

	it('uses the combined mix copy when biga and poolish run together', () => {
		const r = computeSchedule(
			prefermentInputs('biga', {
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			})
		);
		const desc = stepDescription(findStep(r, 'mix'), MESSAGES.en, r);
		expect(desc.toLowerCase()).toContain('biga');
		expect(desc.toLowerCase()).toContain('poolish');
		expect(desc).toContain(`${r.idealWaterTempC} °C`);
		expect(desc).not.toContain('{');
	});

	it('lists each pre-dough on its own preferment-mix step with its own amounts', () => {
		const r = computeSchedule(
			prefermentInputs('biga', {
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			})
		);
		const [bigaStep, poolishStep] = r.steps.filter((s) => s.kind === 'preferment-mix');
		const bigaList = stepIngredients(bigaStep, MESSAGES.en, r);
		const poolishList = stepIngredients(poolishStep, MESSAGES.en, r);
		const [bigaIng, poolishIng] = r.ingredients.preFerments;
		expect(bigaList[0].amount).toBe(formatGrams(bigaIng.flour));
		expect(poolishList[0].amount).toBe(formatGrams(poolishIng.flour));
		expect(bigaList[2].amount).toBe(formatGrams(bigaIng.yeast));
		expect(poolishList[2].amount).toBe(formatGrams(poolishIng.yeast));
	});
});

describe('stepDescription — preferment-mix method copy', () => {
	it('picks the biga method copy for a biga pre-ferment', () => {
		const r = computeSchedule(prefermentInputs('biga'));
		expect(stepDescription(findStep(r, 'preferment-mix'), MESSAGES.en, r)).toBe(
			MESSAGES.en.steps.preferment_mix_desc_biga
		);
	});

	it('picks the poolish method copy for a poolish pre-ferment', () => {
		const r = computeSchedule(prefermentInputs('poolish'));
		expect(stepDescription(findStep(r, 'preferment-mix'), MESSAGES.it, r)).toBe(
			MESSAGES.it.steps.preferment_mix_desc_poolish
		);
	});

	it('omits weights, durations and "overnight" wording', () => {
		const r = computeSchedule(prefermentInputs('biga'));
		const desc = stepDescription(findStep(r, 'preferment-mix'), MESSAGES.en, r);
		expect(desc).not.toMatch(/\d+ g/);
		expect(desc).not.toContain('{');
		expect(desc.toLowerCase()).not.toContain('overnight');
	});
});

describe('stepDescription — proofing steps omit duration (shown in column)', () => {
	function hhmmOf(minutes: number) {
		const h = String(Math.floor(minutes / 60)).padStart(2, '0');
		const m = String(minutes % 60).padStart(2, '0');
		return `${h}:${m}`;
	}

	it('bulk-room description has no duration and no placeholder', () => {
		const r = computeSchedule(
			inputs({
				startAt: new Date('2026-05-12T13:00:00Z'),
				readyBy: new Date('2026-05-12T19:00:00Z')
			})
		);
		const step = findStep(r, 'bulk-room');
		const desc = stepDescription(step, MESSAGES.en, r);
		expect(desc).toBe(MESSAGES.en.steps.bulk_room_desc);
		expect(desc).not.toContain(hhmmOf(step.durationMinutes));
	});

	it('bulk-cold and final-proof descriptions have no duration (cold mode)', () => {
		const r = computeSchedule(prefermentInputs('none'));
		for (const kind of ['bulk-cold', 'final-proof'] as const) {
			const step = findStep(r, kind);
			expect(stepDescription(step, MESSAGES.de, r)).not.toContain(hhmmOf(step.durationMinutes));
		}
	});
});

describe('stepDescription — ready step', () => {
	it('returns the raw template for the ready step', () => {
		const r = computeSchedule(inputs());
		const ready = findStep(r, 'ready');
		expect(stepDescription(ready, MESSAGES.en, r)).toBe(MESSAGES.en.steps.ready_desc);
		expect(stepDescription(ready, MESSAGES.de, r)).toBe(MESSAGES.de.steps.ready_desc);
	});
});

describe('stepIngredients — weighed amounts', () => {
	it('lists flour, water, salt and fresh yeast for the no-preferment prep step', () => {
		const r = computeSchedule(inputs());
		const list = stepIngredients(findStep(r, 'prep'), MESSAGES.en, r);
		expect(list.map((i) => i.name)).toEqual(['Flour', 'Water', 'Salt', 'Fresh yeast']);
		expect(list[0]).toEqual({ amount: formatGrams(r.ingredients.flour), name: 'Flour' });
		expect(list[3].amount).toBe(formatGrams(r.ingredients.yeast));
	});

	it('lists nothing for the no-preferment mix step — everything was weighed at prep', () => {
		const r = computeSchedule(inputs());
		expect(stepIngredients(findStep(r, 'mix'), MESSAGES.en, r)).toEqual([]);
	});

	it('uses the sourdough-starter name when the yeast is sourdough', () => {
		const r = computeSchedule(inputs({ yeastType: 'sourdough' }));
		const list = stepIngredients(findStep(r, 'prep'), MESSAGES.en, r);
		expect(list.map((i) => i.name)).toContain('Sourdough starter');
		expect(list.map((i) => i.name)).not.toContain('Fresh yeast');
	});

	it('localizes the ingredient names', () => {
		const r = computeSchedule(inputs());
		const list = stepIngredients(findStep(r, 'prep'), MESSAGES.de, r);
		expect(list.map((i) => i.name)).toEqual(['Mehl', 'Wasser', 'Salz', 'Frischhefe']);
	});

	it('drops yeast from day-two prep when a pre-ferment carries it, and mix lists nothing', () => {
		const r = computeSchedule(prefermentInputs('biga'));
		expect(stepIngredients(findStep(r, 'prep'), MESSAGES.en, r).map((i) => i.name)).toEqual([
			'Flour',
			'Water',
			'Salt'
		]);
		expect(stepIngredients(findStep(r, 'mix'), MESSAGES.en, r)).toEqual([]);
	});

	it('lists the pre-ferment flour, water and yeast for the preferment-mix step', () => {
		const r = computeSchedule(prefermentInputs('poolish'));
		const list = stepIngredients(findStep(r, 'preferment-mix'), MESSAGES.en, r);
		expect(list.map((i) => i.name)).toEqual(['Flour', 'Water', 'Fresh yeast']);
		expect(list[0].amount).toBe(formatGrams(r.ingredients.preFerments[0].flour));
		expect(list[2].amount).toBe(formatGrams(r.ingredients.preFerments[0].yeast));
	});

	it('appends an oil row to prep when oilPercent > 0, without repeating it at mix', () => {
		const r = computeSchedule(inputs({ oilPercent: 5 }));
		const prep = stepIngredients(findStep(r, 'prep'), MESSAGES.en, r);
		expect(prep[prep.length - 1]).toEqual({ amount: formatGrams(r.ingredients.oil), name: 'Oil' });
		expect(prep.map((i) => i.name)).not.toContain('Sugar');
		expect(stepIngredients(findStep(r, 'mix'), MESSAGES.en, r)).toEqual([]);
	});

	it('appends a sugar row when sugarPercent > 0', () => {
		const r = computeSchedule(inputs({ sugarPercent: 2 }));
		const prep = stepIngredients(findStep(r, 'prep'), MESSAGES.en, r);
		expect(prep.map((i) => i.name)).toContain('Sugar');
		expect(prep.map((i) => i.name)).not.toContain('Oil');
	});

	it('appends both oil and sugar rows when both are present', () => {
		const r = computeSchedule(inputs({ oilPercent: 5, sugarPercent: 2 }));
		const names = stepIngredients(findStep(r, 'prep'), MESSAGES.en, r).map((i) => i.name);
		expect(names).toContain('Oil');
		expect(names).toContain('Sugar');
	});

	it('weighs oil and sugar at the mix step when a pre-ferment is set', () => {
		const r = computeSchedule(prefermentInputs('biga', { oilPercent: 4, sugarPercent: 1.5 }));
		expect(stepIngredients(findStep(r, 'mix'), MESSAGES.en, r).map((i) => i.name)).toEqual([
			'Oil',
			'Sugar'
		]);
		// ...but not at day-two prep, which only weighs the basics.
		const prep = stepIngredients(findStep(r, 'prep'), MESSAGES.en, r).map((i) => i.name);
		expect(prep).not.toContain('Oil');
	});

	it('returns no ingredient rows for waiting / shaping steps', () => {
		const r = computeSchedule(prefermentInputs('none'));
		for (const kind of ['bulk-cold', 'divide', 'final-proof', 'ready'] as const) {
			expect(stepIngredients(findStep(r, kind), MESSAGES.en, r)).toEqual([]);
		}
	});
});

describe('stepDetailText — flat .ics form', () => {
	it('joins the ingredient list and the method into newline-separated text', () => {
		const r = computeSchedule(inputs());
		const text = stepDetailText(findStep(r, 'prep'), MESSAGES.en, r);
		const lines = text.split('\n');
		expect(lines[0]).toBe(`${formatGrams(r.ingredients.flour)} Flour`);
		expect(lines[lines.length - 1]).toBe(stepDescription(findStep(r, 'prep'), MESSAGES.en, r));
	});

	it('is just the method for a step with no weighed ingredients', () => {
		const r = computeSchedule(inputs());
		const ready = findStep(r, 'ready');
		expect(stepDetailText(ready, MESSAGES.en, r)).toBe(stepDescription(ready, MESSAGES.en, r));
	});

	it('appends the beginner explanation only when asked to', () => {
		const r = computeSchedule(inputs());
		const divide = findStep(r, 'divide');
		const plain = stepDetailText(divide, MESSAGES.en, r);
		const withDetail = stepDetailText(divide, MESSAGES.en, r, { includeDetail: true });
		expect(plain).not.toContain(MESSAGES.en.steps.divide_detail);
		expect(withDetail).toBe(`${plain}\n${MESSAGES.en.steps.divide_detail}`);
	});
});

describe('stepDetail — beginner explanations', () => {
	it('returns the per-kind explanation paragraph', () => {
		const r = computeSchedule(inputs());
		expect(stepDetail(findStep(r, 'mix'), MESSAGES.en)).toBe(MESSAGES.en.steps.mix_detail);
		expect(stepDetail(findStep(r, 'ready'), MESSAGES.en)).toBe(MESSAGES.en.steps.ready_detail);
	});

	it('uses one shared explanation for both pre-ferment types', () => {
		const r = computeSchedule(
			prefermentInputs('biga', {
				preFerments: [
					{ type: 'biga', flourPercent: 30 },
					{ type: 'poolish', flourPercent: 20 }
				]
			})
		);
		for (const step of r.steps.filter((s) => s.kind === 'preferment-mix')) {
			expect(stepDetail(step, MESSAGES.en)).toBe(MESSAGES.en.steps.preferment_mix_detail);
		}
	});
});
