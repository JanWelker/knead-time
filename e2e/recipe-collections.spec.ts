import { expect, test } from '@playwright/test';
import { openRecipe } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// Community and 50 Top Pizza render through one shell (RecipeSection.svelte)
// and one spec list (RecipeSpecList.svelte). What each still owns — its own
// data, its own source file, its own extra columns — is what these check;
// getting one of those crossed is the failure mode of sharing the markup.
const SECTIONS = [
	{ heading: 'Community recipes', md: 'community/community.md' },
	{ heading: '50 Top Pizza recipes', md: 'pizzerias/pizzerias.md' }
] as const;

for (const section of SECTIONS) {
	test(`${section.heading}: ships collapsed, opens to rows that link back into the app`, async ({
		page
	}) => {
		await openRecipe(page, RECIPE);

		const details = page.locator('details').filter({
			has: page.getByRole('heading', { name: section.heading })
		});
		const open = details.getByRole('link', { name: 'Open' });
		// Browsing other people's recipes is a detour — the section ships closed.
		await expect(open.first()).toBeHidden();

		await details.locator('summary').first().click();
		expect(await open.count()).toBeGreaterThan(0);
		// Every row hands its recipe to the calculator as a share query.
		expect(await open.first().getAttribute('href')).toContain('?');
	});

	test(`${section.heading}: the contribute note points at its own source file`, async ({
		page
	}) => {
		await openRecipe(page, RECIPE);

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
	await openRecipe(page, RECIPE);
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
