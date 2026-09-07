import { expect, test, type Page } from '@playwright/test';
import { openRecipe } from './helpers';

// The now band is the page's answer: what you should be doing and how long is
// left. Its geometry — a proportional bar, a wash over the night hours, a
// playhead at now — is all paint, so none of it is reachable from a unit test.
// timeline.ts covers the arithmetic; everything here is about what reaches the
// screen.

// A cold plan that is already under way at the suite's fixed clock
// (2026-09-01T09:00Z), so a step really is running.
const RUNNING =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&sa=2026-09-01T06%3A00%3A00.000Z&r=2026-09-02T18%3A00%3A00.000Z';

function band(page: Page) {
	return page.locator('.now-band');
}

// The whole point of an overview is that it agrees with the detail. Two
// components decide "which step is now" from the same step list by different
// rules — nowState() partitions the axis, the table compares against each
// step's own duration — so they can disagree at a boundary without either one
// looking wrong on its own.
test('the band names the same step the list marks as now', async ({ page }) => {
	await openRecipe(page, RUNNING);

	const inBand = await band(page).locator('h3').innerText();
	const inList = await page
		.locator('main ol li')
		.filter({ has: page.locator('.state-chip-live') })
		.locator('h4')
		.innerText();

	expect(inList).not.toBe('');
	expect(inBand.trim()).toBe(inList.trim());
});

// The playhead was invisible twice over: it was drawn in the same ember as the
// phase beneath it, and it lived inside the bar, which clips its own contents
// so the segments keep the rounded corners. Both faults are only visible in a
// rendered page — the markup looked correct.
test('the playhead reads against the phase it sits on, and is not clipped away', async ({
	page
}) => {
	await openRecipe(page, RUNNING);

	const head = band(page).locator('.playhead');
	await expect(head).toBeVisible();

	const bar = (await band(page).locator('.night-bar').boundingBox())!;
	const marker = (await head.boundingBox())!;
	// It overhangs the bar top and bottom, which is what proves it is outside
	// the clip rather than merely happening to be painted.
	expect(marker.height).toBeGreaterThan(bar.height);

	const colour = (loc: ReturnType<typeof page.locator>) =>
		loc.first().evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(await colour(head)).not.toBe(await colour(band(page).locator('.night-seg-warm')));
	expect(await colour(head)).not.toBe(await colour(band(page).locator('.night-seg-cold')));
});

// The night stretches are a transparency laid over whatever phase runs through
// them. Its legend swatch was that same transparency on the panel, which paints
// as nothing at all: the key said "Night" beside an empty square.
test('the night key shows a colour, not a hole', async ({ page }) => {
	await openRecipe(page, RUNNING);

	const swatch = band(page).locator('.night-wash-swatch');
	const room = band(page).locator('li .night-seg-warm');

	const colour = (loc: ReturnType<typeof page.locator>) =>
		loc.first().evaluate((el) => {
			const cs = getComputedStyle(el);
			return { bg: cs.backgroundColor, image: cs.backgroundImage };
		});

	const night = await colour(swatch);
	expect(night.bg).not.toBe('rgba(0, 0, 0, 0)');
	// ...and it is not simply the room colour again: the wash is on top of it.
	expect(night.image).not.toBe('none');
	expect(night.image).not.toBe((await colour(room)).image);
});

// A 15-minute step inside an 80-hour window is 0.3 % of the bar — under two
// pixels on a phone, which is nothing at all. The bar keeps a floor so the
// hands-on steps at either end stay visible as marks.
test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the shortest step is still a mark on the bar at the longest window', async ({ page }) => {
		// 80 h, the rail's own ceiling, so the fixed steps are as small as the
		// app can ever make them.
		await openRecipe(
			page,
			'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=310&sa=2026-08-29T09%3A00%3A00.000Z&r=2026-09-01T17%3A00%3A00.000Z'
		);

		const widths = await band(page)
			.locator('.night-seg')
			.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
		expect(widths.length).toBeGreaterThan(3);
		for (const w of widths) expect(w).toBeGreaterThanOrEqual(2);
	});
});

// A focus ring has to clear 3:1 against what it is drawn on, and one fixed
// ember cannot do that in both themes — against the daylight panel it sat at
// about 2:1. The ring now reads a token that flips with the theme, and nothing
// else in the suite would notice if it went back to being a constant.
test('the focus ring changes colour with the theme', async ({ page }) => {
	await openRecipe(page, RUNNING);

	const ring = () =>
		page
			.locator('form input[type="number"]')
			.first()
			.evaluate((el: HTMLElement) => {
				el.focus();
				return getComputedStyle(el).outlineColor;
			});

	const light = await ring();
	await page.evaluate(() => document.documentElement.classList.add('dark'));
	const dark = await ring();

	expect(light).not.toBe(dark);
});
