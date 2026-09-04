import { expect, test } from '@playwright/test';
import { card, openRecipe } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

const RING = 'rgb(200, 64, 26) solid 2px';

// The global focus rule listed input, select, button and textarea. Both of the
// element types it left out are used here as primary controls, not as prose:
// every disclosure in the app is a styled <summary>, and every "Open" in the
// recipe tables is an <a>. They fell back to the browser default ring, which
// differs by engine and is easy to lose against a dark card.
test('links and disclosure triggers get the same focus ring as the rest', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const ring = (sel: string) =>
		page
			.locator(sel)
			.first()
			.evaluate((el: HTMLElement) => {
				el.focus();
				return getComputedStyle(el).outline;
			});

	expect(await ring('footer a'), 'a footer link').toBe(RING);
	expect(await ring('summary'), 'a disclosure trigger').toBe(RING);
	// unchanged, and the reason the rule exists
	expect(await ring('form input[type="number"]')).toBe(RING);
});

// The actions menu beside it dismisses on outside-click and Escape; this panel
// did neither, so once opened it floated over the schedule it describes until
// the same summary was clicked again.
test('the fit-score panel closes on Escape and on an outside click', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const details = card(page, 'Schedule').locator('details').filter({ hasText: 'fit' });
	const trigger = details.locator('summary');

	await trigger.click();
	await expect(details).toHaveAttribute('open', '');
	await page.keyboard.press('Escape');
	await expect(details).not.toHaveAttribute('open', '');
	// Escape hands focus back to the trigger, so the keyboard does not restart.
	await expect(trigger).toBeFocused();

	await trigger.click();
	await expect(details).toHaveAttribute('open', '');
	await card(page, 'Schedule').getByRole('heading', { name: 'Schedule' }).click();
	await expect(details).not.toHaveAttribute('open', '');
});
