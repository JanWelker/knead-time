import { describe, expect, it } from 'vitest';
import {
	equivalentHoursAtRef,
	fermentHoursForYeast,
	idealMixWaterTempC,
	PREFERMENT_MAX_HOURS,
	PREFERMENT_MIN_HOURS,
	PREFERMENT_REF_HOURS_BIGA,
	PREFERMENT_REF_HOURS_POOLISH,
	prefermentDurationHours,
	prefermentEquivHours,
	temperatureFactor,
	yeastPercentForPhases
} from './fermentation';

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

describe('equivalentHoursAtRef', () => {
	it('sums weighted phases', () => {
		const eq = equivalentHoursAtRef([
			{ hours: 1, tempC: 22 },
			{ hours: 24, tempC: 4 }
		]);
		expect(eq).toBeCloseTo(1 + 24 * temperatureFactor(4), 6);
	});
});

describe('yeastPercentForPhases — fresh yeast', () => {
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
	it('clamps below the floor for very cold kitchens', () => {
		expect(prefermentDurationHours('biga', 4)).toBe(PREFERMENT_MAX_HOURS);
	});
	it('clamps above the ceiling for very warm kitchens', () => {
		expect(prefermentDurationHours('poolish', 40)).toBe(PREFERMENT_MIN_HOURS);
	});
});

describe('prefermentEquivHours', () => {
	it('delivers the reference fermentation load inside the clamp band', () => {
		// Inside the wall-clock clamp, wall × f(T) = refHours regardless of temp.
		for (const tempC of [16, 20, 22, 26]) {
			expect(prefermentEquivHours('biga', tempC)).toBeCloseTo(PREFERMENT_REF_HOURS_BIGA, 6);
			expect(prefermentEquivHours('poolish', tempC)).toBeCloseTo(PREFERMENT_REF_HOURS_POOLISH, 6);
		}
	});
	it('overshoots the reference load when the wall-clock is clamped up to the floor in a warm kitchen', () => {
		// At very warm temps the math wants a wall-clock below MIN, but we keep
		// it at MIN — the pre-ferment ends up more fermented than the reference.
		expect(prefermentEquivHours('poolish', 35)).toBeGreaterThan(PREFERMENT_REF_HOURS_POOLISH);
	});
	it('falls short of the reference load when the wall-clock is clamped down to the ceiling in a cold kitchen', () => {
		// At very cold temps the math wants a wall-clock above MAX, but we cap it
		// at MAX to avoid overproofing — the pre-ferment delivers less than the
		// reference load.
		expect(prefermentEquivHours('biga', 4)).toBeLessThan(PREFERMENT_REF_HOURS_BIGA);
	});
});

describe('idealMixWaterTempC', () => {
	it('clamps to the ice-water floor for a typical 22 °C kitchen — spiral friction is high', () => {
		// 3·23 − 2·22 − 24 = 1 → clamped to 4 °C
		expect(idealMixWaterTempC(22)).toBe(4);
	});
	it('drops to fridge-cold water for a cool kitchen', () => {
		// 3·23 − 2·18 − 24 = 9 °C
		expect(idealMixWaterTempC(18)).toBe(9);
	});
	it('rises to room-temp water for a chilly kitchen', () => {
		// 3·23 − 2·12 − 24 = 21 °C
		expect(idealMixWaterTempC(12)).toBe(21);
	});
	it('stays clamped at the floor in a hot kitchen', () => {
		// 3·23 − 2·28 − 24 = −11 → clamped to 4 °C (use ice cubes)
		expect(idealMixWaterTempC(28)).toBe(4);
	});
	it('clamps to the warm-water ceiling in a frigid kitchen', () => {
		// 3·23 − 2·4 − 24 = 37 → clamped to 35
		expect(idealMixWaterTempC(4)).toBe(35);
	});
	it('decreases monotonically as the kitchen warms', () => {
		expect(idealMixWaterTempC(12)).toBeGreaterThan(idealMixWaterTempC(18));
		expect(idealMixWaterTempC(18)).toBeGreaterThan(idealMixWaterTempC(22));
	});
	it('matches the calibration observation (10 min on spiral, 4 °C water, 22 °C kitchen → 24 °C dough)', () => {
		// Sanity check that our recommendation does not exceed the safe cap when
		// applied to the data point the friction factor was tuned against.
		expect(idealMixWaterTempC(22)).toBeLessThanOrEqual(4);
	});
});

describe('fermentHoursForYeast', () => {
	it('round-trips with yeastPercentForPhases at constant temperature (fresh)', () => {
		const hours = 12;
		const tempC = 24;
		const y = yeastPercentForPhases('fresh', [{ hours, tempC }]);
		expect(fermentHoursForYeast('fresh', y, tempC)).toBeCloseTo(hours, 6);
	});
	it('round-trips with yeastPercentForPhases at constant temperature (sourdough)', () => {
		const hours = 10;
		const tempC = 24;
		const y = yeastPercentForPhases('sourdough', [{ hours, tempC }]);
		expect(fermentHoursForYeast('sourdough', y, tempC)).toBeCloseTo(hours, 6);
	});
});
