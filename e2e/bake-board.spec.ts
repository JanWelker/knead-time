import { expect, test } from '@playwright/test';
import { card, formCard, openRecipe } from './helpers';

// A cold two-day plan whose first step is already running at the pinned clock,
// so the board has a "Now" to report and the schedule has one to agree with.
const RUNNING =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-02T17%3A00%3A00.000Z&sa=2026-09-01T09%3A00%3A00.000Z';

// Everything still ahead of the clock, so the board reports the next step.
const AHEAD =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

function board(page: import('@playwright/test').Page) {
	return page.getByRole('region', { name: 'Ready to bake' });
}

// The complaint this redesign answers: the page opened with twelve
// label-over-input rows, and the thing the app is FOR sat below the fold on a
// phone. The board is the fix, so its position is the rule — a future tidy-up
// that files it under the form would put the inputs back in front of the
// answer without breaking anything else.
test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the answer is on screen before any input', async ({ page }) => {
		await openRecipe(page, RUNNING);

		const bake = await board(page).boundingBox();
		const form = await formCard(page).boundingBox();
		const schedule = await card(page, 'Schedule').boundingBox();

		expect(bake!.y).toBeLessThan(form!.y);
		expect(bake!.y).toBeLessThan(schedule!.y);
		// ...and wholly inside the first screen, not merely first in the column.
		expect(bake!.y + bake!.height).toBeLessThanOrEqual(844);
	});
});

// The board and the schedule read the same steps but decide "what is happening"
// separately — the board scans for the running step, the table tags rows. Two
// clocks in one page is exactly the sort of thing that drifts silently, so pin
// that they name the same step.
test('the board names the step the schedule marks as now', async ({ page }) => {
	await openRecipe(page, RUNNING);

	const nowRow = card(page, 'Schedule')
		.locator('li')
		.filter({ has: page.locator('.chip-now') });
	await expect(nowRow).toHaveCount(1);
	const title = (await nowRow.locator('h4').innerText()).trim();

	await expect(board(page).locator('.chip-now')).toHaveText('Now');
	await expect(board(page)).toContainText(title);
});

test('with nothing running the board reports the next step, not a blank', async ({ page }) => {
	await openRecipe(page, AHEAD);

	await expect(board(page)).toContainText('Next');
	// The countdown is the point of the line — an empty one would still contain
	// the word "Next".
	await expect(board(page)).toContainText(/in \d/);
});

// Depth in this design comes from light: a panel is lighter than the ground and
// casts a soft shadow. That trick does nothing on a dark ground, so every
// raised surface also carries a hairline that is transparent in light and warm
// in dark. Drop the dark half and the panels dissolve into the page — visible
// only to someone who looks at the dark theme, which is the half nobody checks.
for (const theme of ['light', 'dark'] as const) {
	test(`a panel is bounded in the ${theme} theme`, async ({ page }) => {
		await openRecipe(page, AHEAD);
		if (theme === 'dark') {
			await page.evaluate(() => document.documentElement.classList.add('dark'));
		}

		const style = await card(page, 'Schedule').evaluate((el) => {
			const cs = getComputedStyle(el);
			return { shadow: cs.boxShadow, border: cs.borderTopColor };
		});

		expect(style.shadow, 'panels are lifted by a shadow in both themes').not.toBe('none');
		// The border is the dark theme's half of the job. rgba(...) with a
		// non-zero alpha, or an opaque rgb(); fully transparent means unbounded.
		const alpha = Number(/rgba?\([^)]*?,\s*([\d.]+)\)$/.exec(style.border)?.[1] ?? '1');
		if (theme === 'dark') expect(alpha, 'dark panels need a visible edge').toBeGreaterThan(0);
	});
}

// The neutral chip carries a duration in the schedule and a 50 Top Pizza
// ranking in the table, and it lands on three different grounds: the lifted
// panel, the flat card the collections sit in, and the tomato wash under the
// running step. A fixed fill matched the quiet card closely enough in the dark
// theme that the ranking pills read as plain text — so the chip is a
// translucent wash, which cannot collide with whatever it happens to sit on.
for (const theme of ['light', 'dark'] as const) {
	test(`a chip is visible against what it sits on in the ${theme} theme`, async ({ page }) => {
		await openRecipe(page, RUNNING);
		if (theme === 'dark') {
			await page.evaluate(() => document.documentElement.classList.add('dark'));
		}

		// The neutral chip only. `.chip-now`, `.chip-action` and `.chip-time`
		// carry their own fill and are separated from their ground by hue as much
		// as by lightness, which this measurement cannot see.
		const chips = card(page, 'Schedule').locator(
			'.chip:not(.chip-now):not(.chip-action):not(.chip-time)'
		);
		expect(await chips.count()).toBeGreaterThan(0);

		// Polled, not read once: the running step's card transitions its own
		// background, so switching theme and measuring in the same tick catches
		// the colour it is on its way from rather than the one it lands on.
		await expect
			.poll(async () =>
				chips.evaluateAll((els) =>
					els.map((el) => {
						const paint = (n: Element | null): number[] => {
							for (let e = n; e; e = e.parentElement) {
								const bg = getComputedStyle(e).backgroundColor;
								if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
									return (bg.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
								}
							}
							return [255, 255, 255];
						};
						// The chip's fill is translucent, so composite it over its
						// ground the way the browser paints it before comparing.
						const own = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
						const under = paint(el.parentElement);
						const alpha = own.length === 4 ? own[3] : 1;
						// 8/255 is about where a fill stops reading as a shape at all.
						return under.every((u, i) => Math.abs(own[i] * alpha + u * (1 - alpha) - u) <= 8);
					})
				)
			)
			// The chip inside the running step is the hard case: that card has a
			// wash of its own, so a fill tuned to the plain panel vanishes on it.
			.toEqual(Array.from({ length: await chips.count() }, () => false));
	});
}
