import type { Ingredients, PreFermentSpec, YeastType } from './types';

// Traditional pre-dough consistencies: a biga is stiff, a poolish pours.
export function prefermentHydration(type: PreFermentSpec['type']): number {
	return type === 'biga' ? 50 : 100;
}

export interface BakerArgs {
	pizzaCount: number;
	ballWeight: number;
	hydration: number;
	saltPercent: number;
	// Extra baker's-percentage ingredients. Either may be 0; both expand
	// pctSum so the ball weight remains exact.
	oilPercent: number;
	sugarPercent: number;
	yeastPercent: number;
	yeastType: 'fresh' | 'sourdough';
	starterHydration: number;
	preFerments: PreFermentSpec[];
}

// Mass balance: total = sum of every separately-weighed ingredient.
// Fresh yeast adds its own mass: total = F · (1 + h + s + y + oil + sugar) / 100.
// Sourdough starter is flour + water from the existing budget, so its mass
// drops out: total = F · (1 + h + s + oil + sugar) / 100.
export function computePctSum(args: {
	hydration: number;
	saltPercent: number;
	oilPercent: number;
	sugarPercent: number;
	yeastPercent: number;
	yeastType: YeastType;
}): number {
	return (
		100 +
		args.hydration +
		args.saltPercent +
		args.oilPercent +
		args.sugarPercent +
		(args.yeastType === 'sourdough' ? 0 : args.yeastPercent)
	);
}

export function computeIngredients(args: BakerArgs): Ingredients {
	const totalDough = args.pizzaCount * args.ballWeight;
	const isSourdough = args.yeastType === 'sourdough';
	// Sourdough's "starter" is the pre-ferment — adding a separate biga/poolish
	// on top would double-stack two cultures. computeSchedule already empties
	// the preFerments for sourdough; this guard makes the bakers' module match.
	const hasPreFerment = !isSourdough && args.preFerments.length > 0;

	const pctSum = computePctSum(args);
	const flourTotal = (totalDough * 100) / pctSum;
	const waterTotal = (flourTotal * args.hydration) / 100;
	const salt = (flourTotal * args.saltPercent) / 100;
	const oil = (flourTotal * args.oilPercent) / 100;
	const sugar = (flourTotal * args.sugarPercent) / 100;
	const yeastMass = (flourTotal * args.yeastPercent) / 100;

	let preFerments: Ingredients['preFerments'] = [];
	if (hasPreFerment) {
		// All of the recipe's yeast goes into the pre-ferments — that's how
		// biga/poolish technique actually works: the pre-dough is the yeast
		// carrier, no extra yeast is added on baking day. With two pre-ferments
		// running in parallel the yeast splits proportional to each one's flour
		// share, so both cultures ripen at the same per-gram pace. Oil and sugar
		// stay in the main dough; they'd inhibit the pre-ferments' cultures.
		const totalShare = args.preFerments.reduce((sum, pf) => sum + pf.flourPercent, 0);
		preFerments = args.preFerments.map((pf) => {
			const pfFlour = (flourTotal * pf.flourPercent) / 100;
			return {
				type: pf.type,
				flour: pfFlour,
				water: (pfFlour * prefermentHydration(pf.type)) / 100,
				yeast: yeastMass * (pf.flourPercent / totalShare)
			};
		});
	}

	if (isSourdough) {
		const starterFlour = yeastMass / (1 + args.starterHydration / 100);
		const starterWater = yeastMass - starterFlour;
		return {
			flour: flourTotal - starterFlour,
			water: waterTotal - starterWater,
			salt,
			yeast: yeastMass,
			oil,
			sugar,
			totalDough,
			preFerments: []
		};
	}

	return {
		flour: flourTotal - preFerments.reduce((sum, pf) => sum + pf.flour, 0),
		water: waterTotal - preFerments.reduce((sum, pf) => sum + pf.water, 0),
		salt,
		yeast: hasPreFerment ? 0 : yeastMass,
		oil,
		sugar,
		totalDough,
		preFerments
	};
}

export interface RoundBallWeightArgs {
	pizzaCount: number;
	ballWeight: number;
	hydration: number;
	saltPercent: number;
	oilPercent: number;
	sugarPercent: number;
	yeastPercent: number;
	yeastType: YeastType;
}

// Picks a "nice" flour target near the current flour and returns the ball weight
// that produces it exactly. Always snaps to the nearest 100 g — the whole point
// of the button is a round bag-of-flour number — except for small batches
// (< 400 g flour) where a 100 g jump would shift the ball weight noticeably;
// those snap to 50 g instead.
const ROUND_FLOUR_COARSE_MIN_G = 400;

export function roundBallWeight(args: RoundBallWeightArgs): number {
	const pctSum = computePctSum(args);
	const currentTotal = args.pizzaCount * args.ballWeight;
	const currentFlour = (currentTotal * 100) / pctSum;

	const targetFlour =
		currentFlour >= ROUND_FLOUR_COARSE_MIN_G
			? Math.max(100, Math.round(currentFlour / 100) * 100)
			: Math.max(50, Math.round(currentFlour / 50) * 50);

	const newTotal = (targetFlour * pctSum) / 100;
	return Math.round((newTotal / args.pizzaCount) * 10) / 10;
}
