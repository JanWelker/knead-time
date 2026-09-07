import { expect, test } from '@playwright/test';
import { chooseInMenu, currentView, NOW, openAdjust, sheet, waitForHydration } from './helpers';

// Beginner/expert and short/detailed are resolved from three sources in a fixed
// order (URL → recipe params → localStorage → default) and persisted only on an
// explicit toggle. None of that is reachable from a unit test: the resolution
// runs in `onMount` against real storage.

const RECIPE = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-06T17%3A00%3A00.000Z';

// Every mode assertion below is about which fields the recipe sheet offers, so
// each visit opens it. A bare visit lands on the first question, not the plan,
// so it is walked to the plan first.
async function open(page: import('@playwright/test').Page, query = '') {
	await page.clock.install({ time: NOW });
	await page.goto(query ? `/?${query}` : '/');
	await waitForHydration(page);
	if ((await currentView(page)) === 'ask') {
		await page.getByRole('button', { name: 'Skip to the plan' }).click();
	}
	await openAdjust(page);
}

const expertToggle = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: 'Show all options (expert)' });
const beginnerToggle = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: 'Back to the simple view' });
const field = (page: import('@playwright/test').Page, label: string | RegExp) =>
	sheet(page).locator('label', { hasText: label });

test('a bare visit lands in beginner, showing only the everyday inputs', async ({ page }) => {
	await open(page);

	await expect(expertToggle(page)).toBeVisible();
	await expect(field(page, 'Pizzas')).toBeVisible();
	await expect(field(page, 'Flour').first()).toBeVisible();
	// expert-only fields stay out of the way
	await expect(field(page, /Hydration \(%\)/)).toHaveCount(0);
	await expect(field(page, 'Ball weight')).toHaveCount(0);
	await expect(field(page, 'Fridge temperature')).toHaveCount(0);
});

test('a link carrying recipe params opens in expert', async ({ page }) => {
	await open(page, RECIPE);

	await expect(beginnerToggle(page)).toBeVisible();
	await expect(field(page, /Hydration \(%\)/)).toBeVisible();
});

test('md=b forces beginner even with a full recipe attached', async ({ page }) => {
	await open(page, `md=b&${RECIPE}`);

	await expect(expertToggle(page)).toBeVisible();
	await expect(field(page, /Hydration \(%\)/)).toHaveCount(0);
});

test('utm-only junk behaves like a bare visit, not a recipe link', async ({ page }) => {
	// issue #201: stray campaign params must not be mistaken for a recipe.
	await open(page, 'utm_source=newsletter&utm_medium=email&fbclid=abc123');

	await expect(expertToggle(page)).toBeVisible();
});

test('only an explicit toggle is remembered', async ({ page }) => {
	await open(page);
	await expertToggle(page).click();
	await expect(beginnerToggle(page)).toBeVisible();
	expect(await page.evaluate(() => localStorage.getItem('kneadtime:mode'))).toBe('expert');

	// the choice survives a reload with no params
	await open(page);
	await expect(beginnerToggle(page)).toBeVisible();
});

test("opening someone's beginner link never overwrites your own preference", async ({ page }) => {
	await open(page);
	await expertToggle(page).click();
	expect(await page.evaluate(() => localStorage.getItem('kneadtime:mode'))).toBe('expert');

	await open(page, `md=b&${RECIPE}`);
	await expect(expertToggle(page)).toBeVisible(); // their link wins for this visit
	expect(await page.evaluate(() => localStorage.getItem('kneadtime:mode'))).toBe('expert');

	await open(page); // ...and yours is still there afterwards
	await expect(beginnerToggle(page)).toBeVisible();
});

test('the schedule verbosity toggle shows and hides the step explanations', async ({ page }) => {
	await open(page, RECIPE);
	await page.getByRole('button', { name: 'Done', exact: true }).click();

	const detail = page.locator('ol li p');
	const before = await detail.count();

	await chooseInMenu(page, 'Short');
	const short = await detail.count();
	expect(short).toBeLessThan(before);

	await chooseInMenu(page, 'Detailed');
	await expect.poll(() => detail.count()).toBe(before);
});

test('verbosity is a device preference, not part of the share URL', async ({ page }) => {
	await open(page, RECIPE);
	await page.getByRole('button', { name: 'Done', exact: true }).click();
	await chooseInMenu(page, 'Short');

	expect(await page.evaluate(() => localStorage.getItem('kneadtime:scheduleVerbosity'))).toBe(
		'short'
	);
	// nothing about reading preference belongs in a recipe someone else opens
	expect(page.url()).not.toContain('verbos');
	expect(new URL(page.url()).searchParams.has('sv')).toBe(false);
});
