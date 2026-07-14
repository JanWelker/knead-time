import type { DoughInputs, ScheduleStepKind } from '../dough/types';
import { decodeInputs, type SerializableInputs } from '../dough/urlState';
import source from './pizzerias.md?raw';

export type RankingList = 'italy' | 'world';

export interface Ranking {
	year: number;
	rank: number;
	list: RankingList;
}

export interface DurationRange {
	minMinutes: number;
	maxMinutes: number;
}

export type SourceTiming = Partial<Record<ScheduleStepKind, DurationRange>>;

export interface PizzeriaEntry {
	name: string;
	profileUrl: string | null;
	city: string;
	country: string;
	rankings: Ranking[];
	recipeUrl: string;
	recipeSearch: string;
	sourceUrl: string;
	timing: SourceTiming;
	// Free-form caveats the encoding can't capture — flour blends, dropped
	// ingredients, "approximation", etc. Empty string when the recipe maps
	// cleanly.
	notes: string;
	inputs: Partial<SerializableInputs>;
}

// `YEAR-LIST:RANK` — e.g. `2024-w:13` or `2019-it:1`. The `LIST` segment is
// `it` for the 2018–2021 guides (Italy-only) and `w` for 2022–2025 World.
const RANKING_RE = /^(\d{4})-(it|w):(\d+)$/;

// `step-kind:Nh`, `step-kind:N-Mh`, `step-kind:Nm`. Step kind matches a
// ScheduleStepKind we care about for proving.
const TIMING_STEP_KINDS: ScheduleStepKind[] = [
	'preferment-mix',
	'bulk-room',
	'bulk-cold',
	'final-proof'
];
const TIMING_RE = /^([a-z-]+):(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?(h|m)$/;

export function parsePizzerias(markdown: string): PizzeriaEntry[] {
	const entries: PizzeriaEntry[] = [];
	for (const raw of markdown.split('\n')) {
		const line = raw.trim();
		if (!line.startsWith('|') || !line.endsWith('|')) continue;

		const cells = line
			.slice(1, -1)
			.split('|')
			.map((c) => c.trim());
		if (cells.length < 7) continue;

		const [nameCell, locationCell, rankingsCell, recipeCell, timingCell, notesCell, sourceCell] =
			cells;

		const { name, profileUrl } = parseNameCell(nameCell);
		if (!name) continue;

		const { city, country } = parseLocation(locationCell);
		if (!country) continue;

		const rankings = parseRankings(rankingsCell);
		if (rankings.length === 0) continue;

		const recipeUrl = extractUrl(recipeCell);
		if (!recipeUrl) continue;

		const recipeSearch = searchFromUrl(recipeUrl);
		if (!recipeSearch) continue;

		const sourceUrl = extractUrl(sourceCell);
		if (!sourceUrl) continue;

		entries.push({
			name,
			profileUrl,
			city,
			country,
			rankings,
			recipeUrl,
			recipeSearch,
			sourceUrl,
			timing: parseTiming(timingCell),
			notes: notesCell,
			inputs: decodeInputs(recipeSearch)
		});
	}
	return entries;
}

function parseNameCell(cell: string): { name: string; profileUrl: string | null } {
	const md = /^\[([^\]]+)\]\((https?:\/\/\S+?)\)$/.exec(cell);
	if (md) return { name: md[1].trim(), profileUrl: md[2] };
	return { name: cell, profileUrl: null };
}

function parseLocation(cell: string): { city: string; country: string } {
	const parts = cell.split(',').map((p) => p.trim());
	if (parts.length < 2) return { city: cell, country: '' };
	// Country is the last segment; everything before is the city (some cities
	// have a comma, though none currently do — keep the join future-proof).
	const country = parts[parts.length - 1];
	const city = parts.slice(0, -1).join(', ');
	return { city, country };
}

function parseRankings(cell: string): Ranking[] {
	const out: Ranking[] = [];
	for (const raw of cell.split(',')) {
		const token = raw.trim();
		const m = RANKING_RE.exec(token);
		if (!m) continue;
		const year = Number(m[1]);
		const list: RankingList = m[2] === 'it' ? 'italy' : 'world';
		const rank = Number(m[3]);
		out.push({ year, rank, list });
	}
	return out;
}

