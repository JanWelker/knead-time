import { decodeInputs, type SerializableInputs } from '../dough/urlState';
import source from './community.md?raw';

export interface CommunityEntry {
	name: string;
	date: string;
	url: string;
	search: string;
	inputs: Partial<SerializableInputs>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCommunity(markdown: string): CommunityEntry[] {
	const entries: CommunityEntry[] = [];
	for (const raw of markdown.split('\n')) {
		const line = raw.trim();
		if (!line.startsWith('|') || !line.endsWith('|')) continue;

		const cells = line
			.slice(1, -1)
			.split('|')
			.map((c) => c.trim());
		if (cells.length < 3) continue;

		const [name, date, urlCell] = cells;
		if (!DATE_RE.test(date)) continue;

		const url = extractUrl(urlCell);
		if (!url) continue;

		const search = searchFromUrl(url);
		if (!search) continue;

		entries.push({ name, date, url, search, inputs: decodeInputs(search) });
	}
	return entries;
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

export const communityEntries: CommunityEntry[] = parseCommunity(source);
