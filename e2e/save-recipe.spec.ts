import { expect, test } from '@playwright/test';
import { card, openRecipe } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

async function openSaveDialog(page: import('@playwright/test').Page) {
	await page.locator('summary').filter({ hasText: 'Actions' }).click();
	await page.getByRole('menuitem', { name: 'Save recipe' }).click();
	return page.getByRole('dialog', { name: 'Save recipe' });
}

// "Save recipe" asked for a name through window.prompt: native chrome in an app
// translated into five languages, unstyled in either theme, and blocking. If it
// ever comes back, this fails — a prompt() would make the dialog never appear.
test('naming a recipe happens in the app, not in a browser prompt', async ({ page }) => {
	await openRecipe(page, RECIPE);
	// A prompt() would block the run outright; refuse it so the failure is a
	// readable assertion rather than a timeout.
	let prompted = false;
	page.on('dialog', async (d) => {
		prompted = true;
		await d.dismiss();
	});

	const dialog = await openSaveDialog(page);
	await expect(dialog).toBeVisible();
	expect(prompted, 'a native prompt() was opened').toBe(false);

	// The field is focused on open — it is the only reason the dialog exists.
	await expect(dialog.locator('input[type="text"]')).toBeFocused();
	// ...and Save is refused until it has something to save.
	await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();

	await dialog.locator('input[type="text"]').fill('Saturday dough');
	await dialog.getByRole('button', { name: 'Save' }).click();

	await expect(dialog).not.toBeVisible();
	await expect(card(page, 'My recipes')).toContainText('Saturday dough');
});

test('cancelling saves nothing, and Escape does the same', async ({ page }) => {
	await openRecipe(page, RECIPE);

	let dialog = await openSaveDialog(page);
	await dialog.locator('input[type="text"]').fill('Discard me');
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(card(page, 'My recipes')).not.toContainText('Discard me');

	// A native <dialog> gives Escape for free; pin it so a future refactor to a
	// hand-rolled overlay cannot quietly drop it.
	dialog = await openSaveDialog(page);
	await dialog.locator('input[type="text"]').fill('Also discard');
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(card(page, 'My recipes')).not.toContainText('Also discard');
});
