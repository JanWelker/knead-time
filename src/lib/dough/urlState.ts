import type { DoughInputs, PreFermentSpec } from './types';

export type SerializableInputs = DoughInputs;

// Bump CURRENT_VERSION when you change the shape of SerializableInputs
// (rename/remove a field, change a unit, change defaults that links should
// preserve). Keep decode() understanding every published key shape so links
// shared before the change still resolve to a working recipe.
const CURRENT_VERSION = 4;
const VERSION_KEY = 'v';

// v=4 adds 'mm' (mixing method; omitted = machine, which matches the fixed
// 15-min mix every older link was computed against) and extends 'p' to an
// underscore-separated list so biga and poolish can run in parallel — the
// old single-token form parses as a 1-element list.
// v=3 adds 'o' (oil %) and 'sg' (sugar %). v=2 omits them and decodes with
// FormState defaults (0/0), matching every existing share-link's actual
// recipe — none of them carried oil or sugar.
// v=2 adds 'ft' (fridge temperature). v=1 links omit it and decode to the
// FormState default (4 °C), which matches the hardcoded constant they were
// originally computed against — so v=1 share-links keep producing the same
// recipe. Each version's keys are a superset of the previous version's.
const KEYS_V4 = {
	readyBy: 'r',
	startAt: 'sa',
	pizzaCount: 'n',
	ballWeight: 'b',
	hydration: 'h',
	saltPercent: 's',
	oilPercent: 'o',
	sugarPercent: 'sg',
	yeastType: 'y',
	starterHydration: 'sh',
	roomTempC: 't',
	fridgeTempC: 'ft',
	mixingMethod: 'mm',
	preFerment: 'p'
} as const;

export function encodeInputs(inputs: SerializableInputs): string {
	const params = new URLSearchParams();
	params.set(VERSION_KEY, String(CURRENT_VERSION));
	params.set(KEYS_V4.readyBy, inputs.readyBy.toISOString());
	params.set(KEYS_V4.startAt, inputs.startAt.toISOString());
	params.set(KEYS_V4.pizzaCount, String(inputs.pizzaCount));
	params.set(KEYS_V4.ballWeight, String(inputs.ballWeight));
	params.set(KEYS_V4.hydration, String(inputs.hydration));
	params.set(KEYS_V4.saltPercent, String(inputs.saltPercent));
	// Omit the optional ingredients when absent so default recipes still
	// produce short URLs identical to the v=2 era (modulo the version bump).
	if (inputs.oilPercent > 0) params.set(KEYS_V4.oilPercent, String(inputs.oilPercent));
	if (inputs.sugarPercent > 0) params.set(KEYS_V4.sugarPercent, String(inputs.sugarPercent));
	params.set(KEYS_V4.yeastType, inputs.yeastType === 'sourdough' ? 's' : 'f');
	if (inputs.yeastType === 'sourdough') {
		params.set(KEYS_V4.starterHydration, String(inputs.starterHydration));
	}
	params.set(KEYS_V4.roomTempC, String(inputs.roomTempC));
	params.set(KEYS_V4.fridgeTempC, String(inputs.fridgeTempC));
	// Omitted for machine — the pre-v4 default every older link implies.
	if (inputs.mixingMethod === 'hand') params.set(KEYS_V4.mixingMethod, 'h');
	if (inputs.preFerment) {
		params.set(KEYS_V4.preFerment, formatPreFerment(inputs.preFerment));
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

export function decodeInputs(query: string): Partial<SerializableInputs> {
	const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
	// Every published version (v1, v2, v3, missing-v=legacy) adds keys without
	// renaming or repurposing them, so a single decoder handles them all.
	// Branch on the version param the first time a future version DOES break
	// that contract.
	return decode(params);
}

// Single decoder for every version. Each version adds keys but never renames
// or repurposes them — so reading a key from an older URL is harmless
// (params.get returns null, the field stays undefined, FormState defaults
// fill in). The version param itself is retained for forward-compat: when a
// future version DOES rename/repurpose a key, branch on `version` here.
function decode(params: URLSearchParams): Partial<SerializableInputs> {
	const out: Partial<SerializableInputs> = {};

	const r = params.get(KEYS_V4.readyBy);
	if (r) {
		const d = new Date(r);
		if (!Number.isNaN(d.getTime())) out.readyBy = d;
	}
	const sa = params.get(KEYS_V4.startAt);
	if (sa) {
		const d = new Date(sa);
		if (!Number.isNaN(d.getTime())) out.startAt = d;
	}
	const n = num(params.get(KEYS_V4.pizzaCount));
	if (n !== null) out.pizzaCount = n;
	const b = num(params.get(KEYS_V4.ballWeight));
	if (b !== null) out.ballWeight = b;
	const h = num(params.get(KEYS_V4.hydration));
	if (h !== null) out.hydration = h;
	const s = num(params.get(KEYS_V4.saltPercent));
	if (s !== null) out.saltPercent = s;
	const o = num(params.get(KEYS_V4.oilPercent));
	if (o !== null) out.oilPercent = o;
	const sg = num(params.get(KEYS_V4.sugarPercent));
	if (sg !== null) out.sugarPercent = sg;

	const y = params.get(KEYS_V4.yeastType);
	if (y === 'f') out.yeastType = 'fresh';
	if (y === 's') out.yeastType = 'sourdough';

	const sh = num(params.get(KEYS_V4.starterHydration));
	if (sh !== null) out.starterHydration = sh;

	const t = num(params.get(KEYS_V4.roomTempC));
	if (t !== null) out.roomTempC = t;

	const ft = num(params.get(KEYS_V4.fridgeTempC));
	if (ft !== null) out.fridgeTempC = ft;

	const mm = params.get(KEYS_V4.mixingMethod);
	if (mm === 'h') out.mixingMethod = 'hand';
	if (mm === 'm') out.mixingMethod = 'machine';

	const p = params.get(KEYS_V4.preFerment);
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

function num(value: string | null): number | null {
	if (value === null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
