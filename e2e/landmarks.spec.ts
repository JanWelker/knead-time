import { expect, test, type Page } from '@playwright/test';
import { openLibrary, openQuestion, openRecipe } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// The masthead's <header> and the site footer used to sit inside one <main>
// that wrapped the whole page. Both elements were still there and axe was
// still green, but neither had a role: the HTML-AAM gives <header> and
// <footer> their banner and contentinfo roles only when they are not nested in
// another sectioning element, and a landmark that is not a landmark is
// invisible to the rotor a screen-reader user jumps through first. Nothing
// pinned the roles, only the elements, which is why it survived the redesign.
const VIEWS: Record<string, (page: Page) => Promise<void>> = {
	ask: (page) => openQuestion(page, 'window', RECIPE),
	plan: (page) => openRecipe(page, RECIPE),
	library: async (page) => {
		await openRecipe(page, RECIPE);
		await openLibrary(page);
	}
};

for (const [name, open] of Object.entries(VIEWS)) {
	test(`the ${name} view exposes one banner, one main and one contentinfo`, async ({ page }) => {
		await open(page);
		await expect(page.getByRole('banner')).toHaveCount(1);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByRole('contentinfo')).toHaveCount(1);
		// The landmarks are siblings, never nested: a banner inside main is what
		// stopped it being a banner at all.
		const nested = await page.evaluate(
			() => document.querySelectorAll('main header, main footer, header main, footer main').length
		);
		expect(nested).toBe(0);
		// The view's own content is what the main holds — the heading that names
		// the view is inside it, the masthead is not.
		await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveCount(1);
	});
}

// Every <th> says what it heads. The deli ticket's row labels and the two
// reference tables' column heads carried none, so a figure read out of context
// ("6 g") had no header association at all; grep found zero `scope=` in src.
async function unscopedHeaders(page: Page) {
	return page.evaluate(() =>
		[...document.querySelectorAll('th:not([scope])')].map((th) => th.outerHTML)
	);
}

test('every table header on the plan carries a scope', async ({ page }) => {
	await openRecipe(page, `${RECIPE}&p=b30_p20`);
	expect(await unscopedHeaders(page)).toEqual([]);
	// Row headers on the ticket, and no column heads at all: the rows walk to
	// their figure on a leader, so the label is the header of its own row.
	expect(await page.locator('main th[scope="row"]').count()).toBeGreaterThan(0);
});

test('every table header in the library carries a scope', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openLibrary(page);
	// The collections ship closed; the tables are in the DOM regardless.
	expect(await unscopedHeaders(page)).toEqual([]);
	expect(await page.locator('th[scope="col"]').count()).toBeGreaterThan(0);
});

test('every table header on the print sheet carries a scope', async ({ page }) => {
	// The route auto-calls window.print() on mount; stub it so the run is headless-safe.
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/print/en?${RECIPE}&p=b30_p20`);
	await expect(page.locator('.printpage')).toBeVisible();
	expect(await unscopedHeaders(page)).toEqual([]);
	expect(await page.locator('th[scope="row"]').count()).toBeGreaterThan(0);
	expect(await page.locator('th[scope="col"]').count()).toBeGreaterThan(0);
});
