import { expect, test } from '@playwright/test';
import { card, openRecipe } from './helpers';

// A two-day cold plan, so the schedule really does group steps under more than
// one date heading.
const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

function outline(page: import('@playwright/test').Page) {
	return page.evaluate(() =>
		[...document.querySelectorAll('main h1, main h2, main h3, main h4')]
			// The TRMNL dialog's heading lives in the page but belongs to a modal
			// that is closed; it is not part of the document outline being read.
			.filter((h) => !h.closest('dialog'))
			.map((h) => ({ level: Number(h.tagName[1]), text: h.textContent!.trim() }))
	);
}

// The input card was the only card without a heading, so the app's primary
// surface was missing from the outline entirely; and the schedule's day labels
// were plain spans, so a multi-day plan read as one flat run of step titles
// with no date structure. Both are invisible in the markup diff and only show
// up in the rendered outline, which is why this is a browser test.
test('every card is reachable by heading, and the steps sit under their day', async ({ page }) => {
	await openRecipe(page, RECIPE);
	const heads = await outline(page);

	// The input card is named, even though its heading is visually hidden.
	expect(heads.filter((h) => h.level === 2).map((h) => h.text)).toEqual([
		'Your recipe',
		'Schedule',
		'Ingredients',
		'My recipes',
		'Community recipes',
		'50 Top Pizza recipes'
	]);

	// Every step title is an h4 introduced by an h3 date, never the other way
	// round: the first heading inside the schedule must be a day.
	const schedule = heads.slice(heads.findIndex((h) => h.text === 'Schedule'));
	const dayIdx = schedule.findIndex((h) => h.level === 3);
	const firstStep = schedule.findIndex((h) => h.level === 4);
	expect(dayIdx).toBeGreaterThan(-1);
	expect(firstStep).toBeGreaterThan(dayIdx);
	// More than one day, so the grouping is actually doing work here.
	expect(schedule.filter((h) => h.level === 3).length).toBeGreaterThan(1);
});

test('no heading level is skipped', async ({ page }) => {
	await openRecipe(page, RECIPE);
	const heads = await outline(page);

	for (let i = 1; i < heads.length; i++) {
		// Going deeper may only ever step down one level at a time.
		expect(heads[i].level - heads[i - 1].level, `after "${heads[i - 1].text}"`).toBeLessThanOrEqual(
			1
		);
	}
});

// app.css styles `h1, h2, h3, .font-display` from OUTSIDE any cascade layer, so
// that rule beats every Tailwind utility — unlayered always wins over
// @layer utilities. Turning the day label into an h3 silently made it serif and
// dropped its wide tracking; turning the step title into an h4 silently dropped
// the serif it had been inheriting. Both faces are pinned here because the
// markup gives no hint that the levels and the fonts are coupled.
test('changing a heading level does not change its typeface', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const day = await card(page, 'Schedule')
		.locator('h3')
		.first()
		.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { font: cs.fontFamily.split(',')[0].trim(), tracking: cs.letterSpacing };
		});
	// The date label has always been the sans face with wide tracking.
	expect(day.font).toBe('ui-sans-serif');
	expect(day.tracking).toBe('1.68px');

	const step = await page
		.locator('main ol h4')
		.first()
		.evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0].trim());
	// Step titles have always been the display serif.
	expect(step).toBe('ui-serif');
});
