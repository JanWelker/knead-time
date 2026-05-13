import { describe, expect, it } from 'vitest';
import { computeIngredients, roundBallWeight } from './bakers';

const baseArgs = {
	pizzaCount: 4,
	ballWeight: 280,
	hydration: 70,
	saltPercent: 3,
	yeastPercent: 0.2,
	yeastType: 'fresh' as const,
	starterHydration: 100,
	preFermentFlourPercent: 0,
	preFermentHydration: 100
};

describe('computeIngredients — fresh yeast', () => {
	it('totals to pizzaCount × ballWeight', () => {
		const r = computeIngredients(baseArgs);
		expect(r.totalDough).toBe(1120);
		const sum = r.flour + r.water + r.salt + r.yeast;
		expect(sum).toBeCloseTo(1120, 6);
	});

	it("honors baker's percentages exactly", () => {
		const r = computeIngredients(baseArgs);
		expect(r.water / r.flour).toBeCloseTo(0.7, 6);
		expect(r.salt / r.flour).toBeCloseTo(0.03, 6);
		expect(r.yeast / r.flour).toBeCloseTo(0.002, 6);
	});

	it('scales linearly with pizza count', () => {
		const a = computeIngredients(baseArgs);
		const b = computeIngredients({ ...baseArgs, pizzaCount: 8 });
		expect(b.flour).toBeCloseTo(a.flour * 2, 6);
		expect(b.water).toBeCloseTo(a.water * 2, 6);
		expect(b.salt).toBeCloseTo(a.salt * 2, 6);
	});

	it('keeps salt fixed when hydration changes (% of flour)', () => {
		const a = computeIngredients(baseArgs);
		const b = computeIngredients({ ...baseArgs, hydration: 60 });
		expect(b.salt / b.flour).toBeCloseTo(0.03, 6);
		expect(a.salt / a.flour).toBeCloseTo(0.03, 6);
	});
});

describe('computeIngredients — sourdough', () => {
	it('subtracts starter flour & water from main amounts', () => {
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			starterHydration: 100
		});
		// Starter is flour + water; it doesn't add to the dough-mass equation.
		const pctSum = 100 + 70 + 3;
		const flourTotal = (1120 * 100) / pctSum;
		const starterMass = (flourTotal * 20) / 100;
		const starterFlour = starterMass / 2;
		const starterWater = starterMass / 2;
		expect(r.flour).toBeCloseTo(flourTotal - starterFlour, 6);
		const waterTotal = (flourTotal * 70) / 100;
		expect(r.water).toBeCloseTo(waterTotal - starterWater, 6);
		expect(r.yeast).toBeCloseTo(starterMass, 6);
	});

	it('keeps total dough mass invariant', () => {
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			starterHydration: 100
		});
		expect(r.flour + r.water + r.salt + r.yeast).toBeCloseTo(1120, 6);
	});

	it('keeps overall hydration of the final dough at the requested %', () => {
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			starterHydration: 100
		});
		// (main water + starter water) / (main flour + starter flour) = hydration
		const starter = r.yeast;
		const starterFlour = starter / 2;
		const starterWater = starter / 2;
		const flourAll = r.flour + starterFlour;
		const waterAll = r.water + starterWater;
		expect(waterAll / flourAll).toBeCloseTo(0.7, 6);
	});

	it('handles 60% starter hydration (stiff)', () => {
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			starterHydration: 60
		});
		const pctSum = 100 + 70 + 3;
		const flourTotal = (1120 * 100) / pctSum;
		const starterMass = (flourTotal * 20) / 100;
		const starterFlour = starterMass / 1.6;
		expect(r.flour).toBeCloseTo(flourTotal - starterFlour, 6);
		expect(r.flour + r.water + r.salt + r.yeast).toBeCloseTo(1120, 6);
	});

	it('handles 40% starter hydration (very stiff)', () => {
		const starterHydration = 40;
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			starterHydration
		});
		const starterMass = r.yeast;
		const starterFlour = starterMass / (1 + starterHydration / 100);
		const starterWater = starterMass - starterFlour;
		expect(starterFlour + starterWater).toBeCloseTo(starterMass, 6);
		// Mass-balance invariant: weighed ingredients = pizzaCount × ballWeight.
		expect(r.flour + r.water + r.salt + r.yeast).toBeCloseTo(1120, 6);
	});

	it('handles 150% starter hydration (very liquid)', () => {
		const starterHydration = 150;
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			starterHydration
		});
		const starterMass = r.yeast;
		const starterFlour = starterMass / (1 + starterHydration / 100);
		const starterWater = starterMass - starterFlour;
		expect(starterFlour + starterWater).toBeCloseTo(starterMass, 6);
		expect(r.flour + r.water + r.salt + r.yeast).toBeCloseTo(1120, 6);
	});
});

