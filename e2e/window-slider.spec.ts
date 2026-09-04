import { expect, test, type Page } from '@playwright/test';
import {
	allStops,
	arrowCentreX,
	chosenWindow,
	dragTo,
	openRecipe,
	slider,
	thumbCentreX,
	windowCard
} from './helpers';

// Caputo Pizzeria (W 265): cold band tops out at 40 h, which is not one of the
// canonical stops — the case the ideal-as-its-own-stop work exists for.
const CAPUTO = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265';
const NAPOLETANA = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=310';
/** Far enough out that the flour's tolerance, not the deadline, is the limit. */
const FAR_BAKE = 'r=2026-09-06T17%3A00%3A00.000Z';
/**
 * No `sa`, so the start is "now" and the window lands half an hour past a
 * stop: the thumb snaps to that stop, the ideal floors to the same one, and
 * the two markers share a pixel while the readout still shows the minutes.
 */
const IDEAL_RECIPE = `${CAPUTO}&r=2026-09-02T17%3A30%3A00.000Z`;

/**
 * The tick-label row under the rail. The ideal marker carries its own duration
 * caption in a separate row above, and comparing the two rows against each
 * other reports a collision that is not on screen.
 */
async function tickRowBoxes(page: Page): Promise<{ t: string; left: number; right: number }[]> {
	return page.evaluate(() => {
		const card = document.querySelector('form div.rounded-2xl')!;
		const spans = [...card.querySelectorAll('span')]
			.filter((s) => /^\d+\s*h$/.test(s.textContent!.trim()) && s.checkVisibility())
			.map((s) => {
				const b = s.getBoundingClientRect();
				return {
					t: s.textContent!.trim(),
					left: Math.round(b.left),
					right: Math.round(b.right),
					top: Math.round(b.top)
				};
			});
		const row = spans.find((s) => s.t === '8 h')?.top;
		return spans
			.filter((s) => s.top === row)
			.sort((a, b) => a.left - b.left)
			.map(({ t, left, right }) => ({ t, left, right }));
	});
}

test('a decoded link reproduces its own window, without re-picking', async ({ page }) => {
	// The share-link contract: opening someone's recipe must not quietly rewrite
	// it to what this app would have chosen. 32 h is deliberately not the ideal.
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	expect(await chosenWindow(page)).toBe('32 h');
	await expect(windowCard(page).locator('[role="status"]')).toHaveCount(0);
});

test('the ideal window is a stop the slider can reach', async ({ page }) => {
	// The reported bug: the app picked the ideal on arrival, and once you dragged
	// away no slider position could return to it.
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-06');

	await expect.poll(() => chosenWindow(page)).toBe('40 h');
	expect(await allStops(page)).toContain('40 h');
});

test('the ideal marker names the same window the app picks', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-06');
	await expect.poll(() => chosenWindow(page)).toBe('40 h');

	await expect(windowCard(page)).toContainText('40 h');
	expect(await arrowCentreX(page, 'up')).not.toBeNull();
});

test('no ideal marker for a flour the rail cannot serve', async ({ page }) => {
	// Supermarket 00 tolerates 2–4 h at room temperature and cannot reach the
	// cold switch at all, so no slider position is inside its band.
	await openRecipe(page, `v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=180&${FAR_BAKE}`);

	expect(await arrowCentreX(page, 'up')).toBeNull();
});

test('dragging past the bake deadline is refused, out loud', async ({ page }) => {
	// Bake is ~34 h out, so the long stops would have to start before now.
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);

	const max = Number(await slider(page).getAttribute('max'));
	await dragTo(page, max);

	const alert = windowCard(page).locator('[role="alert"]');
	await expect(alert).toBeVisible();
	await expect(alert).toContainText('before now');

	// and the thumb comes back rather than sitting out in the greyed stretch,
	// which the bound value alone would not have forced
	expect(Number(await slider(page).inputValue())).toBeLessThan(max);
	await expect
		.poll(async () => Math.round((await thumbCentreX(page)) - (await arrowCentreX(page, 'down'))!))
		.toBeLessThanOrEqual(12);
});

test('a legal drag clears the refusal', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);
	const max = Number(await slider(page).getAttribute('max'));

	await dragTo(page, max);
	await expect(windowCard(page).locator('[role="alert"]')).toBeVisible();

	await dragTo(page, 1);
	await expect(windowCard(page).locator('[role="alert"]')).toHaveCount(0);
});

test('the ideal arrow sits on the thumb, at both ends of the rail', async ({ page }) => {
	// The alignment bug, twice over: first the rail used the wrong coordinate
	// system, then the edge pivot dragged the arrow along with its caption. Both
	// only showed away from the middle, so both ends are pinned here. The window
	// is read from the marker rather than hard-coded — what matters is that the
	// arrow lands on the thumb, whatever hour the ideal works out to.
	const arrowIsOnTheThumb = async () => {
		const arrow = await arrowCentreX(page, 'up');
		expect(arrow).not.toBeNull();
		expect(Math.abs(arrow! - (await thumbCentreX(page)))).toBeLessThanOrEqual(1);
	};

	await openRecipe(page, `${NAPOLETANA}&${FAR_BAKE}`);
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-06');
	// 72 h sits past the 88 % pivot threshold — an end-anchored caption
	await expect.poll(() => chosenWindow(page)).toBe('72 h');
	await arrowIsOnTheThumb();

	// now pull the bake in so the ideal lands near the left end instead
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-01');
	await page.locator('form input[type="time"]').nth(1).fill('20:00');
	await expect.poll(() => chosenWindow(page)).not.toBe('72 h');
	await arrowIsOnTheThumb();
});