function parseTiming(cell: string): SourceTiming {
	const out: SourceTiming = {};
	for (const raw of cell.split(',')) {
		const token = raw.trim();
		if (!token) continue;
		const m = TIMING_RE.exec(token);
		if (!m) continue;
		const kind = m[1] as ScheduleStepKind;
		if (!TIMING_STEP_KINDS.includes(kind)) continue;
		const factor = m[4] === 'h' ? 60 : 1;
		const minMinutes = Math.round(Number(m[2]) * factor);
		const maxMinutes = m[3] === undefined ? minMinutes : Math.round(Number(m[3]) * factor);
		out[kind] = { minMinutes, maxMinutes };
	}
	return out;
}

function extractUrl(cell: string): string | null {
	const md = /\[[^\]]+\]\((https?:\/\/\S+?)\)/.exec(cell);
	if (md) return md[1];
	const bare = /https?:\/\/\S+/.exec(cell);
	return bare ? bare[0] : null;
}

function searchFromUrl(url: string): string | null {
	try {
		return new URL(url).search;
	} catch {
		return null;
	}
}

/**
 * Sort by best (lowest) rank ever achieved, then by most-recent year, then by
 * name. Ties on best-rank surface the more recently relevant pizzeria first.
 */
export function comparePizzerias(a: PizzeriaEntry, b: PizzeriaEntry): number {
	const bestA = Math.min(...a.rankings.map((r) => r.rank));
	const bestB = Math.min(...b.rankings.map((r) => r.rank));
	if (bestA !== bestB) return bestA - bestB;
	const latestA = Math.max(...a.rankings.map((r) => r.year));
	const latestB = Math.max(...b.rankings.map((r) => r.year));
	if (latestA !== latestB) return latestB - latestA;
	return a.name.localeCompare(b.name);
}

/**
 * Find the pizzeria whose encoded recipe parameters match `inputs` exactly,
 * ignoring date fields (readyBy / startAt). Lets the user tweak the bake time
 * without losing the source-recipe context.
 */
export function findMatchingPizzeria(
	inputs: DoughInputs,
	entries: PizzeriaEntry[] = pizzeriaEntries
): PizzeriaEntry | null {
	for (const entry of entries) {
		if (matchesRecipe(entry.inputs, inputs)) return entry;
	}
	return null;
}

function matchesRecipe(a: Partial<SerializableInputs>, b: DoughInputs): boolean {
	if (a.pizzaCount !== b.pizzaCount) return false;
	if (a.ballWeight !== b.ballWeight) return false;
	if (a.hydration !== b.hydration) return false;
	if (a.saltPercent !== b.saltPercent) return false;
	// Pre-v=3 share URLs omit oil/sugar; the parser leaves them undefined, the
	// form supplies 0. Treat unset === 0 so legacy entries keep matching.
	if ((a.oilPercent ?? 0) !== b.oilPercent) return false;
	if ((a.sugarPercent ?? 0) !== b.sugarPercent) return false;
	if (a.yeastType !== b.yeastType) return false;
	if (a.roomTempC !== b.roomTempC) return false;
	if (a.fridgeTempC !== b.fridgeTempC) return false;
	if (a.yeastType === 'sourdough' && a.starterHydration !== b.starterHydration) return false;
	// Pre-v=4 share URLs omit the mixing method; the parser leaves it
	// undefined, the form supplies 'spiral' (the old "machine" calibration).
	// Treat unset === spiral so legacy entries keep matching. Same story for
	// the pre-ferment temperature, whose unset value is null (follows the room).
	if ((a.mixingMethod ?? 'spiral') !== b.mixingMethod) return false;
	if ((a.preFermentTempC ?? null) !== b.preFermentTempC) return false;
	if ((a.ballProof ?? 'room') !== b.ballProof) return false;
	// Both sides are in canonical biga-first order (decode and the form both
	// guarantee it), so element-wise comparison suffices.
	const aPf = a.preFerments ?? [];
	const bPf = b.preFerments;
	if (aPf.length !== bPf.length) return false;
	return aPf.every((pf, i) => pf.type === bPf[i].type && pf.flourPercent === bPf[i].flourPercent);
}

export const pizzeriaEntries: PizzeriaEntry[] = parsePizzerias(source).sort(comparePizzerias);
