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
