import { expect, test } from '@playwright/test';
import {
	currentView,
	detailToggle,
	openAdjust,
	openMenu,
	openRecipe,
	sheet,
	waitForHydration
} from './helpers';

// Beginner/expert and short/detailed are resolved from three sources in a fixed
// order (URL → recipe params → localStorage → default) and persisted only on an
// explicit toggle. None of that is reachable from a unit test: the resolution
// runs in `onMount` against real storage.

const RECIPE = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-06T17%3A00%3A00.000Z';

// Every mode assertion below is about which fields the recipe sheet offers, so
// each visit opens it. A bare visit lands on the first question, not the plan,
// so it is walked to the plan first.
async function open(page: import('@playwright/test').Page, query = '') {
	await openRecipe(page, query);
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

	// RECIPE is an eight-step cold schedule (prep, autolyse, mix, room bulk,
	// cold bulk, divide, final proof, ready). Every step carries its method
	// paragraph; the detailed level adds one explanation paragraph per step.
	// The counts are pinned rather than compared: `short < before` held with
	// one explanation of eight dropped, and would hold with the method copy
	// hidden too.
	const detail = page.locator('ol li p');
	const toggle = detailToggle(page);
	await expect(detail).toHaveCount(16);
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');

	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await expect(detail).toHaveCount(8);

	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await expect(detail).toHaveCount(16);
});

test('verbosity is a device preference, not part of the share URL', async ({ page }) => {
	await open(page, RECIPE);
	await page.getByRole('button', { name: 'Done', exact: true }).click();
	await detailToggle(page).click();

	expect(await page.evaluate(() => localStorage.getItem('kneadtime:scheduleVerbosity'))).toBe(
		'short'
	);
	// nothing about reading preference belongs in a recipe someone else opens
	expect(page.url()).not.toContain('verbos');
	expect(new URL(page.url()).searchParams.has('sv')).toBe(false);
});

// Short/detailed used to be a radio pair in the plan's menu: three taps away
// from the card it changes, and found by nobody (issue #436). It is one
// pressed/unpressed button on the schedule's own header band now, left of
// `Remind me`, and the menu no longer carries it — two doors to one reading
// preference is how the old one went unseen. The reload half is what proves
// the band's button goes through the singleton's set() rather than flipping a
// local copy: a toggle that only re-rendered would come back detailed.
test('the detail toggle sits on the schedule band and survives a reload', async ({ page }) => {
	await openRecipe(page, RECIPE);
	const band = page.locator('section.card-loud .card-header');
	const toggle = detailToggle(page);
	const remind = band.getByRole('button', { name: /Remind me/ });
	await expect(toggle).toBeVisible();
	await expect(remind).toBeVisible();
	const t = (await toggle.boundingBox())!;
	const r = (await remind.boundingBox())!;
	// left of the plaque, on the same line
	expect(t.x + t.width).toBeLessThanOrEqual(r.x);
	expect(Math.abs(t.y - r.y)).toBeLessThan(2);

	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');

	await page.reload();
	await waitForHydration(page);
	await expect(detailToggle(page)).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('ol li p')).toHaveCount(8);

	const menu = await openMenu(page);
	await expect(menu.getByText('Detailed', { exact: true })).toHaveCount(0);
	await expect(menu.getByText('Short', { exact: true })).toHaveCount(0);
});

// The band carries a heading and two plaques, which do not all fit on one line
// at 390 px in German or French. Wrapping item by item put `Erinnere mich`
// alone at the left edge under the heading, the toggle still up beside it; the
// two plaques wrap as one group, right-aligned, and nothing leaves the page.
test('the schedule band wraps its two plaques together on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.addInitScript(() => localStorage.setItem('kneadtime:locale', 'de'));
	await openRecipe(page, RECIPE);
	const band = page.locator('section.card-loud .card-header');
	const [toggle, remind] = [band.getByRole('button').nth(0), band.getByRole('button').nth(1)];
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	const t = (await toggle.boundingBox())!;
	const r = (await remind.boundingBox())!;
	const b = (await band.boundingBox())!;
	expect(Math.abs(t.y - r.y)).toBeLessThan(2);
	expect(t.x + t.width).toBeLessThanOrEqual(r.x);
	// right-aligned: the plaque ends where the band's padding begins
	expect(b.x + b.width - (r.x + r.width)).toBeLessThan(28);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
