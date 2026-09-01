import { expect, test } from '@playwright/test';
import { NOW, waitForHydration } from './helpers';

// Everything here is a fix that already shipped once. Each has a bug number
// because each was found in a browser and could only ever have been found there.

const MINE = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-06T17%3A00%3A00.000Z';
const THEIRS = 'v=6&n=4&b=250&h=65&s=2.5&y=f&t=20&ft=5&fw=310&r=2026-09-06T17%3A00%3A00.000Z';

async function open(page: import('@playwright/test').Page, query = '') {
	await page.clock.install({ time: NOW });
	await page.goto(query ? `/?${query}` : '/');
	await waitForHydration(page);
}

const remembered = (page: import('@playwright/test').Page) =>
	page.evaluate(() => localStorage.getItem('kneadtime:lastRecipe'));

test('merely opening someone else’s link never overwrites your recipe memory', async ({ page }) => {
	// issue #201. The saved recipe is snapshotted at hydration and the save is
	// skipped while it still matches, so a visit alone must leave it untouched.
	await open(page, MINE);
	await page.locator('form label', { hasText: 'Pizzas' }).locator('input').fill('7');
	await expect.poll(() => remembered(page)).toContain('n=7');
	const mine = await remembered(page);

	await open(page, THEIRS);
	expect(await remembered(page)).toBe(mine);
});

test('a real edit does update the memory, and a bare visit restores it', async ({ page }) => {
	await open(page, MINE);
	await page.locator('form label', { hasText: 'Pizzas' }).locator('input').fill('9');
	await expect.poll(() => remembered(page)).toContain('n=9');

	await open(page);
	await expect(page.locator('form label', { hasText: 'Pizzas' }).locator('input')).toHaveValue('9');
});

test('the restored memory keeps the recipe but not its stale dates', async ({ page }) => {
	await open(page, MINE);
	await page.locator('form label', { hasText: 'Pizzas' }).locator('input').fill('5');
	await expect.poll(() => remembered(page)).toContain('n=5');

	await open(page);
	// today's default bake time, not the one baked into the remembered query
	await expect(page.locator('form input[type="date"]').nth(1)).not.toHaveValue('2026-09-06');
});

test('the app still works with localStorage blocked entirely', async ({ page, context }) => {
	// issue #195: Chrome's "block all cookies" makes even the localStorage getter
	// throw — `typeof` does not protect you. Persistence degrades to a no-op
	// rather than killing the mount.
	await context.addInitScript(() => {
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			get() {
				throw new DOMException('Access is denied for this document.', 'SecurityError');
			}
		});
	});
	await open(page, MINE);

	await expect(page.locator('form input[type="range"]')).toBeEnabled();
	await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
	await expect(page.locator('ol li').first()).toBeVisible();

	// and it still responds to input rather than being a frozen shell
	await page.locator('form label', { hasText: 'Pizzas' }).locator('input').fill('8');
	await expect.poll(() => page.url()).toContain('n=8');
});

test('a chosen locale survives a full reload', async ({ page }) => {
	// 28e24bd: community "Open" links do a full reload, which used to reset the
	// language back to the browser's.
	await open(page, MINE);
	await page.getByRole('button', { name: 'DE', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Zeitplan' })).toBeVisible();

	await open(page, MINE);
	await expect(page.getByRole('heading', { name: 'Zeitplan' })).toBeVisible();
	expect(await page.evaluate(() => localStorage.getItem('kneadtime:locale'))).toBe('de');
});

test('a legacy bare "theme" value migrates once into the namespaced key', async ({
	page,
	context
}) => {
	// issue #203: the unprefixed slot is shared across everything on a
	// *.github.io origin, so it is read once and then cleared.
	await context.addInitScript(() => localStorage.setItem('theme', 'dark'));
	await open(page, MINE);

	expect(await page.evaluate(() => localStorage.getItem('kneadtime:theme'))).toBe('dark');
	expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
});
