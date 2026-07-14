import { describe, expect, it } from 'vitest';
import {
	freshEquivalentPercent,
	idealMixWaterTempC,
	PREFERMENT_MAX_HOURS,
	PREFERMENT_MIN_HOURS,
	PREFERMENT_REF_HOURS_BIGA,
	PREFERMENT_REF_HOURS_POOLISH,
	prefermentDurationHours,
	TARGET_UNITS_FRESH,
	TARGET_UNITS_SOURDOUGH,
	temperatureFactor,
	yeastMassFactor,
	yeastPercentForPhases
} from './fermentation';

describe('yeastMassFactor', () => {
	it.each([
		{ type: 'fresh', factor: 1 },
		{ type: 'instant', factor: 1 / 3 },
		{ type: 'active-dry', factor: 0.4 }
	] as const)('$type → $factor of the fresh mass', ({ type, factor }) => {
		expect(yeastMassFactor(type)).toBeCloseTo(factor, 12);
	});

	it('expresses the sourdough target as the same factor (starter ≈ 100× fresh)', () => {
		expect(yeastMassFactor('sourdough')).toBeCloseTo(
			TARGET_UNITS_SOURDOUGH / TARGET_UNITS_FRESH,
			12
		);
	});

	it('keeps yeastPercentForPhases consistent across carriers', () => {
		const phases = [{ hours: 8, tempC: 22 }];
		const fresh = yeastPercentForPhases('fresh', phases);
		expect(yeastPercentForPhases('instant', phases)).toBeCloseTo(fresh / 3, 12);
		expect(yeastPercentForPhases('sourdough', phases)).toBeCloseTo(fresh * 100, 12);
	});
});

describe('temperatureFactor', () => {
	it('is 1 at reference (22 °C)', () => {
		expect(temperatureFactor(22)).toBeCloseTo(1, 6);
	});
	it('doubles every 10 °C (Q10 = 2)', () => {
		expect(temperatureFactor(32) / temperatureFactor(22)).toBeCloseTo(2, 6);
		expect(temperatureFactor(12) / temperatureFactor(22)).toBeCloseTo(0.5, 6);
	});
	it('is monotonic in temperature', () => {
		expect(temperatureFactor(4)).toBeLessThan(temperatureFactor(22));
		expect(temperatureFactor(28)).toBeGreaterThan(temperatureFactor(22));
	});
});

describe('yeastPercentForPhases — fresh yeast', () => {
	it('weights every phase by its temperature factor', () => {
		const eq = 1 + 24 * temperatureFactor(4);
		const y = yeastPercentForPhases('fresh', [
			{ hours: 1, tempC: 22 },
			{ hours: 24, tempC: 4 }
		]);
		expect(y).toBeCloseTo(TARGET_UNITS_FRESH / eq, 6);
	});

	it('matches the 0.2% / 8h / 22°C reference', () => {
		const y = yeastPercentForPhases('fresh', [{ hours: 8, tempC: 22 }]);
		expect(y).toBeCloseTo(0.2, 6);
	});

	it('produces less yeast for longer ferments', () => {
		const short = yeastPercentForPhases('fresh', [{ hours: 6, tempC: 22 }]);
		const long = yeastPercentForPhases('fresh', [{ hours: 24, tempC: 22 }]);
		expect(long).toBeLessThan(short);
	});

	it('produces less yeast at warmer temperatures', () => {
		const warm = yeastPercentForPhases('fresh', [{ hours: 8, tempC: 28 }]);
		const cool = yeastPercentForPhases('fresh', [{ hours: 8, tempC: 18 }]);
		expect(warm).toBeLessThan(cool);
	});

	it('cold + warm phases combine sensibly', () => {
		const yPct = yeastPercentForPhases('fresh', [
			{ hours: 1, tempC: 22 },
			{ hours: 24, tempC: 4 },
			{ hours: 4, tempC: 22 }
		]);
		expect(yPct).toBeGreaterThan(0);
		expect(yPct).toBeLessThan(0.2);
	});
});

describe('yeastPercentForPhases — sourdough', () => {
	it('matches the 20% / 8h / 22°C reference', () => {
		const y = yeastPercentForPhases('sourdough', [{ hours: 8, tempC: 22 }]);
		expect(y).toBeCloseTo(20, 6);
	});
});

