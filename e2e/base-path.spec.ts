import { expect, test, type Page } from '@playwright/test';
import { NOW, chooseInMenu, view } from './helpers';

// This spec runs in the `base-path` Playwright project only: a build served
// under `/pr-preview/pr-0`, the shape every PR preview ships in. The rest of
// the suite runs at the root, where two rules cannot fail: that every in-app
// path goes through `$app/paths` (a hard-coded `/` resolves fine at the root),
// and that the storage scope keeps a preview's localStorage apart from the live
// site's — the preview is served from the production origin (static/CNAME),
// so without the scope a preview read real users' saved recipes.
//
// The helpers' `openRecipe` navigates to `/…`, which is an absolute path and
// would leave the base; every navigation here spells the base out.

const BASE = '/pr-preview/pr-0';
const SCOPE = 'pr-preview-pr-0';
const RECIPE =
	'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

async function openAtBase(page: Page, query = RECIPE) {
	await page.clock.install({ time: NOW });
	await page.goto(`${BASE}/?${query}`);
	await expect(view(page)).toBeVisible();
	await expect
		.poll(async () => new URL(page.url()).searchParams.get('sa'), { timeout: 10_000 })
		.not.toBeNull();
}

/** Keys the page holds, read through the same guard the app uses. */
async function storedKeys(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		try {
			return Object.keys(localStorage).sort();
		} catch {
			return [];
		}
	});
}

test('the app hydrates under the base path and stays there', async ({ page }) => {
	await openAtBase(page);
	const url = new URL(page.url());
	expect(url.pathname).toBe(`${BASE}/`);
	expect(url.searchParams.get('v')).toBe('7');
});

test('every request and every in-app link stays under the base', async ({ page }) => {
	const offBase: string[] = [];
	page.on('request', (request) => {
		const url = request.url();
		if (!/^https?:/.test(url)) return;
		if (!new URL(url).pathname.startsWith(`${BASE}/`)) offBase.push(url);
	});

	await openAtBase(page);
	await page.evaluate(() => document.fonts.ready);
	// The library carries the reload links (`rel="external"`), which are the
	// paths most likely to be written by hand.
	await page.locator('summary').filter({ hasText: 'Menu' }).click();
	await page.getByRole('menuitem', { name: 'Recipes', exact: true }).click();
	await expect(page.locator('[data-view="library"]')).toBeVisible();

	// A same-origin request that misses the base is a hard-coded `/` somewhere.
	expect(offBase).toEqual([]);

	const hrefs = await page
		.locator('a[href]')
		.evaluateAll((anchors) =>
			anchors
				.map((a) => a.getAttribute('href') ?? '')
				.filter((href) => href.startsWith('/') || href.startsWith('http://localhost'))
		);
	expect(hrefs.length).toBeGreaterThan(0);
	for (const href of hrefs) {
		const path = href.startsWith('/') ? href : new URL(href).pathname;
		expect(path, href).toMatch(new RegExp(`^${BASE}(/|$)`));
	}
});

test('a preview writes only scoped keys, never the live site’s', async ({ page }) => {
	await openAtBase(page);
	// Two writes through two different paths: a device preference (the menu's
	// language radio) and the recipe memory, which saves only after a user edit.
	await chooseInMenu(page, 'Deutsch');
	await page.getByRole('button', { name: 'Rezept bearbeiten', exact: true }).click();
	const pizzas = page.locator('dialog input[type="number"]').first();
	await pizzas.fill('7');
	await pizzas.press('Tab');

	await expect.poll(() => storedKeys(page)).toContain(`kneadtime:${SCOPE}:locale`);
	await expect.poll(() => storedKeys(page)).toContain(`kneadtime:${SCOPE}:lastRecipe`);
	const keys = await storedKeys(page);
	for (const key of keys) {
		expect(key, keys.join(', ')).toMatch(new RegExp(`^kneadtime:${SCOPE}:`));
	}
});

test('the theme boot script reads the scoped slot, not the root one', async ({ context, page }) => {
	// Production says light, this preview says dark. The boot script runs before
	// any module, from markup the prerender stamped the scope into; if it still
	// read the root key the first paint would follow the live site's choice.
	await context.addInitScript(
		([root, scoped]) => {
			localStorage.setItem(root, 'light');
			localStorage.setItem(scoped, 'dark');
		},
		['kneadtime:theme', `kneadtime:${SCOPE}:theme`]
	);
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto(`${BASE}/`);
	// Read straight after navigation, before hydration can have re-applied it.
	expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
	// And the served markup itself carries the scope — no client code involved.
	const html = await (await page.request.get(`${BASE}/`)).text();
	expect(html).toContain(`localStorage.getItem('kneadtime:${SCOPE}:theme')`);
	expect(html).not.toContain('%storage-scope%');
});