describe('computeIngredients — pre-ferment', () => {
	it('pulls flour & water from main amounts into the pre-ferment block', () => {
		const r = computeIngredients({
			...baseArgs,
			preFermentFlourPercent: 30,
			preFermentHydration: 100
		});
		expect(r.preFerment).not.toBeNull();
		const pctSum = 100 + 70 + 3 + 0.2;
		const flourTotal = (1120 * 100) / pctSum;
		const pfFlour = (flourTotal * 30) / 100;
		expect(r.preFerment!.flour).toBeCloseTo(pfFlour, 6);
		expect(r.preFerment!.water).toBeCloseTo(pfFlour, 6);
		// main flour reduced by pf flour
		expect(r.flour).toBeCloseTo(flourTotal - pfFlour, 6);
	});

	it('puts all yeast in the pre-ferment and zeroes the main-dough yeast', () => {
		const r = computeIngredients({
			...baseArgs,
			preFermentFlourPercent: 30,
			preFermentHydration: 100
		});
		const yeastMass = (1120 * 0.2) / (100 + 70 + 3 + 0.2);
		expect(r.preFerment!.yeast).toBeCloseTo(yeastMass, 6);
		expect(r.yeast).toBe(0);
	});

	it('keeps the mass-balance invariant with a pre-ferment', () => {
		const r = computeIngredients({
			...baseArgs,
			preFermentFlourPercent: 30,
			preFermentHydration: 50
		});
		const pf = r.preFerment!;
		expect(r.flour + r.water + r.salt + r.yeast + pf.flour + pf.water + pf.yeast).toBeCloseTo(
			1120,
			6
		);
	});

	it('ignores the pre-ferment when yeast type is sourdough — the starter is the pre-ferment', () => {
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			preFermentFlourPercent: 30,
			preFermentHydration: 100
		});
		expect(r.preFerment).toBeNull();
	});
});

describe('roundBallWeight', () => {
	const args = {
		pizzaCount: 6,
		ballWeight: 280,
		hydration: 70,
		saltPercent: 3,
		yeastPercent: 0.085,
		yeastType: 'fresh' as const
	};

	function flourFor(pizzaCount: number, ballWeight: number, args_ = args): number {
		const pctSum = 100 + args_.hydration + args_.saltPercent + args_.yeastPercent;
		return (pizzaCount * ballWeight * 100) / pctSum;
	}

	// Distance from `value` to the nearest multiple of `step` (handles modulo wrap).
	function distToMultiple(value: number, step: number): number {
		const m = ((value % step) + step) % step;
		return Math.min(m, step - m);
	}

	it('lifts a near-100 flour target onto a 100 multiple', () => {
		// 6 × 280 → ~970 g flour. Should snap to 1000 g (within ball-weight quantization).
		const newBw = roundBallWeight(args);
		const newFlour = flourFor(args.pizzaCount, newBw);
		expect(distToMultiple(newFlour, 100)).toBeLessThan(0.5);
		expect(Math.round(newFlour / 100) * 100).toBe(1000);
	});

	it('keeps water on a 10 g grid at integer hydrations after rounding', () => {
		const newBw = roundBallWeight(args);
		const newFlour = flourFor(args.pizzaCount, newBw);
		const newWater = (newFlour * args.hydration) / 100;
		expect(distToMultiple(newWater, 10)).toBeLessThan(0.5);
	});

	it('is idempotent', () => {
		const first = roundBallWeight(args);
		const second = roundBallWeight({ ...args, ballWeight: first });
		expect(second).toBeCloseTo(first, 6);
	});

	it('returns a ball weight with at most 0.1 g precision', () => {
		const newBw = roundBallWeight(args);
		expect(newBw * 10).toBeCloseTo(Math.round(newBw * 10), 6);
	});

	it('prefers the closer 50-multiple when 100 would drift too far', () => {
		// 4 × 329 → ~770 g flour. Closest 50-multiple is 750 (delta ~20),
		// closest 100-multiple is 800 (delta ~30). 100-rule loses → snaps to 750.
		const a = { ...args, pizzaCount: 4, ballWeight: 329 };
		const flourBefore = flourFor(4, 329, a);
		expect(flourBefore).toBeGreaterThan(750);
		expect(flourBefore).toBeLessThan(800);
		const newBw = roundBallWeight(a);
		const newFlour = flourFor(4, newBw, a);
		expect(distToMultiple(newFlour, 50)).toBeLessThan(0.5);
		expect(Math.round(newFlour / 50) * 50).toBe(750);
	});

	it('works for sourdough (yeast % is not part of pctSum)', () => {
		const sd = {
			...args,
			yeastType: 'sourdough' as const,
			yeastPercent: 20
		};
		const newBw = roundBallWeight(sd);
		const pctSum = 100 + sd.hydration + sd.saltPercent;
		const newFlour = (sd.pizzaCount * newBw * 100) / pctSum;
		expect(distToMultiple(newFlour, 50)).toBeLessThan(0.5);
	});
});