test('the rail marker names a ceiling, not the bake moment', async ({ page }) => {
	// It used to reuse the form's "Ready to bake" label, which read as if the
	// arrow pointed at the bake itself rather than at the longest window it
	// allows. The moment stays on the line beneath.
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);

	const marker = windowCard(page).locator('div.absolute').filter({ hasText: 'Limit set by' });
	await expect(marker).toContainText('Limit set by ‘ready to bake’ time');
	await expect(marker).toContainText('Sep 2');
});

test('the "use best" button restores the ideal, then gets out of the way', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await page.locator('form input[type="date"]').nth(1).fill('2026-09-06');
	await expect.poll(() => chosenWindow(page)).toBe('40 h');

	// already at the ideal, so there is nothing to restore
	const useBest = windowCard(page).getByRole('button', { name: 'Use best' });
	await expect(useBest).toHaveCount(0);

	await dragTo(page, 1);
	expect(await chosenWindow(page)).not.toBe('40 h');
	await expect(useBest).toBeVisible();

	await useBest.click();
	await expect.poll(() => chosenWindow(page)).toBe('40 h');
	await expect(useBest).toHaveCount(0);
});

test('no "use best" button when the flour has no ideal to offer', async ({ page }) => {
	await openRecipe(page, `v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=180&${FAR_BAKE}`);

	await expect(windowCard(page).getByRole('button', { name: 'Use best' })).toHaveCount(0);
});

test('every marker caption stays inside the rail', async ({ page }) => {
	await openRecipe(page, `${NAPOLETANA}&r=2026-09-01T20%3A00%3A00.000Z`);

	const rail = await windowCard(page).locator('.overflow-hidden.rounded-full').boundingBox();
	for (const caption of await windowCard(page).locator('span.whitespace-nowrap').all()) {
		const box = await caption.boundingBox();
		if (!box) continue;
		expect(box.x).toBeGreaterThanOrEqual(rail!.x - 1);
		expect(box.x + box.width).toBeLessThanOrEqual(rail!.x + rail!.width + 1);
	}
});

// Four tick labels do not fit a phone. The rail is linear in stop INDEX and
// 48 h / 72 h are adjacent stops, so at 390 px the two labels ended up 3 px
// apart and read as a single number. Only a browser can show that.
test.describe('tick labels on a phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the rail labels never run into each other', async ({ page }) => {
		await openRecipe(page, IDEAL_RECIPE);

		const boxes = await tickRowBoxes(page);
		expect(boxes.length).toBeGreaterThanOrEqual(3);
		for (let i = 1; i < boxes.length; i++) {
			expect(
				boxes[i].left - boxes[i - 1].right,
				`${boxes[i - 1].t} to ${boxes[i].t}`
			).toBeGreaterThan(8);
		}
		// 48 h is the one dropped; the ends stay so the rail keeps its scale.
		expect(boxes.map((b) => b.t)).not.toContain('48 h');
		expect(boxes.map((b) => b.t)).toContain('72 h');
	});
});

test.describe('tick labels with room', () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test('all four labels come back once there is width for them', async ({ page }) => {
		await openRecipe(page, IDEAL_RECIPE);

		const boxes = await tickRowBoxes(page);
		expect(boxes.map((b) => b.t)).toContain('48 h');
		for (let i = 1; i < boxes.length; i++) {
			expect(boxes[i].left - boxes[i - 1].right).toBeGreaterThan(8);
		}
	});
});

// The thumb snaps to stops and the ideal marker points at one, so when they are
// the same stop the rail is already saying "you are here" — while a "Use best"
// button sat underneath saying the opposite, on the default view. Worse, an
// ideal capped by the bake time rather than the flour is SHORTER than the
// window in hand, so the button offered to throw away the extra minutes.
test('no "use best" while the thumb already sits on the ideal', async ({ page }) => {
	await openRecipe(page, IDEAL_RECIPE);

	// Precondition: the two really are on the same pixel, so a pass cannot be
	// an accident of the button being absent for some other reason.
	const thumb = await thumbCentreX(page);
	const arrow = await arrowCentreX(page, 'up');
	expect(arrow, 'no ideal marker on the rail').not.toBeNull();
	expect(Math.abs(thumb - arrow!)).toBeLessThan(2);
	// ...and the window is not exactly the ideal, which is what used to show it.
	expect(await chosenWindow(page)).toMatch(/min/);

	await expect(windowCard(page).getByRole('button', { name: 'Use best' })).toHaveCount(0);
});

// The rail painted two green stretches and nothing said what the colour meant.
test('the band caption carries a swatch in the band colour', async ({ page }) => {
	await openRecipe(page, IDEAL_RECIPE);

	const swatch = windowCard(page).locator('p span.size-2');
	await expect(swatch).toHaveCount(1);
	const colour = await swatch.evaluate((el) => getComputedStyle(el).backgroundColor);
	const rail = await windowCard(page)
		.locator('div.bg-basil-400, div.bg-basil-300')
		.last()
		.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(colour).toBe(rail);
});
