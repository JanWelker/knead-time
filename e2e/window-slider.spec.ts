import { expect, test } from '@playwright/test';
import {
	allStops,
	arrowCentreX,
	chosenWindow,
	dragTo,
	openRecipe,
	slider,
	thumbCentreX,
	windowCard
} from './helpers';

// Caputo Pizzeria (W 265): cold band tops out at 40 h, which is not one of the
// canonical stops — the case the ideal-as-its-own-stop work exists for.
const CAPUTO = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265';
const NAPOLETANA = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=310';
/** Far enough out that the flour's tolerance, not the deadline, is the limit. */
const FAR_BAKE = 'r=2026-09-06T17%3A00%3A00.000Z';

test('a decoded link reproduces its own window, without re-picking', async ({ page }) => {
	// The share-link contract: opening someone's recipe must not quietly rewrite
	// it to what this app would have chosen. 32 h is deliberately not the ideal.
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	expect(await chosenWindow(page)).toBe('32 h');
	await expect(windowCard(page).locator('[role="status"]')).toHaveCount(0);
});

test('the ideal window is a stop the slider can reach', async ({ page }) => {
	// The reported bug: the app picked the ideal on arrival, and once you dragged
	// away no slider position could return to it.
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-06');

	await expect.poll(() => chosenWindow(page)).toBe('40 h');
	expect(await allStops(page)).toContain('40 h');
});

test('the ideal marker names the same window the app picks', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-06');
	await expect.poll(() => chosenWindow(page)).toBe('40 h');

	await expect(windowCard(page)).toContainText('40 h');
	expect(await arrowCentreX(page, 'up')).not.toBeNull();
});

test('no ideal marker for a flour the rail cannot serve', async ({ page }) => {
	// Supermarket 00 tolerates 2–4 h at room temperature and cannot reach the
	// cold switch at all, so no slider position is inside its band.
	await openRecipe(page, `v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=180&${FAR_BAKE}`);

	expect(await arrowCentreX(page, 'up')).toBeNull();
});

test('dragging past the bake deadline is refused, out loud', async ({ page }) => {
	// Bake is ~34 h out, so the long stops would have to start before now.
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);

	const max = Number(await slider(page).getAttribute('max'));
	await dragTo(page, max);

	const alert = windowCard(page).locator('[role="alert"]');
	await expect(alert).toBeVisible();
	await expect(alert).toContainText('before now');

	// and the thumb comes back rather than sitting out in the greyed stretch,
	// which the bound value alone would not have forced
	expect(Number(await slider(page).inputValue())).toBeLessThan(max);
	await expect
		.poll(async () => Math.round((await thumbCentreX(page)) - (await arrowCentreX(page, 'down'))!))
		.toBeLessThanOrEqual(12);
});

test('a legal drag clears the refusal', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);
	const max = Number(await slider(page).getAttribute('max'));

	await dragTo(page, max);
	await expect(windowCard(page).locator('[role="alert"]')).toBeVisible();

	await dragTo(page, 1);
	await expect(windowCard(page).locator('[role="alert"]')).toHaveCount(0);
});

test('the ideal arrow sits on the thumb, at both ends of the rail', async ({ page }) => {
	// The alignment bug, twice over: first the rail used the wrong coordinate
	// system, then the edge pivot dragged the arrow along with its caption. Both
	// only showed away from the middle, so both ends are pinned here. The window
	// is read from the marker rather than hard-coded — what matters is that the
	// arrow lands on the thumb, whatever hour the ideal works out to.
	const arrowIsOnTheThumb = async () => {
		const arrow = await arrowCentreX(page, 'up');
		expect(arrow).not.toBeNull();
		expect(Math.abs(arrow! - (await thumbCentreX(page)))).toBeLessThanOrEqual(1);
	};

	await openRecipe(page, `${NAPOLETANA}&${FAR_BAKE}`);
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-06');
	// 72 h sits past the 88 % pivot threshold — an end-anchored caption
	await expect.poll(() => chosenWindow(page)).toBe('72 h');
	await arrowIsOnTheThumb();

	// now pull the bake in so the ideal lands near the left end instead
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-01');
	await page.locator('form input[type="time"]').nth(1).fill('20:00');
	await expect.poll(() => chosenWindow(page)).not.toBe('72 h');
	await arrowIsOnTheThumb();
});

test('the rail marker names a ceiling, not the bake moment', async ({ page }) => {
	// It used to reuse the form's "Ready to bake" label, which read as if the
	// arrow pointed at the bake itself rather than at the longest window it
	// allows. The moment stays on the line beneath.
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);

	const marker = windowCard(page).locator('div.absolute').filter({ hasText: 'Limit set by' });
	await expect(marker).toContainText('Limit set by ‘ready to bake’ time');
	await expect(marker).toContainText('Sep 2');
});

test('every marker caption stays inside the rail', async ({ page }) => {
	await openRecipe(page, `${NAPOLETANA}&r=2026-09-01T20%3A00%3A00.000Z`);

	const rail = await windowCard(page).locator('.overflow-hidden.rounded-full').boundingBox();
	for (const caption of await windowCard(page).locator('span.whitespace-nowrap').all()) {
		const box = await caption.boundingBox();
		if (!box) continue;
		expect(box.x).toBeGreaterThanOrEqual(rail!.x - 1);
		expect(box.x + box.width).toBeLessThanOrEqual(rail!.x + rail!.width + 1);
	}
});
