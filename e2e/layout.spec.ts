import { expect, test } from '@playwright/test';
import { card, formCard, openRecipe } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// The schedule is what the app is for, and on a phone it used to sit behind
// BOTH the form and the ingredients — measured at 2.2 screens down in beginner
// view and 3.7 in expert, against a stated design goal of reading well on a
// phone on the counter. All three cards carry explicit lg: col/row placement,
// so DOM order is free to put the schedule second; only a browser can show
// that the reorder actually reaches the phone and leaves the desktop alone.
test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the schedule comes before the ingredients on a phone', async ({ page }) => {
		await openRecipe(page, RECIPE);

		const schedule = await card(page, 'Schedule').boundingBox();
		const ingredients = await card(page, 'Ingredients').boundingBox();
		expect(schedule).not.toBeNull();
		expect(ingredients).not.toBeNull();

		// Single column here, so "before" is purely vertical.
		expect(schedule!.y).toBeLessThan(ingredients!.y);
	});
});

test.describe('desktop', () => {
	test.use({ viewport: { width: 1440, height: 1000 } });

	test('the schedule still shares the top row with the form at lg+', async ({ page }) => {
		await openRecipe(page, RECIPE);

		const form = await formCard(page).boundingBox();
		const schedule = await card(page, 'Schedule').boundingBox();
		const ingredients = await card(page, 'Ingredients').boundingBox();

		// Right-hand column, top row — beside the form, not under it.
		expect(schedule!.x).toBeGreaterThan(form!.x);
		expect(Math.abs(schedule!.y - form!.y)).toBeLessThan(2);
		// Ingredients stays in the left column, below the form.
		expect(ingredients!.x).toBeCloseTo(form!.x, 0);
		expect(ingredients!.y).toBeGreaterThan(form!.y + form!.height - 2);
	});
});

// A <label> names its FIRST labelable descendant, so wrapping a date box and a
// time box in one label left both time boxes with no accessible name at all —
// on the two inputs the whole app schedules from. Caught in the accessibility
// tree, not in the markup, which is why this lives in the browser suite.
test('both halves of each date+time pair have an accessible name', async ({ page }) => {
	await openRecipe(page, RECIPE);

	for (const name of [
		'Start time — Date',
		'Start time — Time',
		'Ready to bake — Date',
		'Ready to bake — Time'
	]) {
		await expect(page.getByLabel(name)).toBeVisible();
	}
});

// These five controls were 20 px tall. That still passed WCAG 2.5.8, but only
// via the spacing exception — they conformed because nothing happened to sit
// within 24 px of them, which is a property of the current layout rather than
// of the controls. A reflow (a warning appearing, copy growing in another
// locale) could take it away silently. 24 px is now intrinsic to each one.
//
// `Now` and `Use best` got there by using .btn-tomato-sm, the component class
// they had been hand-copying with tighter padding all along.
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

		for (const name of ['Now', 'Use best', 'Back to the simple view', 'Delete']) {
			const box = await page.getByRole('button', { name, exact: true }).first().boundingBox();
			expect(box, `${name} is not on the page`).not.toBeNull();
			expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(24);
			expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(24);
		}

		// The fit-score disclosure is a <summary>, not a button.
		const fit = await page.locator('summary').filter({ hasText: 'fit' }).first().boundingBox();
		expect(fit!.height).toBeGreaterThanOrEqual(24);
	});
});

// This design draws with hard edges instead of shadows: a solid offset block
// beside the schedule card, header bands and day dividers pulled out of their
// card's padding with negative margins, and perforation notches hung off the
// card's own rule. Every one of those paints OUTSIDE the box it belongs to, so
// any of them can widen the document by a few pixels and put a horizontal
// scrollbar under a phone — which is exactly the width the app has to read at.
// Nothing in the markup hints at it; only a rendered page can say.
test.describe('nothing paints past the edge of the page', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the phone layout never scrolls sideways', async ({ page }) => {
		// Biga + poolish + cold: the longest schedule and the widest ingredient
		// ticket (two pre-doughs, a main dough and a totals block), every band and
		// every perforation in play at once.
		await openRecipe(
			page,
			'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&o=2&sg=1&p=b30_p20&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-03T09%3A00%3A00.000Z'
		);

		const { scrollWidth, clientWidth } = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth
		}));
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	});
});

// A header band and a day divider are reversed out of the ink and have to run
// the full width of their sheet — that is what makes them read as a band rather
// than as a heading with a background colour. They get there by cancelling the
// card's own padding (`-mx-5 sm:-mx-6` against `.card-body`'s `p-5 sm:p-6`), so
// those two numbers are coupled with nothing in the markup to say so: change the
// padding and the bands quietly inset by a few pixels, which just reads as a
// mistake.
test('the header band and the day divider run the full width of the schedule card', async ({
	page
}) => {
	await openRecipe(page, RECIPE);

	const card = await page.locator('.card-loud').boundingBox();
	const band = await page.locator('.card-loud .card-header').boundingBox();
	const day = await page.locator('.card-loud h3').first().boundingBox();

	// Flush inside the card's own 2 px rule, and nowhere short of it.
	expect(band!.x).toBeCloseTo(card!.x + 2, 0);
	expect(band!.width).toBeCloseTo(card!.width - 4, 0);
	// The day divider sits inside the padded body, so it is the band around the
	// date rather than the date itself that has to reach the edges.
	const divider = await page
		.locator('.card-loud h3')
		.first()
		.evaluate((el) => {
			const b = el.parentElement!.getBoundingClientRect();
			return { x: b.x, width: b.width };
		});
	expect(divider.x).toBeCloseTo(card!.x + 2, 0);
	expect(divider.width).toBeCloseTo(card!.width - 4, 0);
	expect(day!.x).toBeGreaterThan(divider.x);
});
