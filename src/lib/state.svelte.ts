import { roundBallWeight } from './dough/bakers';
import { computeSchedule } from './dough/schedule';
import type { ComputedSchedule, DoughInputs, YeastType } from './dough/types';
import type { SerializableInputs } from './dough/urlState';

export type PreFermentChoice = 'none' | 'biga' | 'poolish';

function defaultReadyBy(): Date {
	const d = new Date();
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
	yeastType: YeastType = $state('fresh');
	starterHydration: number = $state(100);
	roomTempC: number = $state(22);
	preFermentType: PreFermentChoice = $state('none');
	preFermentFlour: number = $state(30);
	startAt: Date = $state(new Date());

	readonly inputs: DoughInputs = $derived({
		readyBy: this.readyBy,
		startAt: this.startAt,
		pizzaCount: this.pizzaCount,
		ballWeight: this.ballWeight,
		hydration: this.hydration,
		saltPercent: this.saltPercent,
		yeastType: this.yeastType,
		starterHydration: this.starterHydration,
		roomTempC: this.roomTempC,
		preFerment:
			this.preFermentType === 'none'
				? null
				: { type: this.preFermentType, flourPercent: this.preFermentFlour }
	});

	readonly schedule: ComputedSchedule = $derived(computeSchedule(this.inputs));

	serializable(): SerializableInputs {
		return {
			readyBy: this.readyBy,
			startAt: this.startAt,
			pizzaCount: this.pizzaCount,
			ballWeight: this.ballWeight,
			hydration: this.hydration,
			saltPercent: this.saltPercent,
			yeastType: this.yeastType,
			starterHydration: this.starterHydration,
			roomTempC: this.roomTempC,
			preFerment:
				this.preFermentType === 'none'
					? null
					: { type: this.preFermentType, flourPercent: this.preFermentFlour }
		};
	}

	roundBallWeight() {
		this.ballWeight = roundBallWeight({
			pizzaCount: this.pizzaCount,
			ballWeight: this.ballWeight,
			hydration: this.hydration,
			saltPercent: this.saltPercent,
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
		if (partial.yeastType !== undefined) this.yeastType = partial.yeastType;
		if (partial.starterHydration !== undefined) this.starterHydration = partial.starterHydration;
		if (partial.roomTempC !== undefined) this.roomTempC = partial.roomTempC;
		if (partial.preFerment !== undefined) {
			if (partial.preFerment === null) {
				this.preFermentType = 'none';
			} else {
				this.preFermentType = partial.preFerment.type;
				this.preFermentFlour = partial.preFerment.flourPercent;
			}
		}
	}
}