describe('yeastPercentForPhases — degenerate input', () => {
	it('returns 0 for an empty phase set', () => {
		expect(yeastPercentForPhases('fresh', [])).toBe(0);
		expect(yeastPercentForPhases('sourdough', [])).toBe(0);
	});
	it('returns 0 when every phase has zero hours', () => {
		expect(yeastPercentForPhases('fresh', [{ hours: 0, tempC: 22 }])).toBe(0);
	});
});

describe('prefermentDurationHours', () => {
	it('equals the type reference hours at 22 °C', () => {
		expect(prefermentDurationHours('biga', 22)).toBeCloseTo(PREFERMENT_REF_HOURS_BIGA, 6);
		expect(prefermentDurationHours('poolish', 22)).toBeCloseTo(PREFERMENT_REF_HOURS_POOLISH, 6);
	});
	it('lengthens at cooler temperatures (Q10 inverse scaling)', () => {
		expect(prefermentDurationHours('biga', 18)).toBeGreaterThan(PREFERMENT_REF_HOURS_BIGA);
		expect(prefermentDurationHours('poolish', 18)).toBeGreaterThan(PREFERMENT_REF_HOURS_POOLISH);
	});
	it('shortens at warmer temperatures', () => {
		expect(prefermentDurationHours('biga', 26)).toBeLessThan(PREFERMENT_REF_HOURS_BIGA);
		expect(prefermentDurationHours('poolish', 26)).toBeLessThan(PREFERMENT_REF_HOURS_POOLISH);
	});
	it('clamps at the 24 h ceiling for very cold kitchens', () => {
		expect(prefermentDurationHours('biga', 4)).toBe(PREFERMENT_MAX_HOURS);
	});
	it('clamps at the 8 h floor for very warm kitchens', () => {
		expect(prefermentDurationHours('poolish', 40)).toBe(PREFERMENT_MIN_HOURS);
	});
});

describe('idealMixWaterTempC', () => {
	it('clamps to the ice-water floor for a typical 22 °C kitchen — spiral friction is high', () => {
		// 3·23 − 2·22 − 24 = 1 → clamped to 4 °C
		expect(idealMixWaterTempC(22, 'spiral')).toBe(4);
	});
	it('drops to fridge-cold water for a cool kitchen', () => {
		// 3·23 − 2·18 − 24 = 9 °C
		expect(idealMixWaterTempC(18, 'spiral')).toBe(9);
	});
	it('rises to room-temp water for a chilly kitchen', () => {
		// 3·23 − 2·12 − 24 = 21 °C
		expect(idealMixWaterTempC(12, 'spiral')).toBe(21);
	});
	it('stays clamped at the floor in a hot kitchen', () => {
		// 3·23 − 2·28 − 24 = −11 → clamped to 4 °C (use ice cubes)
		expect(idealMixWaterTempC(28, 'spiral')).toBe(4);
	});
	it('clamps to the warm-water ceiling in a frigid kitchen', () => {
		// 3·23 − 2·4 − 24 = 37 → clamped to 35
		expect(idealMixWaterTempC(4, 'spiral')).toBe(35);
	});
	it('decreases monotonically as the kitchen warms', () => {
		expect(idealMixWaterTempC(12, 'spiral')).toBeGreaterThan(idealMixWaterTempC(18, 'spiral'));
		expect(idealMixWaterTempC(18, 'spiral')).toBeGreaterThan(idealMixWaterTempC(22, 'spiral'));
	});
	it('recommends warmer water for hand kneading — friction is ~5 °C, not 24 °C', () => {
		// 3·23 − 2·22 − 5 = 20 °C
		expect(idealMixWaterTempC(22, 'hand')).toBe(20);
	});
	it('still clamps hand-kneaded water to the warm ceiling in a frigid kitchen', () => {
		// 3·23 − 2·4 − 5 = 56 → clamped to 35
		expect(idealMixWaterTempC(4, 'hand')).toBe(35);
	});
});

describe('freshEquivalentPercent', () => {
	it('round-trips yeastPercentForPhases back to the fresh solve for every carrier', () => {
		const phases = [{ hours: 8, tempC: 22 }];
		const fresh = yeastPercentForPhases('fresh', phases);
		for (const type of ['fresh', 'instant', 'active-dry', 'sourdough'] as const) {
			expect(freshEquivalentPercent(yeastPercentForPhases(type, phases), type)).toBeCloseTo(
				fresh,
				12
			);
		}
	});
});
