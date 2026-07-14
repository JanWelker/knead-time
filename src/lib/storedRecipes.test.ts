import { describe, expect, it } from 'vitest';
import { makeStorage } from './storageFixtures';
import {
	deleteRecipe,
	LAST_RECIPE_KEY,
	loadLastRecipe,
	loadRecipes,
	RECIPES_KEY,
	saveLastRecipe,
	saveRecipe,
	type SavedRecipe
} from './storedRecipes';

const recipe = (name: string, search = 'v=4&n=6&b=280'): SavedRecipe => ({
	name,
	search,
	savedAt: '2026-07-14T12:00:00.000Z'
});

describe('last recipe', () => {
	it('round-trips the encoded query string', () => {
		const storage = makeStorage();
		saveLastRecipe(storage, 'v=4&n=6');
		expect(loadLastRecipe(storage)).toBe('v=4&n=6');
	});

	it('returns null when empty or unavailable', () => {
		expect(loadLastRecipe(makeStorage())).toBeNull();
		expect(loadLastRecipe(makeStorage({ [LAST_RECIPE_KEY]: '' }))).toBeNull();
		expect(loadLastRecipe(null)).toBeNull();
		expect(() => saveLastRecipe(null, 'v=4')).not.toThrow();
	});
});

describe('recipe book', () => {
	it('saves newest-first and round-trips through storage', () => {
		const storage = makeStorage();
		saveRecipe(storage, recipe('Friday classic'));
		const list = saveRecipe(storage, recipe('High hydration'));
		expect(list.map((r) => r.name)).toEqual(['High hydration', 'Friday classic']);
		expect(loadRecipes(storage).map((r) => r.name)).toEqual(['High hydration', 'Friday classic']);
	});

	it('overwrites an existing name instead of duplicating it', () => {
		const storage = makeStorage();
		saveRecipe(storage, recipe('Friday classic', 'v=4&n=4'));
		const list = saveRecipe(storage, recipe('Friday classic', 'v=4&n=8'));
		expect(list).toHaveLength(1);
		expect(list[0].search).toBe('v=4&n=8');
	});

	it('deletes by name', () => {
		const storage = makeStorage();
		saveRecipe(storage, recipe('A'));
		saveRecipe(storage, recipe('B'));
		expect(deleteRecipe(storage, 'A').map((r) => r.name)).toEqual(['B']);
		expect(loadRecipes(storage)).toHaveLength(1);
	});

	it('starts clean on malformed or foreign storage content', () => {
		expect(loadRecipes(makeStorage({ [RECIPES_KEY]: 'not json' }))).toEqual([]);
		expect(loadRecipes(makeStorage({ [RECIPES_KEY]: '{"a":1}' }))).toEqual([]);
		expect(loadRecipes(makeStorage({ [RECIPES_KEY]: '[{"name":1}]' }))).toEqual([]);
		expect(loadRecipes(makeStorage({ [RECIPES_KEY]: 'null' }))).toEqual([]);
		expect(loadRecipes(makeStorage({ [RECIPES_KEY]: '[null, "x", 4]' }))).toEqual([]);
	});

	it('is storage-less safe', () => {
		expect(loadRecipes(null)).toEqual([]);
		expect(saveRecipe(null, recipe('A'))).toHaveLength(1);
		expect(deleteRecipe(undefined, 'A')).toEqual([]);
	});
});
