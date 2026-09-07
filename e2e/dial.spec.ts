import { expect, test } from '@playwright/test';
import { card, chosenWindow, dragTo, openRecipe, slider } from './helpers';

// The dial is the app's primary control now, and everything about it lives in
// a component: the geometry module underneath is unit-tested to 100 %, but
// whether the drawing and the plan list agree, whether the coil can be worked
// without a mouse, and whether a 390 px face still fits the phone are all
// things only a browser can answer.

// A two-day cold plan: a coil and a bit, with a fridge leg long enough that
// its arc dominates the face.
const COLD =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';
// Three coils, two pre-ferments in parallel — the densest thing the dial draws.
const LONG_PREFERMENT =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=310&p=b30_p20&r=2026-09-04T17%3A00%3A00.000Z&sa=2026-09-01T17%3A00%3A00.000Z';

const dial = (page: import('@playwright/test').Page) => page.locator('section.instrument svg');
const options = (page: import('@playwright/test').Page) => dial(page).getByRole('option');
const readout = (page: import('@playwright/test').Page) => page.locator('.readout');

/** Click a step's arc on the coil, at a point that is really on the stroke. */
async function clickArc(page: import('@playwright/test').Page, step: string) {
	// The coordinates below are viewport-relative, and selecting a step in the
	// plan list first can scroll the dial off the top of the screen — a click
	// at a negative y lands nowhere and reports nothing.
	await dial(page).scrollIntoViewIfNeeded();
	const at = await dial(page)
		.locator(`[data-step="${step}"] path`)
		.first()
		.evaluate((el: SVGPathElement) => {
			const p = el.getPointAtLength(el.getTotalLength() / 2);
			const box = el.ownerSVGElement!.getBoundingClientRect();
			// The face is drawn in a 100-unit viewBox scaled to the box.
			return { x: box.left + (p.x / 100) * box.width, y: box.top + (p.y / 100) * box.height };
		});
	await page.mouse.click(at.x, at.y);
}

test('the dial and the plan list are two views of one selection', async ({ page }) => {
	// They read the same stepCopy functions, so they cannot disagree about what
	// a step SAYS — but they each keep their own idea of which step is showing
	// unless the selection is lifted out of both, which is what this pins.
	await openRecipe(page, COLD);

	await card(page, 'Schedule').getByRole('button', { name: 'Divide & ball' }).click();
	await expect(readout(page).getByRole('heading')).toHaveText('Divide & ball');
	await expect(options(page).and(page.locator('[aria-selected="true"]'))).toHaveAttribute(
		'data-step',
		'divide-'
	);

	// ...and back the other way: picking an arc moves the list's marker too.
	// Clicked where the arc is actually drawn, not at the centre of its
	// bounding box — a 180° arc's box centre is empty face.
	await clickArc(page, 'final-proof-');
	await expect(readout(page).getByRole('heading')).toHaveText('Final proof');
	await expect(card(page, 'Schedule').getByRole('button', { name: 'Final proof' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('the whole coil is walkable from the keyboard', async ({ page }) => {
	// The dial is one tab stop with a roving selection, not nine — and the
	// arrow keys have to move the readout, or the drawing is mouse-only.
	await openRecipe(page, COLD);

	await options(page).and(page.locator('[tabindex="0"]')).focus();
	const first = await readout(page).getByRole('heading').innerText();
	await page.keyboard.press('ArrowRight');
	await expect(readout(page).getByRole('heading')).not.toHaveText(first);

	await page.keyboard.press('End');
	await expect(readout(page).getByRole('heading')).toHaveText('Shape & bake');
	await page.keyboard.press('Home');
	await expect(readout(page).getByRole('heading')).toHaveText('Weigh & prep');
});

test('the window handle moves between the same stops as the slider', async ({ page }) => {
	// Two controls for one value: the coil's tail and the rail in the form. A
	// handle that landed anywhere else would hand back a window the slider
	// could never express again.
	await openRecipe(page, COLD);
	const before = await chosenWindow(page);

	const handle = dial(page).getByRole('slider');
	await handle.focus();
	await handle.press('ArrowLeft');

	await expect.poll(() => chosenWindow(page)).not.toBe(before);
	// The rail followed, rather than the two drifting apart.
	await expect
		.poll(async () => Number(await slider(page).inputValue()))
		.toBe(Number(await handle.getAttribute('aria-valuenow')));
	await expect(handle).toHaveAttribute('aria-valuetext', await chosenWindow(page));
});

test('dragging the handle past the bake deadline is refused, out loud', async ({ page }) => {
	// Same rule the rail enforces, said in the same words: a control that
	// springs back without a word reads as broken.
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-02T19%3A00%3A00.000Z'
	);

	const handle = dial(page).getByRole('slider');
	await handle.focus();
	// Turning the tail back against the clock is what lengthens the window.
	for (let i = 0; i < 12; i++) await handle.press('ArrowRight');

	const alert = page.locator('section.instrument [role="alert"]');
	await expect(alert).toBeVisible();
	await expect(alert).toContainText('before now');
});

test('a leg that ends on another day says which day', async ({ page }) => {
	// The readout printed "01:00 PM – 02:45 PM" for a 25 h fridge leg, which
	// reads as an hour and three quarters. Only the rendered pair shows it.
	await openRecipe(page, COLD);

	await card(page, 'Schedule').getByRole('button', { name: 'Bulk ferment (fridge)' }).click();
	const times = readout(page).locator('p').nth(1);
	await expect(times).toContainText('Sep');
});

test('the dial opens on the step that is running', async ({ page }) => {
	// "What now?" is the question the app exists to answer, so the readout must
	// not start on step one of a plan that began yesterday.
	await openRecipe(page, COLD);
	// NOW is 2026-09-01T09:00Z and this plan opens on 2026-09-04, so nothing is
	// running yet: the first step is the right answer here.
	await expect(readout(page).getByRole('heading')).toHaveText('Weigh & prep');

	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-02T13%3A00%3A00.000Z&sa=2026-09-01T05%3A00%3A00.000Z'
	);
	// This one started four hours before NOW, so a middle step is current.
	await expect(readout(page).getByRole('heading')).not.toHaveText('Weigh & prep');
});

test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the face fits the phone and the page never scrolls sideways', async ({ page }) => {
		// A coil is the one element on this page that wants to be square and as
		// wide as it can get, which is exactly how a page starts overflowing.
		await openRecipe(page, LONG_PREFERMENT);

		const box = await dial(page).boundingBox();
		expect(box!.width).toBeLessThanOrEqual(390);
		// Square, so the geometry the module computes is the geometry drawn.
		expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			390
		);
	});

	test('the plan comes before the weights, and the settings are past both', async ({ page }) => {
		// The schedule is what the app is for; on a phone it used to sit behind
		// the form AND the ingredients. The dial answers first now, and the form
		// is how you adjust the answer rather than how you reach it.
		await openRecipe(page, COLD);

		const stage = (await page.locator('section.instrument').boundingBox())!;
		const plan = (await card(page, 'Schedule').boundingBox())!;
		const weights = (await card(page, 'Ingredients').boundingBox())!;
		const settings = (await page.locator('.card', { has: slider(page) }).boundingBox())!;

		expect(stage.y).toBeLessThan(plan.y);
		expect(plan.y).toBeLessThan(weights.y);
		expect(weights.y).toBeLessThan(settings.y);
	});
});

