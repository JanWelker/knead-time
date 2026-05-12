import type { DoughInputs, PreFermentSpec } from './types';

export type SerializableInputs = DoughInputs;

const KEYS = {
	readyBy: 'r',
	startAt: 'sa',
	pizzaCount: 'n',
	ballWeight: 'b',
	hydration: 'h',
	saltPercent: 's',
	yeastType: 'y',
	starterHydration: 'sh',
	roomTempC: 't',
	preFerment: 'p'
} as const;

export function encodeInputs(inputs: SerializableInputs): string {
	const params = new URLSearchParams();
	params.set(KEYS.readyBy, inputs.readyBy.toISOString());
	params.set(KEYS.startAt, inputs.startAt.toISOString());
	params.set(KEYS.pizzaCount, String(inputs.pizzaCount));
	params.set(KEYS.ballWeight, String(inputs.ballWeight));
	params.set(KEYS.hydration, String(inputs.hydration));
	params.set(KEYS.saltPercent, String(inputs.saltPercent));
	params.set(KEYS.yeastType, inputs.yeastType === 'sourdough' ? 's' : 'f');
	if (inputs.yeastType === 'sourdough') {
		params.set(KEYS.starterHydration, String(inputs.starterHydration));
	}
	params.set(KEYS.roomTempC, String(inputs.roomTempC));
	if (inputs.preFerment) {
		const t = inputs.preFerment.type === 'biga' ? 'b' : 'p';
		params.set(KEYS.preFerment, `${t}${inputs.preFerment.flourPercent}`);
	}
	return params.toString();
}

export function decodeInputs(query: string): Partial<SerializableInputs> {
	const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
	const out: Partial<SerializableInputs> = {};

	const r = params.get(KEYS.readyBy);
	if (r) {
		const d = new Date(r);
		if (!Number.isNaN(d.getTime())) out.readyBy = d;
	}
	const sa = params.get(KEYS.startAt);
	if (sa) {
		const d = new Date(sa);
		if (!Number.isNaN(d.getTime())) out.startAt = d;
	}
	const n = num(params.get(KEYS.pizzaCount));
	if (n !== null) out.pizzaCount = n;
	const b = num(params.get(KEYS.ballWeight));
	if (b !== null) out.ballWeight = b;
	const h = num(params.get(KEYS.hydration));
	if (h !== null) out.hydration = h;
	const s = num(params.get(KEYS.saltPercent));
	if (s !== null) out.saltPercent = s;

	const y = params.get(KEYS.yeastType);
	if (y === 'f') out.yeastType = 'fresh';
	if (y === 's') out.yeastType = 'sourdough';

	const sh = num(params.get(KEYS.starterHydration));
	if (sh !== null) out.starterHydration = sh;

	const t = num(params.get(KEYS.roomTempC));
	if (t !== null) out.roomTempC = t;

	const p = params.get(KEYS.preFerment);
	if (p) {
		const type = p.startsWith('b') ? 'biga' : p.startsWith('p') ? 'poolish' : null;
		const pct = num(p.slice(1));
		if (type && pct !== null && pct > 0) {
			out.preFerment = { type, flourPercent: pct } satisfies PreFermentSpec;
		} else {
			out.preFerment = null;
		}
	}

	return out;
}

function num(value: string | null): number | null {
	if (value === null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
