import type { DoughInputs, PreFermentSpec } from './types';

export type SerializableInputs = DoughInputs;

// Bump CURRENT_VERSION when you change the shape of SerializableInputs
// (rename/remove a field, change a unit, change defaults that links should
// preserve). Keep the previous decoder in DECODERS so links shared before the
// change still resolve to a working recipe.
const CURRENT_VERSION = 2;
const VERSION_KEY = 'v';

// v=2 adds 'ft' (fridge temperature). v=1 links omit it and decode to the
// FormState default (4 °C), which matches the hardcoded constant they were
// originally computed against — so v=1 share-links keep producing the same
// recipe. v=2 keys are a superset of v=1 keys; the shared decoder reads only
// the common keys, and decodeV2 additionally reads `ft`.
const KEYS_V2 = {
	readyBy: 'r',
	startAt: 'sa',
	pizzaCount: 'n',
	ballWeight: 'b',
	hydration: 'h',
	saltPercent: 's',
	yeastType: 'y',
	starterHydration: 'sh',
	roomTempC: 't',
	fridgeTempC: 'ft',
	preFerment: 'p'
} as const;

export function encodeInputs(inputs: SerializableInputs): string {
	const params = new URLSearchParams();
	params.set(VERSION_KEY, String(CURRENT_VERSION));
	params.set(KEYS_V2.readyBy, inputs.readyBy.toISOString());
	params.set(KEYS_V2.startAt, inputs.startAt.toISOString());
	params.set(KEYS_V2.pizzaCount, String(inputs.pizzaCount));
	params.set(KEYS_V2.ballWeight, String(inputs.ballWeight));
	params.set(KEYS_V2.hydration, String(inputs.hydration));
	params.set(KEYS_V2.saltPercent, String(inputs.saltPercent));
	params.set(KEYS_V2.yeastType, inputs.yeastType === 'sourdough' ? 's' : 'f');
	if (inputs.yeastType === 'sourdough') {
		params.set(KEYS_V2.starterHydration, String(inputs.starterHydration));
	}
	params.set(KEYS_V2.roomTempC, String(inputs.roomTempC));
	params.set(KEYS_V2.fridgeTempC, String(inputs.fridgeTempC));
	if (inputs.preFerment) {
		params.set(KEYS_V2.preFerment, formatPreFerment(inputs.preFerment));
	}
	return params.toString();
}

function formatPreFerment(pf: PreFermentSpec): string {
	const t = pf.type === 'biga' ? 'b' : 'p';
	return `${t}${pf.flourPercent}`;
}

function parsePreFerment(encoded: string): { type: 'biga' | 'poolish' | null; pct: number | null } {
	const type = encoded.startsWith('b') ? 'biga' : encoded.startsWith('p') ? 'poolish' : null;
	const pct = type ? num(encoded.slice(1)) : null;
	return { type, pct };
}

type Decoder = (params: URLSearchParams) => Partial<SerializableInputs>;

const DECODERS: Record<number, Decoder> = {
	1: decodeV1,
	2: decodeV2
};

export function decodeInputs(query: string): Partial<SerializableInputs> {
	const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
	// Legacy links predate the version param — treat them as v1.
	const raw = params.get(VERSION_KEY);
	const requested = raw === null ? 1 : Number(raw);
	const version = Number.isFinite(requested) && DECODERS[requested] ? requested : CURRENT_VERSION;
	return DECODERS[version](params);
}

function decodeShared(params: URLSearchParams): Partial<SerializableInputs> {
	const out: Partial<SerializableInputs> = {};

	const r = params.get(KEYS_V2.readyBy);
	if (r) {
		const d = new Date(r);
		if (!Number.isNaN(d.getTime())) out.readyBy = d;
	}
	const sa = params.get(KEYS_V2.startAt);
	if (sa) {
		const d = new Date(sa);
		if (!Number.isNaN(d.getTime())) out.startAt = d;
	}
	const n = num(params.get(KEYS_V2.pizzaCount));
	if (n !== null) out.pizzaCount = n;
	const b = num(params.get(KEYS_V2.ballWeight));
	if (b !== null) out.ballWeight = b;
	const h = num(params.get(KEYS_V2.hydration));
	if (h !== null) out.hydration = h;
	const s = num(params.get(KEYS_V2.saltPercent));
	if (s !== null) out.saltPercent = s;

	const y = params.get(KEYS_V2.yeastType);
	if (y === 'f') out.yeastType = 'fresh';
	if (y === 's') out.yeastType = 'sourdough';

	const sh = num(params.get(KEYS_V2.starterHydration));
	if (sh !== null) out.starterHydration = sh;

	const t = num(params.get(KEYS_V2.roomTempC));
	if (t !== null) out.roomTempC = t;

	const p = params.get(KEYS_V2.preFerment);
	if (p) {
		const { type, pct } = parsePreFerment(p);
		if (type && pct !== null && pct > 0) {
			out.preFerment = { type, flourPercent: pct } satisfies PreFermentSpec;
		} else {
			out.preFerment = null;
		}
	}

	return out;
}

function decodeV1(params: URLSearchParams): Partial<SerializableInputs> {
	// v=1 omits 'ft'; the FormState default (4 °C) — matching the constant the
	// recipe was originally computed against — fills in via state.apply.
	return decodeShared(params);
}

function decodeV2(params: URLSearchParams): Partial<SerializableInputs> {
	const out = decodeShared(params);
	const ft = num(params.get(KEYS_V2.fridgeTempC));
	if (ft !== null) out.fridgeTempC = ft;
	return out;
}

function num(value: string | null): number | null {
	if (value === null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
