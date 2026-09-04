import { expect, test } from '@playwright/test';
import { openRecipe, slider, windowCard } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// Three things the app did without telling anyone. All of them are live-region
// behaviour, which no unit test can see and no screenshot shows.

// A live region created by the same {#if} that produces its first message is
// not announced by most screen readers — the same trap the schedule warnings
// were in. Both of these have to exist while there is still nothing to say.
test('the status regions exist before they have anything to say', async ({ page }) => {
	await openRecipe(page, RECIPE);

	// #share-status, not any p[role=status] in the card — the TRMNL dialog is
	// mounted inside this card too and has a status region of its own.
	const copyStatus = page.locator('#share-status');
	await expect(copyStatus).toHaveCount(1);
	await expect(copyStatus).toHaveText('');

	await page.locator('summary').filter({ hasText: 'Actions' }).click();
	await page.getByRole('menuitem', { name: 'Send to TRMNL…' }).click();
	const sendStatus = page.locator('dialog p[role="status"]');
	await expect(sendStatus).toHaveCount(1);
	await expect(sendStatus).toHaveText('');
});

// The clipboard rejection used to be swallowed on the grounds that the URL is
// in the address bar anyway. True, but the user pressed a button and got no
// reason to think it had done nothing.
test('a refused clipboard says so instead of doing nothing', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText: () => Promise.reject(new Error('denied')) }
		});
	});
	await openRecipe(page, RECIPE);

	await page.locator('summary').filter({ hasText: 'Actions' }).click();
	await page.getByRole('menuitem', { name: 'Copy share link' }).click();

	const status = page.locator('#share-status');
	await expect(status).toContainText('address bar');
	// and it is visible, not only announced — a refusal has no other signal
	await expect(status).toBeVisible();
});

// A dialog with no accessible name is announced as just "dialog".
test('the TRMNL dialog is named by its own heading', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await page.locator('summary').filter({ hasText: 'Actions' }).click();
	await page.getByRole('menuitem', { name: 'Send to TRMNL…' }).click();

	await expect(
		page.getByRole('dialog', { name: 'Send recipe to your TRMNL device' })
	).toBeVisible();
});

// Everything on the rail that says whether a window is a GOOD one is
// aria-hidden decoration, so the slider announced a duration and nothing else.
test('the slider is described by the words that judge the window', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const ids = await slider(page).getAttribute('aria-describedby');
	expect(ids).toBe('window-band window-benefit');
	// Both targets exist and carry the judgement, not just decoration.
	await expect(windowCard(page).locator('#window-band')).toContainText('tolerates');
	await expect(windowCard(page).locator('#window-benefit')).not.toHaveText('');
});
