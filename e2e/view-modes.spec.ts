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

// The plan is the one surface where nothing is an input, and the row of blanks
// on it is the same at both view modes (issue #315). Expert used to append
// hydration, salt and room temperature to it, so the same share link rendered a
// three-chip plan for one reader and a six-chip plan for another, off a device
// preference that is not in the URL. Nothing but a browser can see this: the row
// is derived at render time from a runtime singleton, and its membership had no
// test at all — grepping e2e/ for `.chip-field` found nothing.
test('the plan carries the same blanks in expert as in beginner', async ({ page }) => {
	async function chipLabels() {
		await waitForHydration(page);
		expect(await currentView(page)).toBe('plan');
		// textContent, not innerText: `.label-caps` sets the caps in CSS, and a
		// rendered-text read would pin the type treatment alongside the membership.
		return page.locator('.chip-field .label-caps').allTextContents();
	}

	await page.clock.install({ time: NOW });
	await page.goto(`/?${RECIPE}`);
	const expert = await chipLabels();

	await page.goto(`/?md=b&${RECIPE}`);
	const beginner = await chipLabels();

	// Named, not merely equal: two empty rows would also match each other, and
	// the point is which four values the ticket puts within one press.
	expect(expert).toEqual(['Pizzas', 'Fermentation window', 'Flour', 'Mixing']);
	expect(beginner).toEqual(expert);
});

// Mixing is on the ticket because it is part of the recipe, not a preference:
// spiral, stand and hand are 15, 20 and 25 minutes of mixing at 24, 18 and 5 °C
// of friction, so the answer moves the mix step, the water temperature and the
// solved yeast with it. A plan that does not say which mixer it assumed is a
// plan whose knead time cannot be checked — and the blank has to reach the
// field that sets it, which is only true if the sheet still carries that id.
test('the plan names the mixer, and the blank opens the field that sets it', async ({ page }) => {
	await page.clock.install({ time: NOW });
	await page.goto(`/?${RECIPE}&mm=h`);
	await waitForHydration(page);

	const chip = page.getByRole('button', { name: /Mixing/ });
	await expect(chip).toContainText('By hand');
	// ...and the schedule behind it is the hand-kneading one, not the default.
	await expect(page.getByText('25 min', { exact: false }).first()).toBeVisible();

	await chip.click();
	await expect(sheet(page)).toBeVisible();
	await expect(page.locator('#field-mixingMethod')).toBeFocused();
});
