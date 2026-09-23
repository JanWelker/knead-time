import { expect, test } from '@playwright/test';
import { openAdjust, openMenu, openRecipe, slider, windowCard } from './helpers';

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

	await openMenu(page);
	await page.getByRole('menuitem', { name: 'Send to TRMNL…' }).click();
	// By the open dialog, not "any dialog": the adjust sheet is in the page too
	// and now carries a status region of its own (the window slider's), which
	// is the whole point of the test below.
	const sendStatus = page.locator('dialog[open] p[role="status"]');
	await expect(sendStatus).toHaveCount(1);
	await expect(sendStatus).toHaveText('');
});

// Same trap again, in the one control where the message is the only report of
// something the app did on the user's behalf: a longer window can only push the
// start earlier, and past a point onto a different date. The notice saying so
// was created by the same {#if} that filled it, so it announced nothing —
// while the rest of the card is aria-hidden decoration and the readout only
// counts hours, leaving a screen-reader user with no signal that the day moved.
test('the window slider says the start moved to another day, out loud', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	// Present and silent before there is anything to report.
	const moved = windowCard(page).locator('[role="status"]');
	await expect(moved).toHaveCount(1);
	await expect(moved).toHaveText('');

	// Six stops to the right of a start already on the bake's own eve: far
	// enough that the window reaches back across midnight.
	const rail = slider(page);
	await rail.focus();
	for (let i = 0; i < 6; i++) await rail.press('ArrowRight');

	// Same node, now carrying the message — an update inside a live region that
	// was already there, which is what a screen reader actually announces.
	await expect(moved).toContainText('different day');
	await expect(moved).toBeVisible();
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

	await openMenu(page);
	await page.getByRole('menuitem', { name: 'Copy share link' }).click();

	const status = page.locator('#share-status');
	await expect(status).toContainText('address bar');
	// and it is visible, not only announced — a refusal has no other signal
	await expect(status).toBeVisible();
});

// A dialog with no accessible name is announced as just "dialog".
test('the TRMNL dialog is named by its own heading', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openMenu(page);
	await page.getByRole('menuitem', { name: 'Send to TRMNL…' }).click();

	await expect(
		page.getByRole('dialog', { name: 'Send recipe to your TRMNL device' })
	).toBeVisible();
});

// Everything on the rail that says whether a window is a GOOD one is
// aria-hidden decoration, so the slider announced a duration and nothing else.
test('the slider is described by the words that judge the window', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	const ids = await slider(page).getAttribute('aria-describedby');
	expect(ids).toBe('window-band window-benefit');
	// Both targets exist and carry the judgement, not just decoration.
	await expect(windowCard(page).locator('#window-band')).toContainText('tolerates');
	await expect(windowCard(page).locator('#window-benefit')).not.toHaveText('');
});
