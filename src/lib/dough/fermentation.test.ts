import { describe, expect, it } from 'vitest';
import {
	equivalentHoursAtRef,
	fermentHoursForYeast,
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
