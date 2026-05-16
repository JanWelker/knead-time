import { decodeInputs, type SerializableInputs } from '../dough/urlState';
import source from './pizzerias.md?raw';

export type RankingList = 'italy' | 'world';

export interface Ranking {
	year: number;
	rank: number;
	list: RankingList;
}

export interface PizzeriaEntry {
	name: string;
	profileUrl: string | null;
	city: string;
	country: string;
	rankings: Ranking[];
	recipeUrl: string;
	recipeSearch: string;
	sourceUrl: string;
	inputs: Partial<SerializableInputs>;
}

// `YEAR-LIST:RANK` — e.g. `2024-w:13` or `2019-it:1`. The `LIST` segment is
// `it` for the 2018–2021 guides (Italy-only) and `w` for 2022–2025 World.
const RANKING_RE = /^(\d{4})-(it|w):(\d+)$/;

export function parsePizzerias(markdown: string): PizzeriaEntry[] {
	const entries: PizzeriaEntry[] = [];
	for (const raw of markdown.split('\n')) {
		const line = raw.trim();
		if (!line.startsWith('|') || !line.endsWith('|')) continue;

		const cells = line
			.slice(1, -1)
			.split('|')
			.map((c) => c.trim());
		if (cells.length < 5) continue;

		const [nameCell, locationCell, rankingsCell, recipeCell, sourceCell] = cells;

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

export const pizzeriaEntries: PizzeriaEntry[] = parsePizzerias(source).sort(comparePizzerias);
