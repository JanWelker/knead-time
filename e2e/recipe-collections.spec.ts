import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openLibrary, openRecipe } from './helpers';

// The data rows of a shipped markdown table, counted the way the unit suites
// count them (community.test.ts, pizzerias.test.ts): every row that carries a
// link. Read from the file rather than pinned as a literal so adding a recipe
// does not mean editing a browser test — the parser dropping a row is what
// this is guarding against, and that shows as a count the file disagrees with.
function dataRows(md: string): number {
	return readFileSync(new URL(`../src/lib/${md}`, import.meta.url), 'utf8')
		.split('\n')
		.filter((line) => line.trim().startsWith('|') && line.includes('http'))
		.filter((line) => !line.includes('---')).length;
}

// The collections moved out of the foot of the calculator and into a view of
// their own: they are entry points to a recipe, not an appendix to one.
async function loadLibrary(page: import('@playwright/test').Page, query: string) {
	await openRecipe(page, query);
	await openLibrary(page);
}

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// Community and 50 Top Pizza render through one shell (RecipeSection.svelte)
// and one spec list (RecipeSpecList.svelte). What each still owns — its own
// data, its own source file, its own extra columns — is what these check;
// getting one of those crossed is the failure mode of sharing the markup.
const SECTIONS = [
	{ heading: 'Community recipes', md: 'community/community.md' },
	{ heading: '50 Top Pizza recipes', md: 'pizzerias/pizzerias.md' }
].map((s) => ({ ...s, rows: dataRows(s.md) }));

for (const section of SECTIONS) {
	test(`${section.heading}: ships collapsed, opens to rows that link back into the app`, async ({
		page
	}) => {
		await loadLibrary(page, RECIPE);

		const details = page.locator('details').filter({
			has: page.getByRole('heading', { name: section.heading })
		});
		const open = details.getByRole('link', { name: 'Open' });
		// Browsing other people's recipes is a detour — the section ships closed.
		await expect(open.first()).toBeHidden();

		await details.locator('summary').first().click();
		// One Open link per data row of the shipped markdown, counted the same way
		// the unit suites count them — `> 0` would have passed with one row of
		// many rendered.
		await expect(open).toHaveCount(section.rows);
		// Every row hands its recipe to the calculator as a versioned share query.
		for (const href of await open.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
			expect(href).toMatch(/^\/\?(?:.*&)?v=\d+(?:&|$)/);
		}
	});

	test(`${section.heading}: the contribute note points at its own source file`, async ({
		page
	}) => {
		await loadLibrary(page, RECIPE);

		const details = page.locator('details').filter({
			has: page.getByRole('heading', { name: section.heading })
		});
		await details.locator('summary').first().click();

		const href = await details.locator(`a[href*="${section.md}"]`).getAttribute('href');
		expect(href).toContain('/blob/main/src/lib/');
	});
}

// Community has no oil or sugar column at all; 50 Top Pizza has both, and shows
// them only for a recipe that uses them. One spec list serves both, so the
// labels a section does not have are the thing that keeps them apart.
test('the card details list only the fields a section actually has', async ({ page }) => {
	await loadLibrary(page, RECIPE);
	await page.setViewportSize({ width: 390, height: 900 });

	const community = page.locator('details').filter({
		has: page.getByRole('heading', { name: 'Community recipes' })
	});
	await community.locator('summary').first().click();
	await community.locator('li details summary').first().click();
	await expect(community.locator('li dl').first()).toContainText('Hydration');
	await expect(community.locator('li dl').first()).not.toContainText('Oil');

	const pizzerias = page.locator('details').filter({
		has: page.getByRole('heading', { name: '50 Top Pizza recipes' })
	});
	await pizzerias.locator('summary').first().click();
	// pizzerias.md ships rows with oil; at least one card must show that row.
	const withOil = pizzerias.locator('li').filter({ hasText: 'Details' });
	for (const card of await withOil.all()) await card.locator('details summary').click();
	await expect(pizzerias.locator('li dl dt', { hasText: /^Oil/ }).first()).toBeVisible();
});

