import { describe, expect, it } from 'vitest';
import { computeIngredients, ingredientTotals, roundBallWeight } from './bakers';

const baseArgs = {
	pizzaCount: 4,
	ballWeight: 280,
	hydration: 70,
	saltPercent: 3,
	oilPercent: 0,
	sugarPercent: 0,
	yeastPercent: 0.2,
	yeastType: 'fresh' as const,
	starterHydration: 100,
	preFerments: []
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

describe('computeIngredients — dry yeast', () => {
	it('keeps the mass balance with instant dry yeast (yeast adds mass like fresh)', () => {
		const r = computeIngredients({ ...baseArgs, yeastType: 'instant', yeastPercent: 0.07 });
		expect(r.flour + r.water + r.salt + r.yeast).toBeCloseTo(1120, 6);
		expect(r.yeast / r.flour).toBeCloseTo(0.0007, 6);
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
			preFerments: [{ type: 'poolish', flourPercent: 30 }]
		});
		expect(r.preFerments).toHaveLength(1);
		const pctSum = 100 + 70 + 3 + 0.2;
		const flourTotal = (1120 * 100) / pctSum;
		const pfFlour = (flourTotal * 30) / 100;
		// Poolish is 100% hydration — water equals flour.
		expect(r.preFerments[0].flour).toBeCloseTo(pfFlour, 6);
		expect(r.preFerments[0].water).toBeCloseTo(pfFlour, 6);
		// main flour reduced by pf flour
		expect(r.flour).toBeCloseTo(flourTotal - pfFlour, 6);
	});

	it('mixes a biga at 50% hydration', () => {
		const r = computeIngredients({
			...baseArgs,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		expect(r.preFerments[0].water).toBeCloseTo(r.preFerments[0].flour / 2, 6);
	});

	it('puts all yeast in the pre-ferment and zeroes the main-dough yeast', () => {
		const r = computeIngredients({
			...baseArgs,
			preFerments: [{ type: 'poolish', flourPercent: 30 }]
		});
		const yeastMass = (1120 * 0.2) / (100 + 70 + 3 + 0.2);
		expect(r.preFerments[0].yeast).toBeCloseTo(yeastMass, 6);
		expect(r.yeast).toBe(0);
	});

	it('keeps the mass-balance invariant with a pre-ferment', () => {
		const r = computeIngredients({
			...baseArgs,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const pf = r.preFerments[0];
		expect(r.flour + r.water + r.salt + r.yeast + pf.flour + pf.water + pf.yeast).toBeCloseTo(
			1120,
			6
		);
	});

	it('ignores the pre-ferments when yeast type is sourdough — the starter is the pre-ferment', () => {
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			preFerments: [{ type: 'poolish', flourPercent: 30 }]
		});
		expect(r.preFerments).toHaveLength(0);
	});
});

describe('computeIngredients — combined biga + poolish', () => {
	const combined = {
		...baseArgs,
		preFerments: [
			{ type: 'biga' as const, flourPercent: 30 },
			{ type: 'poolish' as const, flourPercent: 20 }
		]
	};

	it('builds one pre-dough per pre-ferment at its own hydration', () => {
		const r = computeIngredients(combined);
		expect(r.preFerments.map((pf) => pf.type)).toEqual(['biga', 'poolish']);
		const pctSum = 100 + 70 + 3 + 0.2;
		const flourTotal = (1120 * 100) / pctSum;
		const [biga, poolish] = r.preFerments;
		expect(biga.flour).toBeCloseTo((flourTotal * 30) / 100, 6);
		expect(biga.water).toBeCloseTo(biga.flour / 2, 6);
		expect(poolish.flour).toBeCloseTo((flourTotal * 20) / 100, 6);
		expect(poolish.water).toBeCloseTo(poolish.flour, 6);
	});

	it('splits the yeast proportional to flour share and zeroes the main dough', () => {
		const r = computeIngredients(combined);
		const yeastMass = (1120 * 0.2) / (100 + 70 + 3 + 0.2);
		const [biga, poolish] = r.preFerments;
		expect(biga.yeast).toBeCloseTo(yeastMass * (30 / 50), 6);
		expect(poolish.yeast).toBeCloseTo(yeastMass * (20 / 50), 6);
		expect(biga.yeast + poolish.yeast).toBeCloseTo(yeastMass, 6);
		expect(r.yeast).toBe(0);
	});

	it('keeps the mass-balance invariant across both pre-doughs', () => {
		const r = computeIngredients(combined);
		const pfMass = r.preFerments.reduce((sum, pf) => sum + pf.flour + pf.water + pf.yeast, 0);
		expect(r.flour + r.water + r.salt + r.yeast + pfMass).toBeCloseTo(1120, 6);
	});

	it('keeps overall hydration at the requested % across all doughs', () => {
		const r = computeIngredients(combined);
		const flourAll = r.flour + r.preFerments.reduce((sum, pf) => sum + pf.flour, 0);
		const waterAll = r.water + r.preFerments.reduce((sum, pf) => sum + pf.water, 0);
		expect(waterAll / flourAll).toBeCloseTo(0.7, 6);
	});
});

describe('roundBallWeight', () => {
	const args = {
		pizzaCount: 6,
		ballWeight: 280,
		hydration: 70,
		saltPercent: 3,
		oilPercent: 0,
		sugarPercent: 0,
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

	it('snaps to the nearest 100 even when a 50-multiple is closer (aggressive rounding)', () => {
		// 4 × 329 → ~760 g flour. 750 is closer, but round numbers means a
		// round bag-of-flour number — 800 wins for any batch ≥ 400 g flour.
		const a = { ...args, pizzaCount: 4, ballWeight: 329 };
		const newBw = roundBallWeight(a);
		const newFlour = flourFor(4, newBw, a);
		expect(distToMultiple(newFlour, 100)).toBeLessThan(0.5);
		expect(Math.round(newFlour / 100) * 100).toBe(800);
	});

	it('snaps small batches (< 400 g flour) to 50 g so the ball weight stays close', () => {
		// 1 × 280 → ~162 g flour → 150, not 200.
		const a = { ...args, pizzaCount: 1, ballWeight: 280 };
		const newBw = roundBallWeight(a);
		const newFlour = flourFor(1, newBw, a);
		expect(distToMultiple(newFlour, 50)).toBeLessThan(0.5);
		expect(Math.round(newFlour / 50) * 50).toBe(150);
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

	it('includes oil & sugar in pctSum so the ball weight stays exact', () => {
		const withExtras = { ...args, oilPercent: 5, sugarPercent: 2 };
		const newBw = roundBallWeight(withExtras);
		const pctSum =
			100 +
			withExtras.hydration +
			withExtras.saltPercent +
			withExtras.oilPercent +
			withExtras.sugarPercent +
			withExtras.yeastPercent;
		const newFlour = (withExtras.pizzaCount * newBw * 100) / pctSum;
		// Flour should still snap to a 50 g multiple.
		expect(distToMultiple(newFlour, 50)).toBeLessThan(0.5);
	});
});

describe('ingredientTotals', () => {
	it('is the identity view of a flat recipe (no pre-ferments)', () => {
		const r = computeIngredients(baseArgs);
		const t = ingredientTotals(r);
		expect(t).toEqual({
			flour: r.flour,
			water: r.water,
			salt: r.salt,
			yeast: r.yeast,
			oil: r.oil,
			sugar: r.sugar,
			total: r.totalDough
		});
	});

	it('folds a single pre-dough back into whole-recipe totals', () => {
		const r = computeIngredients({
			...baseArgs,
			preFerments: [{ type: 'biga', flourPercent: 30 }]
		});
		const t = ingredientTotals(r);
		const pf = r.preFerments[0];
		expect(t.flour).toBeCloseTo(r.flour + pf.flour, 6);
		expect(t.water).toBeCloseTo(r.water + pf.water, 6);
		expect(t.yeast).toBeCloseTo(r.yeast + pf.yeast, 6);
		expect(t.salt).toBe(r.salt);
		expect(t.total).toBe(r.totalDough);
	});

	it('sums both parallel pre-doughs (biga + poolish)', () => {
		const r = computeIngredients({
			...baseArgs,
			preFerments: [
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			]
		});
		const t = ingredientTotals(r);
		const [biga, poolish] = r.preFerments;
		expect(t.flour).toBeCloseTo(r.flour + biga.flour + poolish.flour, 6);
		expect(t.water).toBeCloseTo(r.water + biga.water + poolish.water, 6);
		expect(t.yeast).toBeCloseTo(biga.yeast + poolish.yeast, 6);
	});

	it('rows sum to the total for an enriched recipe with pre-ferments', () => {
		const r = computeIngredients({
			...baseArgs,
			oilPercent: 5,
			sugarPercent: 2,
			preFerments: [
				{ type: 'biga', flourPercent: 30 },
				{ type: 'poolish', flourPercent: 20 }
			]
		});
		const t = ingredientTotals(r);
		expect(t.flour + t.water + t.salt + t.yeast + t.oil + t.sugar).toBeCloseTo(t.total, 6);
	});

	it('carries oil & sugar through unchanged', () => {
		const r = computeIngredients({ ...baseArgs, oilPercent: 4, sugarPercent: 1.5 });
		const t = ingredientTotals(r);
		expect(t.oil).toBe(r.oil);
		expect(t.sugar).toBe(r.sugar);
	});
});

describe('computeIngredients — oil & sugar', () => {
	it('expands pctSum so total dough still equals pizzaCount × ballWeight', () => {
		const r = computeIngredients({ ...baseArgs, oilPercent: 5, sugarPercent: 2 });
		expect(r.flour + r.water + r.salt + r.yeast + r.oil + r.sugar).toBeCloseTo(1120, 6);
	});

	it("honors oil & sugar baker's percentages exactly", () => {
		const r = computeIngredients({ ...baseArgs, oilPercent: 5, sugarPercent: 2 });
		expect(r.oil / r.flour).toBeCloseTo(0.05, 6);
		expect(r.sugar / r.flour).toBeCloseTo(0.02, 6);
	});

	it('returns 0 g oil & sugar when their percentages are 0', () => {
		const r = computeIngredients(baseArgs);
		expect(r.oil).toBe(0);
		expect(r.sugar).toBe(0);
	});

	it('keeps the mass-balance invariant with sourdough + oil + sugar', () => {
		const r = computeIngredients({
			...baseArgs,
			yeastType: 'sourdough',
			yeastPercent: 20,
			oilPercent: 3,
			sugarPercent: 1
		});
		expect(r.flour + r.water + r.salt + r.yeast + r.oil + r.sugar).toBeCloseTo(1120, 6);
	});

	it('keeps oil & sugar in the main dough when a pre-ferment is set', () => {
		const r = computeIngredients({
			...baseArgs,
			preFerments: [{ type: 'poolish', flourPercent: 30 }],
			oilPercent: 4,
			sugarPercent: 1.5
		});
		expect(r.preFerments).toHaveLength(1);
		// Oil & sugar are weighed for the main dough only.
		const pctSum = 100 + 70 + 3 + 4 + 1.5 + 0.2;
		const flourTotal = (1120 * 100) / pctSum;
		expect(r.oil).toBeCloseTo((flourTotal * 4) / 100, 6);
		expect(r.sugar).toBeCloseTo((flourTotal * 1.5) / 100, 6);
		const pf = r.preFerments[0];
		expect(
			r.flour + r.water + r.salt + r.yeast + r.oil + r.sugar + pf.flour + pf.water + pf.yeast
		).toBeCloseTo(1120, 6);
	});
});
