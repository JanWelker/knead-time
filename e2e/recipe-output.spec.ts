import { expect, test } from '@playwright/test';
import { card, NOW, openRecipe } from './helpers';

const BASE = 'n=6&b=280&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z';

test('no ingredient is weighed twice across the schedule', async ({ page }) => {
	// PR #182: the mix step used to repeat prep's whole ingredient list, so the
	// baker weighed the flour twice. With no pre-ferment there is exactly one
	// weighing of each thing, on exactly one step.
	await openRecipe(page, `v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	const schedule = card(page, 'Schedule');
	for (const name of [/^Flour$/, /^Water$/, /^Salt$/]) {
		await expect(schedule.locator('span').filter({ hasText: name })).toHaveCount(1);
	}
});

test('oil and sugar rows appear only when the recipe uses them', async ({ page }) => {
	await openRecipe(page, `v=6&${BASE}`);
	const ingredients = card(page, 'Ingredients');
	await expect(ingredients).not.toContainText('Oil');
	await expect(ingredients).not.toContainText('Sugar');

	await openRecipe(page, `v=6&${BASE}&o=3&sg=1`);
	await expect(card(page, 'Ingredients')).toContainText('Oil');
	await expect(card(page, 'Ingredients')).toContainText('Sugar');
});

test('a pre-ferment carries all the fresh yeast, none on baking day', async ({ page }) => {
	await openRecipe(page, `v=6&${BASE}&p=b30&sa=2026-09-04T09%3A00%3A00.000Z`);

	const ingredients = card(page, 'Ingredients');
	await expect(ingredients).toContainText('Biga');
	await expect(ingredients).toContainText('Totals');
	// the main-dough section hides its yeast row; the totals row surfaces it
	const mainDough = ingredients.locator('table').nth(1);
	await expect(mainDough).not.toContainText('yeast');
});

test('"Round numbers" lands the flour on a tidy figure and is idempotent', async ({ page }) => {
	await openRecipe(page, `v=6&n=6&b=283.5&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z`);

	const round = page.locator('button:has-text("Round numbers")');
	await round.click();
	const ballAfterFirst = await page
		.locator('form label', { hasText: 'Ball weight' })
		.locator('input')
		.inputValue();

	const flour = await card(page, 'Ingredients')
		.locator('tr', { hasText: 'Flour' })
		.first()
		.innerText();
	const grams = Number(flour.replace(/[^\d.]/g, ''));
	expect(grams % 50).toBe(0);

	// second click is a no-op — the snap must not creep
	await round.click();
	await expect(page.locator('form label', { hasText: 'Ball weight' }).locator('input')).toHaveValue(
		ballAfterFirst
	);
});

test('a pre-v5 link reproduces its original no-autolyse recipe', async ({ page }) => {
	// The version gate: `al` is absent from old links and must read as OFF,
	// or every bookmark silently gains a rest step it never had.
	await openRecipe(page, `v=4&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await expect(card(page, 'Schedule')).not.toContainText('Autolyse');

	await openRecipe(page, `v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await expect(card(page, 'Schedule')).toContainText('Autolyse');
});

test('a pre-v6 link claims no flour it was never made with', async ({ page }) => {
	await openRecipe(page, `v=5&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	await expect(page.locator('form select').first()).toHaveValue('none');
});

test('the print route renders the same recipe as the screen', async ({ page }) => {
	// issue #191: print is its own SSR route and had drifted from the screen.
	await page.clock.install({ time: NOW });
	// the route auto-calls window.print() on mount; stub it so the run is headless-safe
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/print/en?v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	await expect(page.locator('body')).toContainText('Flour');
	await expect(page.locator('body')).toContainText('Water');
	await expect(page.locator('body')).toContainText('Salt');
	await expect(page.locator('body')).toContainText('Weigh & prep');
});
