import { SvelteDate } from 'svelte/reactivity';
import { toDatePart } from './format';
import { roundBallWeight } from './dough/bakers';
import { flourZones } from './dough/flour';
import { RECIPE_DEFAULTS, toDefaultReadyBy } from './dough/defaults';
import { clampInput, clampPreFermentShares, clampShareInput } from './dough/inputBounds';
import { computeSchedule, COLD_MODE_THRESHOLD_MIN } from './dough/schedule';
import type {
	BallProof,
	ComputedSchedule,
	DoughInputs,
	MixingMethod,
	PreFermentSpec,
	YeastType
} from './dough/types';
import type { SerializableInputs } from './dough/urlState';
import { bestWindowStopIndex, idealWindowHours, stopsWithIdeal } from './dough/windowPresets';

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
	autolyse: boolean = $state(RECIPE_DEFAULTS.autolyse);
	// Backed by a private field because a number input bound to an empty box
	// writes null, and null means something here: "no flour stated". Letting a
	// backspace through flipped the preset select to "not specified" and
	// stamped fw=0 into the share URL — the recipe changed while the user was
	// mid-edit. Only `setFlour` says that on purpose.
	#flourW: number | null = $state(RECIPE_DEFAULTS.flourW);

	get flourW(): number | null {
		return this.#flourW;
	}

	set flourW(value: number | null) {
		if (value !== null && Number.isFinite(value)) this.#flourW = value;
	}

	/** Deliberate change of flour, including to "not specified". */
	setFlour(value: number | null) {
		this.#flourW = value;
	}
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
		autolyse: this.autolyse,
		flourW: this.flourW === null ? null : clampInput('flourW', this.flourW),
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

	// The schedule's fermentation-window slider works in whole hours of
	// readyBy − startAt. readyBy is the app's anchor ("pick when to bake"), so
	// widening the window can only move startAt earlier — and because the value
	// flows back through computeSchedule like any other edit, the night-window
	// guard, the cold/room switch and the yeast solve all re-run on it.
	get fermentWindowHours(): number {
		return (this.readyBy.getTime() - this.startAt.getTime()) / 3_600_000;
	}

	set fermentWindowHours(hours: number) {
		if (!Number.isFinite(hours)) return;
		// SvelteDate, like the initial value: the schedule reads startAt's
		// getters, so a plain Date here would not re-trigger them.
		this.startAt = new SvelteDate(this.readyBy.getTime() - hours * 3_600_000);
	}

	// A user edit of the bake time, as opposed to `apply()` writing readyBy
	// from a decoded link. Picking when to bake is the app's primary action,
	// so it re-answers the follow-up question too: the window jumps to the
	// longest one the flour handles well that still fits before the new
	// deadline. The slider stays free to shorten it afterwards — but leaving a
	// window sized for the old bake time would silently hand back a worse
	// plan than the new time allows.
	//
	// Only from an explicit edit: decoding a share link must reproduce its
	// recipe verbatim, so `apply()` deliberately writes readyBy directly.
	// Set whenever something the app did moved the start onto a different
	// calendar day — a slider drag, or a re-pick after a bake-time or flour
	// edit. Easy to miss while the readout counts hours, so the window card
	// says so. Cleared by any of those that lands on the same day, and by the
	// user editing the start time themselves.
	startDayMoved: boolean = $state(false);

	// The day the user themselves last put the start on — a typed start time, or
	// the one a decoded link arrived with. NOT the value before the previous
	// write: a drag fires one write per stop, so comparing against the last one
	// switched the notice off again the moment two consecutive stops happened to
	// land on the same day. Dragging six stops across midnight left no notice at
	// all, which is the whole thing it exists to report.
	#startDayBaseline: string = $state('');

	#trackStartDay(mutate: () => void) {
		mutate();
		this.startDayMoved = toDatePart(this.startAt) !== this.#baseline();
	}

	#baseline(): string {
		if (this.#startDayBaseline === '') this.#startDayBaseline = toDatePart(this.startAt);
		return this.#startDayBaseline;
	}

	#rebaseStartDay() {
		this.#startDayBaseline = toDatePart(this.startAt);
		this.startDayMoved = false;
	}

	// The window the current flour and deadline deserve. Both of those are
	// inputs the user can edit, so both re-answer it — the ideal is a function
	// of the pair, and showing a better option without taking it is just a
	// worse plan with an arrow pointing at the good one.
	//
	// Never called from `apply()`: a decoded share link has to reproduce its own
	// window verbatim. Returns whether it found anything to pick.
	repickWindow(): boolean {
		const hoursUntilBake = (this.readyBy.getTime() - Date.now()) / 3_600_000;
		const zones =
			this.flourW === null ? null : flourZones(this.flourW, COLD_MODE_THRESHOLD_MIN / 60);
		// Aim at the same stop list the slider offers, ideal included — otherwise
		// the app picks a window the user can never drag back to.
		const stops = stopsWithIdeal(idealWindowHours(zones, hoursUntilBake));
		const best = bestWindowStopIndex(hoursUntilBake, zones, stops);
		if (best === null) return false;
		this.#trackStartDay(() => (this.fermentWindowHours = stops[best]));
		return true;
	}

	// The slider's own write. Goes through here rather than the plain setter so
	// a drag reports a day change the same way a re-pick does.
	setWindowHours(hours: number) {
		this.#trackStartDay(() => (this.fermentWindowHours = hours));
	}

	setReadyBy(next: Date) {
		this.readyBy = next;
		// Without a re-pick (no flour, or nothing reachable) startAt keeps its
		// old value, which a bake time moved earlier can leave stranded after
		// the bake. Same floor as setStartAt, applied from the other side.
		if (!this.repickWindow() && this.startAt.getTime() > next.getTime()) {
			this.startAt = new SvelteDate(next.getTime());
		}
	}

	// A user edit of the start time. The dough cannot begin after it is due out
	// of the oven, so a later value is clamped to the bake time rather than
	// accepted as a negative window; returns whether it had to clamp, so the
	// form can say why the field snapped back.
	setStartAt(next: Date): boolean {
		const late = next.getTime() > this.readyBy.getTime();
		this.startAt = late ? new SvelteDate(this.readyBy.getTime()) : next;
		this.#rebaseStartDay();
		return late;
	}

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
		if (partial.startAt instanceof Date) {
			this.startAt = partial.startAt;
			this.#rebaseStartDay();
		}
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
		if (partial.autolyse !== undefined) this.autolyse = partial.autolyse;
		// null is a real value here ("no flour stated", what every pre-v6 link
		// decodes to), so this checks undefined rather than truthiness.
		if (partial.flourW !== undefined) this.setFlour(partial.flourW);
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
