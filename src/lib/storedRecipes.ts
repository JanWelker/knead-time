// Device-local recipe memory: the last recipe worked on (restored on a fresh
// visit so the app doesn't forget its regulars) and a small named recipe book.
// Both store encoded share-URL query strings — the same format links use, so
// decodeInputs is the single reader.

export const LAST_RECIPE_KEY = 'kneadtime:lastRecipe';
export const RECIPES_KEY = 'kneadtime:recipes';

export interface SavedRecipe {
	name: string;
	// Share-URL query string (without the leading '?').
	search: string;
	// ISO timestamp of the save.
	savedAt: string;
}

export function loadLastRecipe(storage: Storage | null | undefined): string | null {
	if (!storage) return null;
	const raw = storage.getItem(LAST_RECIPE_KEY);
	return raw ? raw : null;
}

export function saveLastRecipe(storage: Storage | null | undefined, search: string): void {
	if (!storage) return;
	storage.setItem(LAST_RECIPE_KEY, search);
}

function isSavedRecipe(value: unknown): value is SavedRecipe {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.name === 'string' && typeof v.search === 'string' && typeof v.savedAt === 'string'
	);
}

export function loadRecipes(storage: Storage | null | undefined): SavedRecipe[] {
	if (!storage) return [];
	const raw = storage.getItem(RECIPES_KEY);
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isSavedRecipe);
	} catch {
		// Malformed storage (manual edits, other-tab corruption) — start clean
		// rather than break the page.
		return [];
	}
}

// Saves (or overwrites, by name) a recipe and returns the updated list,
// newest first.
export function saveRecipe(
	storage: Storage | null | undefined,
	recipe: SavedRecipe
): SavedRecipe[] {
	const next = [recipe, ...loadRecipes(storage).filter((r) => r.name !== recipe.name)];
	if (storage) storage.setItem(RECIPES_KEY, JSON.stringify(next));
	return next;
}

export function deleteRecipe(storage: Storage | null | undefined, name: string): SavedRecipe[] {
	const next = loadRecipes(storage).filter((r) => r.name !== name);
	if (storage) storage.setItem(RECIPES_KEY, JSON.stringify(next));
	return next;
}