test.describe('desktop', () => {
	test.use({ viewport: { width: 1440, height: 1000 } });

	test('the settings are a rail beside the instrument, not a column ahead of it', async ({
		page
	}) => {
		await openRecipe(page, COLD);

		const settings = (await page.locator('.card', { has: slider(page) }).boundingBox())!;
		const stage = (await page.locator('section.instrument').boundingBox())!;
		const readoutBox = (await readout(page).boundingBox())!;

		// Rail on the left, instrument to its right, both starting at the top.
		expect(settings.x).toBeLessThan(stage.x);
		expect(Math.abs(settings.y - stage.y)).toBeLessThan(2);
		// The step detail sits beside the dial at this width, not under it.
		expect(readoutBox.x).toBeGreaterThan(stage.x + stage.width - 2);
	});
});

test('the drag that changes the window is not the only way to change it', async ({ page }) => {
	// Everything the coil can do has a plain field behind it. The rail is that
	// field, and moving it has to move the coil's tail.
	await openRecipe(page, COLD);

	const tailBefore = await dial(page).getByRole('slider').getAttribute('aria-valuetext');
	await dragTo(page, 1);
	await expect(dial(page).getByRole('slider')).not.toHaveAttribute('aria-valuetext', tailBefore!);
});

test.describe('the settings rail', () => {
	test.use({ viewport: { width: 1280, height: 700 } });

	test('scrolls on its own, so a long form is not pinned out of reach', async ({ page }) => {
		// The rail is sticky, and the expert form is taller than any laptop
		// screen. A sticky box taller than the viewport sticks immediately and
		// then scrolls with the page, so everything below its first screenful
		// becomes unreachable — the fridge-temperature field simply could not be
		// clicked. It gets its own scroll region instead.
		await openRecipe(page, COLD);

		const rail = page.locator('.card', { has: slider(page) });
		const reachable = await rail.evaluate(
			(el) => el.scrollHeight <= el.clientHeight + 1 || getComputedStyle(el).overflowY === 'auto'
		);
		expect(reachable).toBe(true);

		const fridge = page.locator('form label', { hasText: 'Fridge temperature' }).locator('input');
		await fridge.fill('6');
		await expect(fridge).toHaveValue('6');
	});
});
