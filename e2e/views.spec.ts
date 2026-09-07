import { expect, test } from '@playwright/test';
import { currentView, NOW, openAdjust, sheet, waitForHydration } from './helpers';

// The app is three places now — the questions, the plan, the collections — and
// which one is on screen lives in the URL fragment. None of that is reachable
// from a unit test: the view is resolved in `onMount` against the real URL and
// real storage, and the rules below are exactly the ones a restructure like
// this gets wrong.

const RECIPE = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-06T17%3A00%3A00.000Z';

async function open(page: import('@playwright/test').Page, query = '', hash = '') {
	await page.clock.install({ time: NOW });
	await page.goto(`/${query ? `?${query}` : ''}${hash}`);
	await waitForHydration(page);
}

test('a share link goes straight to the plan, never through the questions', async ({ page }) => {
	// The fatal failure mode of a question flow: making a returning baker answer
	// it again. Anyone who arrives carrying a recipe is already past that.
	await open(page, RECIPE);

	expect(await currentView(page)).toBe('plan');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Ready to bake');
});

test('a genuinely fresh visit is asked the first question', async ({ page }) => {
	await open(page);

	expect(await currentView(page)).toBe('ask');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('When are you eating?');
	expect(new URL(page.url()).hash).toBe('#ask/when');
});

test('a remembered recipe also lands on the plan', async ({ page }) => {
	// Recipe memory means a second visit is not a fresh one, even with a bare
	// URL: the baker has a dough in progress and wants to see it, not re-answer.
	await page.addInitScript(() => {
		localStorage.setItem('kneadtime:lastRecipe', 'v=6&n=9&b=280&h=70&s=3&y=f&t=22&ft=4');
	});
	await open(page);

	expect(await currentView(page)).toBe('plan');
});

test('the view survives a reload and the back button walks it', async ({ page }) => {
	await open(page, RECIPE);

	await page.getByRole('button', { name: 'Recipes', exact: true }).click();
	expect(await currentView(page)).toBe('library');
	expect(new URL(page.url()).hash).toBe('#library');

	// Linkable and reload-proof: the fragment is the whole of the view state.
	await page.reload();
	await waitForHydration(page);
	expect(await currentView(page)).toBe('library');

	await page.goBack();
	await expect.poll(() => currentView(page)).toBe('plan');
	await page.goForward();
	await expect.poll(() => currentView(page)).toBe('library');
});

test('the recipe query is untouched by every move between views', async ({ page }) => {
	// The fragment carries the place; the query carries the recipe, and it stays
	// the authoritative, shareable half. A view key in the query would have
	// changed what `hasRecipeParams` counts as a recipe link.
	await open(page, RECIPE);
	const recipeOf = () => {
		const p = new URL(page.url()).searchParams;
		p.delete('sa');
		p.delete('r');
		return p.toString();
	};
	const before = recipeOf();

	for (const name of ['Recipes', 'Back to your plan'] as const) {
		await page.getByRole('button', { name, exact: true }).click();
	}
	await page.getByRole('button', { name: 'Plan another bake' }).click();
	expect(await currentView(page)).toBe('ask');

	expect(recipeOf()).toBe(before);
	expect(new URL(page.url()).searchParams.has('view')).toBe(false);
});

test('answering a question moves the plan forming beside it', async ({ page }) => {
	// A sequence of questions that shows no consequence is a survey. The glance
	// beside the question is what stops this being one.
	await open(page, '', '#ask/pizzas');

	const flour = page
		.locator('aside dl > div')
		.filter({ has: page.getByText('Flour', { exact: true }) })
		.locator('dd');
	const before = await flour.innerText();

	await page.getByRole('button', { name: 'One more' }).click();
	await expect.poll(() => flour.innerText()).not.toBe(before);
});

test('the last question hands over to the plan', async ({ page }) => {
	await open(page, '', '#ask/method');

	await page.getByRole('button', { name: 'See the plan' }).click();
	expect(await currentView(page)).toBe('plan');
});

test('tapping a value in the plan opens the sheet with that field focused', async ({ page }) => {
	// The plan is not a form, but every value on it is editable in place — one
	// press, and the field you pointed at has the cursor. Without the focus
	// hand-off this is just a button that opens twenty fields.
	await open(page, RECIPE);

	await page.getByRole('button', { name: /Pizzas/ }).click();
	await expect(sheet(page)).toBeVisible();
	await expect(page.locator('#field-pizzaCount')).toBeFocused();
});

test('the sheet closes on Escape and on a click outside it', async ({ page }) => {
	await open(page, RECIPE);

	await openAdjust(page);
	await page.keyboard.press('Escape');
	await expect(sheet(page)).toHaveCount(0);

	await openAdjust(page);
	// The backdrop of a modal <dialog> receives the click as the dialog itself.
	await page.mouse.click(20, 400);
	await expect(sheet(page)).toHaveCount(0);
});
