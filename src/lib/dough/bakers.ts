import type { Ingredients, YeastType } from './types';

export interface BakerArgs {
	pizzaCount: number;
	ballWeight: number;
	hydration: number;
	saltPercent: number;
	yeastPercent: number;
	yeastType: 'fresh' | 'sourdough';
	starterHydration: number;
	preFermentFlourPercent: number;
	preFermentHydration: number;
}

export function computeIngredients(args: BakerArgs): Ingredients {
	const totalDough = args.pizzaCount * args.ballWeight;
	const isSourdough = args.yeastType === 'sourdough';
	// Sourdough's "starter" is the pre-ferment — adding a separate biga/poolish
	// on top would double-stack two cultures. computeSchedule already nulls the
	// preFerment for sourdough; this guard makes the bakers' module match.
	const hasPreFerment = !isSourdough && args.preFermentFlourPercent > 0;

	// Mass balance:
	//   total = sum of every separately-weighed ingredient
	// Fresh yeast is a new mass: total = F · (1 + h + s + y) / 100
	// Sourdough starter is just flour + water from the existing budget, so it does
	// not add to the total mass equation: total = F · (1 + h + s) / 100
	const pctSum = 100 + args.hydration + args.saltPercent + (isSourdough ? 0 : args.yeastPercent);
	const flourTotal = (totalDough * 100) / pctSum;
	const waterTotal = (flourTotal * args.hydration) / 100;
	const salt = (flourTotal * args.saltPercent) / 100;
	const yeastMass = (flourTotal * args.yeastPercent) / 100;

	let preFerment: Ingredients['preFerment'] = null;
	if (hasPreFerment) {
		const pfFlour = (flourTotal * args.preFermentFlourPercent) / 100;
		const pfWater = (pfFlour * args.preFermentHydration) / 100;
		// All of the recipe's yeast goes into the pre-ferment — that's how
		// biga/poolish technique actually works: the pre-dough is the yeast
		// carrier, no extra yeast is added on baking day.
		preFerment = { flour: pfFlour, water: pfWater, yeast: yeastMass };
	}

	if (isSourdough) {
		const starterFlour = yeastMass / (1 + args.starterHydration / 100);
		const starterWater = yeastMass - starterFlour;
		return {
			flour: flourTotal - starterFlour,
			water: waterTotal - starterWater,
			salt,
			yeast: yeastMass,
			totalDough,
			preFerment: null
		};
	}

	return {
		flour: flourTotal - (preFerment?.flour ?? 0),
		water: waterTotal - (preFerment?.water ?? 0),
		salt,
		yeast: hasPreFerment ? 0 : yeastMass,
		totalDough,
		preFerment
	};
}

export interface RoundBallWeightArgs {
	pizzaCount: number;
	ballWeight: number;
	hydration: number;
	saltPercent: number;
	yeastPercent: number;
	yeastType: YeastType;
}

// Picks a "nice" flour target near the current flour and returns the ball weight
// that produces it exactly. Prefers a multiple of 100 g when it's not much worse
// than the nearest multiple of 50 g; otherwise rounds to 50 g.
export function roundBallWeight(args: RoundBallWeightArgs): number {
	const isSourdough = args.yeastType === 'sourdough';
	const yeastPct = isSourdough ? 0 : args.yeastPercent;
	const pctSum = 100 + args.hydration + args.saltPercent + yeastPct;

	const currentTotal = args.pizzaCount * args.ballWeight;
	const currentFlour = (currentTotal * 100) / pctSum;

	const t50 = Math.max(50, Math.round(currentFlour / 50) * 50);
	const t100 = Math.max(100, Math.round(currentFlour / 100) * 100);
	const targetFlour =
		Math.abs(t100 - currentFlour) - Math.abs(t50 - currentFlour) <= 25 ? t100 : t50;

	const newTotal = (targetFlour * pctSum) / 100;
	return Math.round((newTotal / args.pizzaCount) * 10) / 10;
}