// The rack is three sheets, not two and a lookalike: My recipes re-implemented
// RecipeSection's disclosure by hand — ink band, arrow, heading, body, intro,
// empty state — so a change to the shell reached two of the three and the third
// drifted. Nothing caught it, because each section was only ever checked
// against its own copy. This walks all three and demands the same structure.
test('all three sheets on the rack are printed from one shell', async ({ page }) => {
	await loadLibrary(page, RECIPE);

	for (const heading of ['My recipes', 'Community recipes', '50 Top Pizza recipes']) {
		const details = page.locator('details').filter({
			has: page.getByRole('heading', { name: heading })
		});
		const summary = details.locator('> summary');
		await expect(summary).toHaveClass(/card-header/);
		// The band carries the turning arrow and the reversed-out heading.
		await expect(summary.locator('.disclosure-mark')).toHaveCount(1);
		await expect(summary.locator('h2.card-header-title')).toHaveText(heading);
		await expect(details.locator('> .card-body')).toHaveCount(1);
	}
});

// The repeated Tailwind lists behind the rack's tickets and tables were given
// names in app.css. `@apply` there takes utilities only — reaching for another
// @layer components class makes Tailwind drop the WHOLE declaration without
// erroring, so a name can exist, be applied everywhere, and style nothing while
// the build stays green. Only a browser can tell; this reads the real values.
test('the rack renders through its named shapes, not through dropped declarations', async ({
	page
}) => {
	await loadLibrary(page, RECIPE);

	const community = page.locator('details').filter({
		has: page.getByRole('heading', { name: 'Community recipes' })
	});
	await community.locator('summary').first().click();

	// The disclosure arrow: 0.7rem of tracked-in type that turns when it opens.
	// Tailwind v4 writes `rotate-90` to the standalone `rotate` property, not
	// into `transform` — reading the wrong one says "none" on a turned arrow.
	const mark = community.locator('> summary .disclosure-mark');
	expect(await mark.evaluate((el) => getComputedStyle(el).fontSize)).toBe('11.2px');
	// Polled, because `transition-transform` means the read can land mid-turn.
	await expect.poll(() => mark.evaluate((el) => getComputedStyle(el).rotate)).toBe('90deg');

	// The table: heads reversed out of the ink band, figures ranged right.
	const head = community.locator('th.head-cell').first();
	expect(
		await head.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { pad: cs.padding, caps: cs.textTransform };
		})
	).toEqual({ pad: '8px 12px', caps: 'uppercase' });

	const figure = community.locator('td.figure-cell').first();
	expect(
		await figure.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { pad: cs.padding, align: cs.textAlign, weight: cs.fontWeight };
		})
	).toEqual({ pad: '12px', align: 'right', weight: '600' });

	// The cards below the table breakpoint: a ticket trimmed like the sheet it
	// hangs in, and a caption-set summary tucking its figures away.
	await page.setViewportSize({ width: 390, height: 900 });
	const ticket = community.locator('li.ticket').first();
	expect(
		await ticket.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { pad: cs.padding, border: cs.borderTopWidth, radius: cs.borderTopLeftRadius };
		})
	).toEqual({ pad: '12px', border: '2px', radius: '2px' });

	const ticketSummary = ticket.locator('summary.ticket-summary');
	expect(
		await ticketSummary.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { caps: cs.textTransform, cursor: cs.cursor };
		})
	).toEqual({ caps: 'uppercase', cursor: 'pointer' });

	// The plaque centres its own label now. It is an <a> as often as a <button>,
	// and an anchor does not centre text on its own — four call sites had said
	// so by hand, which is one typo away from an off-centre button.
	const open = ticket.getByRole('link', { name: 'Open' });
	expect(
		await open.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { display: cs.display, justify: cs.justifyContent };
		})
	).toEqual({ display: 'inline-flex', justify: 'center' });
});
