import { decodeInputs, type SerializableInputs } from '../dough/urlState';
import source from './community.md?raw';

export interface CommunityEntry {
	name: string;
	handle: string | null;
	date: string;
	url: string;
	search: string;
	inputs: Partial<SerializableInputs>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// GitHub username rules: 1–39 chars, alphanumeric or single hyphens, can't
// start or end with a hyphen. The lookahead enforces the length cap; the body
// enforces single hyphens (consecutive hyphens are invalid on GitHub). We
// require a leading `@` so the parser only linkifies cells the contributor
// explicitly opted in as a handle.
const HANDLE_RE = /^@((?=[A-Za-z0-9-]{1,39}$)[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$/;

// DATE_RE only checks the shape — `2026-13-99` still matches. A month
// round-trip through the Date constructor is a complete calendar check: an
// out-of-range month lands `m - 1` outside getMonth()'s 0–11 range, and an
// overflowing day (2026-02-31) always rolls the month.
function isCalendarDate(date: string): boolean {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(y, m - 1, d).getMonth() === m - 1;
}

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
		if (!name) continue;
		if (!DATE_RE.test(date) || !isCalendarDate(date)) continue;

		const url = extractUrl(urlCell);
		if (!url) continue;

		const search = searchFromUrl(url);
		if (!search) continue;

		const handle = HANDLE_RE.exec(name)?.[1] ?? null;
		entries.push({ name, handle, date, url, search, inputs: decodeInputs(search) });
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
