import { expect, test } from '@playwright/test';
import { NOW, currentView, openAdjust, openLibrary, sheet, waitForHydration } from './helpers';

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
	// Which route to take is the first question, because its answer decides
	// which of the rest are asked at all (issue #316).
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'How much do you want to decide?'
	);
	expect(new URL(page.url()).hash).toBe('#ask/mode');
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

	await openLibrary(page);
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

	await openLibrary(page);
	await page.getByRole('button', { name: 'Back to your plan', exact: true }).click();
	await page.getByRole('button', { name: 'Guide me' }).click();
	expect(await currentView(page)).toBe('ask');

	expect(recipeOf()).toBe(before);
	expect(new URL(page.url()).searchParams.has('view')).toBe(false);
});

// The question flow used to carry a running "your plan so far" stub beside the
// question. Below `lg` it stacked *under* it, so on a phone — the width this
// flow is written for — a visitor met a block of figures about a recipe they
// had not started yet, and the control they were being asked to use was off
// screen. What shows the consequence now is the copy under each question.
test('the first question puts its control on a phone screen, not below one', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 780 });
	await open(page, '', '#ask/mode');

	const control = page.getByRole('radio', { name: /^Advanced/ });
	const box = (await control.boundingBox())!;
	expect(box.y + box.height).toBeLessThan(780);
	// And nothing on the page reaches sideways past the trimmed edge.
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
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

// The masthead had grown to five groups and eleven boxes — two pill strips for
// language and theme, plus Recipes, Actions and Edit recipe — which read as
// debris and left nothing looking primary. It is one dropdown now, and each
// control that left it went to the thing it acts on rather than to another row.
test('the plan masthead is the sign and nothing else', async ({ page }) => {
	await open(page, RECIPE);

	// The menu and the edit button both act on this recipe, so both sit with it
	// under the flag. The wordmark is plain text on the plan — a control that
	// goes where you already are is a dead control — which leaves the row empty
	// of controls entirely. The two views with no such block (the questions, the
	// library) still carry the menu here; `language and theme are reachable from
	// every view` is what holds that.
	const header = page.locator('header').first();
	await expect(header.getByRole('button')).toHaveCount(0);
	await expect(header.locator('summary')).toHaveCount(0);
});

test('each control sits with what it acts on', async ({ page }) => {
	await open(page, RECIPE);

	// Edit recipe opens every blank at once, so it belongs with the blanks and
	// the line that says they can be edited — not in the masthead, where it was
	// the loudest thing on the page and a long way from anything it changes.
	const edit = page.getByRole('button', { name: 'Edit recipe', exact: true });
	await expect(edit).toBeVisible();
	await expect(page.locator('header').first().getByRole('button')).toHaveCount(0);

	// The mode seal and the fit seal are facts about the schedule, so they sit
	// inside its card, on the lede line that explains the mode. There used to be
	// a strip between the plan header and the card holding whichever control had
	// not found a home yet.
	const card = page.locator('section.card-loud').filter({ hasText: 'Schedule' });
	await expect(card.getByText('Cold ferment', { exact: true })).toBeVisible();
	// Two seals, and each one opens what its mark means — the mode's sentence and
	// the fit's factors read the same way rather than one being prose on the page
	// and the other a disclosure.
	await expect(card.locator('summary')).toHaveCount(2);
	await card.locator('summary').first().click();
	await expect(card.getByText('Long fridge phase', { exact: false })).toBeVisible();
	// How much the steps explain is a reading preference, like the language and
	// the theme, so it is a choice in the menu rather than a switch on the band.
	await expect(page.getByRole('menuitemradio', { name: 'Detailed' })).toHaveCount(0);

	// And the sentence explaining the mode is the schedule's lede, inside the
	// card under the stamp that names it — not stranded above the card.
	await expect(card.getByText('Long fridge phase', { exact: false })).toBeVisible();
});

test('language and theme are reachable from every view', async ({ page }) => {
	// They are device preferences, not plan actions. Folding them into a menu
	// the *view* fills is exactly how they would come to exist on the plan and
	// nowhere else — which is the bug this pins, not the styling.
	for (const hash of ['#plan', '#ask/when', '#library']) {
		await open(page, RECIPE, hash);
		await page.locator('summary').filter({ hasText: 'Menu' }).click();
		await expect(page.getByRole('menuitemradio', { name: 'Deutsch', exact: true })).toBeVisible();
		await expect(
			page.getByRole('menuitemradio', { name: 'Dark theme', exact: true })
		).toBeVisible();
		await page.keyboard.press('Escape');
	}
});
