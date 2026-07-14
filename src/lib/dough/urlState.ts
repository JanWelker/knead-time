import type { UiMode } from '../storedMode';
import type { DoughInputs, PreFermentSpec, YeastType } from './types';

// v=4 additions 'i' (instant dry) and 'a' (active dry) extend the original
// 'f'/'s' pair — old links only ever carried those two.
const YEAST_CODES: Record<YeastType, string> = {
	fresh: 'f',
	instant: 'i',
	'active-dry': 'a',
	sourdough: 's'
};

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
	preFermentTempC: 'pt',
	ballProof: 'bp',
	mixingMethod: 'mm',
	preFerment: 'p'
} as const;

// Beginner/expert view mode travels in the share URL so a link opens the way
// its sender saw it. Only beginner is stamped ('md=b'); absence means expert
// for any link carrying recipe params (everything shared before v4 was made
// in today's full — now "expert" — view).
const MODE_KEY = 'md';

export function encodeInputs(inputs: SerializableInputs, ui?: { mode: UiMode }): string {
	const params = new URLSearchParams();
	params.set(VERSION_KEY, String(CURRENT_VERSION));
	if (ui?.mode === 'beginner') params.set(MODE_KEY, 'b');
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
	params.set(KEYS_V4.yeastType, YEAST_CODES[inputs.yeastType]);
	if (inputs.yeastType === 'sourdough') {
		params.set(KEYS_V4.starterHydration, String(inputs.starterHydration));
	}
	params.set(KEYS_V4.roomTempC, String(inputs.roomTempC));
	params.set(KEYS_V4.fridgeTempC, String(inputs.fridgeTempC));
	// Omitted when the pre-ferments simply follow the room temperature.
	if (inputs.preFermentTempC !== null) {
		params.set(KEYS_V4.preFermentTempC, String(inputs.preFermentTempC));
	}
	// Omitted for machine — the pre-v4 default every older link implies.
	if (inputs.mixingMethod === 'hand') params.set(KEYS_V4.mixingMethod, 'h');
	// Omitted for the classic room-temperature ball proof.
	if (inputs.ballProof === 'cold') params.set(KEYS_V4.ballProof, 'c');
	if (inputs.preFerments.length > 0) {
		params.set(KEYS_V4.preFerment, inputs.preFerments.map(formatPreFerment).join('_'));
	}
	return params.toString();
}

function formatPreFerment(pf: PreFermentSpec): string {
	const t = pf.type === 'biga' ? 'b' : 'p';
	return `${t}${pf.flourPercent}`;
}

// Flour-percent bounds enforced on decode so hand-crafted URLs can't push a
// pre-ferment outside what the form allows. Mirrors the InputForm limits.
const PREFERMENT_PCT_MIN = 5;
const PREFERMENT_PCT_MAX = 80;

// One token per pre-ferment, underscore-separated ('_' survives URL encoding
// unescaped; ',' is accepted too for hand-written links). v3 links carry a
// single token, which parses as a 1-element list through the same path.
// Duplicate types keep the first token; percents clamp to [5, 80]; when the
// two shares sum past 80 the second yields to the first and is dropped
// entirely if that leaves it under 5. The result is canonical biga-first
// order, matching what the form and encoder produce.
function parsePreFerments(encoded: string): PreFermentSpec[] {
	const out: PreFermentSpec[] = [];
	for (const token of encoded.split(/[,_]/)) {
		const type = token.startsWith('b') ? 'biga' : token.startsWith('p') ? 'poolish' : null;
		const pct = type ? num(token.slice(1)) : null;
		if (!type || pct === null || pct <= 0) continue;
		if (out.some((pf) => pf.type === type)) continue;
		const clamped = Math.min(PREFERMENT_PCT_MAX, Math.max(PREFERMENT_PCT_MIN, pct));
		const remaining = PREFERMENT_PCT_MAX - out.reduce((sum, pf) => sum + pf.flourPercent, 0);
		const pct2 = Math.min(clamped, remaining);
		if (pct2 < PREFERMENT_PCT_MIN) continue;
		out.push({ type, flourPercent: pct2 });
	}
	return [...out.filter((pf) => pf.type === 'biga'), ...out.filter((pf) => pf.type === 'poolish')];
}

// Resolves the view mode a URL asks for, or null when it doesn't say.
// An explicit md param wins; any other non-empty query is a recipe link and
// means expert; an empty query is a fresh visit — the caller falls back to
// the stored preference and finally to beginner.
export function decodeUiMode(query: string): UiMode | null {
	const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
	const md = params.get(MODE_KEY);
	if (md === 'b') return 'beginner';
	if (md === 'e') return 'expert';
	// URLSearchParams.size is too new for some supported browsers.
	return params.toString() !== '' ? 'expert' : null;
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
	if (y === 'i') out.yeastType = 'instant';
	if (y === 'a') out.yeastType = 'active-dry';
	if (y === 's') out.yeastType = 'sourdough';

	const sh = num(params.get(KEYS_V4.starterHydration));
	if (sh !== null) out.starterHydration = sh;

	const t = num(params.get(KEYS_V4.roomTempC));
	if (t !== null) out.roomTempC = t;

	const ft = num(params.get(KEYS_V4.fridgeTempC));
	if (ft !== null) out.fridgeTempC = ft;

	const pt = num(params.get(KEYS_V4.preFermentTempC));
	if (pt !== null) out.preFermentTempC = pt;

	const mm = params.get(KEYS_V4.mixingMethod);
	if (mm === 'h') out.mixingMethod = 'hand';
	if (mm === 'm') out.mixingMethod = 'machine';

	const bp = params.get(KEYS_V4.ballProof);
	if (bp === 'c') out.ballProof = 'cold';
	if (bp === 'r') out.ballProof = 'room';

	const p = params.get(KEYS_V4.preFerment);
	if (p) {
		out.preFerments = parsePreFerments(p);
	}

	return out;
}

function num(value: string | null): number | null {
	if (value === null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
