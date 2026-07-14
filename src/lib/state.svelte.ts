import { SvelteDate } from 'svelte/reactivity';
import { roundBallWeight } from './dough/bakers';
import { computeSchedule } from './dough/schedule';
import type {
	ComputedSchedule,
	DoughInputs,
	MixingMethod,
	PreFermentSpec,
	YeastType
} from './dough/types';
import type { SerializableInputs } from './dough/urlState';

function defaultReadyBy(): Date {
	const d = new SvelteDate();
	d.setDate(d.getDate() + 1);
	d.setHours(19, 0, 0, 0);
	return d;
}

export class FormState {
	readyBy: Date = $state(defaultReadyBy());
	pizzaCount: number = $state(6);
	ballWeight: number = $state(280);
	hydration: number = $state(70);
	saltPercent: number = $state(3);
	oilPercent: number = $state(0);
	sugarPercent: number = $state(0);
	yeastType: YeastType = $state('fresh');
	starterHydration: number = $state(100);
	roomTempC: number = $state(22);
	fridgeTempC: number = $state(4);
	mixingMethod: MixingMethod = $state('machine');
	preFermentTempEnabled: boolean = $state(false);
	preFermentTempValue: number = $state(18);
	bigaEnabled: boolean = $state(false);
	bigaFlourPercent: number = $state(30);
	poolishEnabled: boolean = $state(false);
	poolishFlourPercent: number = $state(20);
	startAt: Date = $state(new SvelteDate());

	readonly inputs: DoughInputs = $derived({
		readyBy: this.readyBy,
		startAt: this.startAt,
		pizzaCount: this.pizzaCount,
		ballWeight: this.ballWeight,
		hydration: this.hydration,
		saltPercent: this.saltPercent,
		oilPercent: this.oilPercent,
		sugarPercent: this.sugarPercent,
		yeastType: this.yeastType,
		starterHydration: this.starterHydration,
		roomTempC: this.roomTempC,
		fridgeTempC: this.fridgeTempC,
		mixingMethod: this.mixingMethod,
		preFermentTempC: this.preFermentTempEnabled ? this.preFermentTempValue : null,
		// Canonical biga-first order — the encoder and decoder preserve it.
		preFerments: [
			...(this.bigaEnabled
				? [{ type: 'biga', flourPercent: this.bigaFlourPercent } satisfies PreFermentSpec]
				: []),
			...(this.poolishEnabled
				? [{ type: 'poolish', flourPercent: this.poolishFlourPercent } satisfies PreFermentSpec]
				: [])
		]
	});

	readonly schedule: ComputedSchedule = $derived(computeSchedule(this.inputs));

	serializable(): SerializableInputs {
		return this.inputs;
	}

	roundBallWeight() {
		this.ballWeight = roundBallWeight({
			pizzaCount: this.pizzaCount,
			ballWeight: this.ballWeight,
			hydration: this.hydration,
			saltPercent: this.saltPercent,
			oilPercent: this.oilPercent,
			sugarPercent: this.sugarPercent,
			yeastPercent: this.schedule.yeastPercent,
			yeastType: this.yeastType
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
		if (partial.preFermentTempC !== undefined && partial.preFermentTempC !== null) {
			this.preFermentTempEnabled = true;
			this.preFermentTempValue = partial.preFermentTempC;
		}
		if (partial.preFerments !== undefined) {
			const biga = partial.preFerments.find((pf) => pf.type === 'biga');
			const poolish = partial.preFerments.find((pf) => pf.type === 'poolish');
			this.bigaEnabled = biga !== undefined;
			if (biga) this.bigaFlourPercent = biga.flourPercent;
			this.poolishEnabled = poolish !== undefined;
			if (poolish) this.poolishFlourPercent = poolish.flourPercent;
		}
	}
}
