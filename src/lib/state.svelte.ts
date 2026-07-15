import { SvelteDate } from 'svelte/reactivity';
import { roundBallWeight } from './dough/bakers';
import { RECIPE_DEFAULTS, toDefaultReadyBy } from './dough/defaults';
import { clampInput, clampPreFermentShares, clampShareInput } from './dough/inputBounds';
import { computeSchedule } from './dough/schedule';
import type {
	BallProof,
	ComputedSchedule,
	DoughInputs,
	MixingMethod,
	PreFermentSpec,
	YeastType
} from './dough/types';
import type { SerializableInputs } from './dough/urlState';

export class FormState {
	readyBy: Date = $state(toDefaultReadyBy(new SvelteDate()));
	pizzaCount: number = $state(RECIPE_DEFAULTS.pizzaCount);
	ballWeight: number = $state(RECIPE_DEFAULTS.ballWeight);
	hydration: number = $state(RECIPE_DEFAULTS.hydration);
	saltPercent: number = $state(RECIPE_DEFAULTS.saltPercent);
	oilPercent: number = $state(RECIPE_DEFAULTS.oilPercent);
	sugarPercent: number = $state(RECIPE_DEFAULTS.sugarPercent);
	yeastType: YeastType = $state(RECIPE_DEFAULTS.yeastType);
	starterHydration: number = $state(RECIPE_DEFAULTS.starterHydration);
	roomTempC: number = $state(RECIPE_DEFAULTS.roomTempC);
	fridgeTempC: number = $state(RECIPE_DEFAULTS.fridgeTempC);
	mixingMethod: MixingMethod = $state(RECIPE_DEFAULTS.mixingMethod);
	ballProof: BallProof = $state(RECIPE_DEFAULTS.ballProof);
	preFermentTempEnabled: boolean = $state(false);
	preFermentTempValue: number = $state(18);
	bigaEnabled: boolean = $state(false);
	poolishEnabled: boolean = $state(false);
	startAt: Date = $state(new SvelteDate());

	// The share being typed clamps live against the other enabled share so
	// the sum can never pass the cap (issue #193); sub-minimum values survive
	// mid-typing and the derived inputs raise them to the band minimum.
	#bigaFlourPercent = $state(30);
	#poolishFlourPercent = $state(20);

	get bigaFlourPercent(): number {
		return this.#bigaFlourPercent;
	}

	set bigaFlourPercent(value: number) {
		this.#bigaFlourPercent = clampShareInput(
			value,
			this.poolishEnabled ? this.#poolishFlourPercent : 0,
			this.#bigaFlourPercent
		);
	}

	get poolishFlourPercent(): number {
		return this.#poolishFlourPercent;
	}

	set poolishFlourPercent(value: number) {
		this.#poolishFlourPercent = clampShareInput(
			value,
			this.bigaEnabled ? this.#bigaFlourPercent : 0,
			this.#poolishFlourPercent
		);
	}

	// The raw fields mirror the input boxes; the recipe always sees
	// band-clamped values so a typed outlier or an emptied field can never
	// reach the math (issues #193/#194).
	readonly inputs: DoughInputs = $derived({
		readyBy: this.readyBy,
		startAt: this.startAt,
		pizzaCount: clampInput('pizzaCount', this.pizzaCount),
		ballWeight: clampInput('ballWeight', this.ballWeight),
		hydration: clampInput('hydration', this.hydration),
		saltPercent: clampInput('saltPercent', this.saltPercent),
		oilPercent: clampInput('oilPercent', this.oilPercent),
		sugarPercent: clampInput('sugarPercent', this.sugarPercent),
		yeastType: this.yeastType,
		starterHydration: clampInput('starterHydration', this.starterHydration),
		roomTempC: clampInput('roomTempC', this.roomTempC),
		fridgeTempC: clampInput('fridgeTempC', this.fridgeTempC),
		mixingMethod: this.mixingMethod,
		ballProof: this.ballProof,
		preFermentTempC: this.preFermentTempEnabled
			? clampInput('preFermentTempC', this.preFermentTempValue)
			: null,
		// Canonical biga-first order — the encoder and decoder preserve it.
		preFerments: clampPreFermentShares([
			...(this.bigaEnabled
				? [{ type: 'biga', flourPercent: this.#bigaFlourPercent } satisfies PreFermentSpec]
				: []),
			...(this.poolishEnabled
				? [{ type: 'poolish', flourPercent: this.#poolishFlourPercent } satisfies PreFermentSpec]
				: [])
		])
	});

	readonly schedule: ComputedSchedule = $derived(computeSchedule(this.inputs));

	serializable(): SerializableInputs {
		return this.inputs;
	}

	roundBallWeight() {
		// Read the clamped inputs, not the raw fields — a typed outlier (e.g. 0
		// pizzas) must not push NaN through the flour division.
		const inputs = this.inputs;
		this.ballWeight = roundBallWeight({
			pizzaCount: inputs.pizzaCount,
			ballWeight: inputs.ballWeight,
			hydration: inputs.hydration,
			saltPercent: inputs.saltPercent,
			oilPercent: inputs.oilPercent,
			sugarPercent: inputs.sugarPercent,
			yeastPercent: this.schedule.yeastPercent,
			yeastType: inputs.yeastType
		});
	}

	apply(partial: Partial<SerializableInputs>) {
		if (partial.readyBy instanceof Date) this.readyBy = partial.readyBy;
		if (partial.startAt instanceof Date) this.startAt = partial.startAt;
		if (partial.pizzaCount !== undefined) this.pizzaCount = partial.pizzaCount;
		if (partial.ballWeight !== undefined) this.ballWeight = partial.ballWeight;
		if (partial.hydration !== undefined) this.hydration = partial.hydration;
		if (partial.saltPercent !== undefined) this.saltPercent = partial.saltPercent;
		if (partial.oilPercent !== undefined) this.oilPercent = partial.oilPercent;
		if (partial.sugarPercent !== undefined) this.sugarPercent = partial.sugarPercent;
		if (partial.yeastType !== undefined) this.yeastType = partial.yeastType;
		if (partial.starterHydration !== undefined) this.starterHydration = partial.starterHydration;
		if (partial.roomTempC !== undefined) this.roomTempC = partial.roomTempC;
		if (partial.fridgeTempC !== undefined) this.fridgeTempC = partial.fridgeTempC;
		if (partial.mixingMethod !== undefined) this.mixingMethod = partial.mixingMethod;
		if (partial.ballProof !== undefined) this.ballProof = partial.ballProof;
		if (partial.preFermentTempC !== undefined && partial.preFermentTempC !== null) {
			this.preFermentTempEnabled = true;
			this.preFermentTempValue = partial.preFermentTempC;
		}
		if (partial.preFerments !== undefined) {
			const biga = partial.preFerments.find((pf) => pf.type === 'biga');
			const poolish = partial.preFerments.find((pf) => pf.type === 'poolish');
			this.bigaEnabled = biga !== undefined;
			this.poolishEnabled = poolish !== undefined;
			// Decoded shares are already clamped as a set — write the backing
			// fields directly; the setters would re-clamp against outgoing values.
			if (biga) this.#bigaFlourPercent = biga.flourPercent;
			if (poolish) this.#poolishFlourPercent = poolish.flourPercent;
		}
	}
}
