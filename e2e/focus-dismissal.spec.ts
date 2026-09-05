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
	// Wait for the panel to be on screen, not merely for the open attribute:
	// <details> sets that itself on click, before the component has rendered
	// anything, and "it is open" should mean the reader can see it.
	await expect(details.locator('p, ul').first()).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(details).not.toHaveAttribute('open', '');
	// Escape hands focus back to the trigger, so the keyboard does not restart.
	await expect(trigger).toBeFocused();

	await trigger.click();
	await expect(details.locator('p, ul').first()).toBeVisible();
	await card(page, 'Schedule').getByRole('heading', { name: 'Schedule' }).click();
	await expect(details).not.toHaveAttribute('open', '');
});

// The menu and the fit panel now share one dismissal rule
// (src/lib/components/dismiss.svelte.ts). The panel's half was pinned above;
// the menu's never was, even though it is the copy that started out doing
// nothing at all — a <details> toggles on its own summary and dismisses no
// other way.
test('the actions menu closes on Escape and on an outside click', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const menu = page.locator('summary').filter({ hasText: 'Actions' });
	const items = page.getByRole('menuitem');

	// Wait for focus, not merely for the item to be visible: <details> opens
	// itself the moment the summary is clicked, while moving focus to the first
	// item and attaching the key handler both happen in the effect that follows.
	// "Visible" is therefore true a tick before Escape can be heard.
	await menu.click();
	await expect(items.first()).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(items.first()).toBeHidden();
	await expect(menu).toBeFocused();

	await menu.click();
	await expect(items.first()).toBeFocused();
	await card(page, 'Schedule').getByRole('heading', { name: 'Schedule' }).click();
	await expect(items.first()).toBeHidden();
});

// The ARIA menu contract: opening lands on the first item, and the arrows walk
// the list rather than the page. Enabled items only — four of the five need a
// feasible schedule, and a disabled one must not be a stop on the way down.
test('the actions menu roves focus across its items', async ({ page }) => {
	await openRecipe(page, RECIPE);

	await page.locator('summary').filter({ hasText: 'Actions' }).click();
	const items = page.getByRole('menuitem');
	await expect(items.first()).toBeFocused();

	await page.keyboard.press('ArrowDown');
	await expect(items.nth(1)).toBeFocused();
	await page.keyboard.press('End');
	await expect(items.last()).toBeFocused();
	// past the end it wraps
	await page.keyboard.press('ArrowDown');
	await expect(items.first()).toBeFocused();
	await page.keyboard.press('ArrowUp');
	await expect(items.last()).toBeFocused();
});
