import { expect, test } from '@playwright/test';
import { openAdjust, openRecipe, region, sheet } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// The schedule is what the app is for, and on a phone it used to sit behind
// BOTH the form and the ingredients — measured at 2.2 screens down in beginner
// view and 3.7 in expert. The inputs have left the page entirely now, but the
// schedule-before-weights order is still a rule and still only a browser can
// show that it reaches the phone.
test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the schedule comes before the ingredients on a phone', async ({ page }) => {
		await openRecipe(page, RECIPE);

		const schedule = await region(page, 'Schedule').boundingBox();
		const ingredients = await region(page, 'Ingredients').boundingBox();
		expect(schedule).not.toBeNull();
		expect(ingredients).not.toBeNull();

		// Single column here, so "before" is purely vertical.
		expect(schedule!.y).toBeLessThan(ingredients!.y);
	});
});

test.describe('desktop', () => {
	test.use({ viewport: { width: 1440, height: 1000 } });

	test('the weights sit beside the schedule, and no form sits on the plan', async ({ page }) => {
		await openRecipe(page, RECIPE);

		const schedule = await region(page, 'Schedule').boundingBox();
		const ingredients = await region(page, 'Ingredients').boundingBox();

		// Right-hand rail, level with the schedule — both are outputs, and the
		// plan is the one screen where nothing competes with them.
		expect(ingredients!.x).toBeGreaterThan(schedule!.x + schedule!.width - 2);
		expect(Math.abs(ingredients!.y - schedule!.y)).toBeLessThan(20);

		// The whole point of the restructure: the twelve inputs are in a sheet
		// that has to be asked for, so the plan carries no visible form at all.
		await expect(page.locator('form:visible')).toHaveCount(0);
	});
});

// A <label> names its FIRST labelable descendant, so wrapping a date box and a
// time box in one label left both time boxes with no accessible name at all —
// on the two inputs the whole app schedules from. Caught in the accessibility
// tree, not in the markup, which is why this lives in the browser suite.
test('both halves of each date+time pair have an accessible name', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	for (const name of [
		'Start time — Date',
		'Start time — Time',
		'Ready to bake — Date',
		'Ready to bake — Time'
	]) {
		await expect(sheet(page).getByLabel(name)).toBeVisible();
	}
});

// These five controls were 20 px tall. That still passed WCAG 2.5.8, but only
// via the spacing exception — they conformed because nothing happened to sit
// within 24 px of them, which is a property of the current layout rather than
// of the controls. A reflow (a warning appearing, copy growing in another
// locale) could take it away silently. 24 px is now intrinsic to each one.
//
// The ask flow's progress dots are on the list because the visible mark is
// 10 px: the button around it carries the target size, drawn by ::after.
test.describe('tap targets', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the small controls are at least 24px without relying on their neighbours', async ({
		page
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				'kneadtime:recipes',
				JSON.stringify([
					{ name: 'Saturday', search: 'v=6&n=6&b=280', savedAt: '2026-08-30T10:00:00Z' }
				])
			);
		});
		// Expert view, and a 48 h window against a 40 h ideal so "Use best" shows.
		await openRecipe(
			page,
			'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-03T17%3A00%3A00.000Z'
		);
		await openAdjust(page);

		for (const name of ['Now', 'Use best', 'Back to the simple view']) {
			const box = await page.getByRole('button', { name, exact: true }).first().boundingBox();
			expect(box, `${name} is not on the page`).not.toBeNull();
			expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(24);
			expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(24);
		}

		await page.getByRole('button', { name: 'Done', exact: true }).click();

		// The fit-score disclosure is a <summary>, not a button.
		const fit = await page.locator('summary[aria-label^="Recipe fit"]').boundingBox();
		expect(fit!.height).toBeGreaterThanOrEqual(24);

		// Delete lives in the recipe library now, not at the foot of the page.
		await page.getByRole('button', { name: 'Recipes', exact: true }).click();
		const del = await page
			.getByRole('button', { name: 'Delete', exact: true })
			.first()
			.boundingBox();
		expect(del, 'Delete is not on the page').not.toBeNull();
		expect(del!.height).toBeGreaterThanOrEqual(24);
		expect(del!.width).toBeGreaterThanOrEqual(24);
		await page.getByRole('button', { name: 'Back to your plan' }).click();

		// One question dot on the ask flow's progress rail.
		await page.getByRole('button', { name: 'Plan another bake' }).click();
		const dot = await page
			.getByRole('navigation', { name: 'Questions' })
			.getByRole('button')
			.first()
			.boundingBox();
		expect(dot!.height).toBeGreaterThanOrEqual(24);
		expect(dot!.width).toBeGreaterThanOrEqual(24);
	});
});
