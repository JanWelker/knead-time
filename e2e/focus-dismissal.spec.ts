import { expect, test } from '@playwright/test';
import { menuTrigger, openAdjust, openMenu, openRecipe, sheet } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

const RING = 'rgb(200, 64, 26) solid 3px';

// The global focus rule listed input, select, button and textarea. Both of the
// element types it left out are used here as primary controls, not as prose:
// every disclosure in the app is a styled <summary>, and every "Open" in the
// recipe tables is an <a>. They fell back to the browser default ring, which
// differs by engine and is easy to lose against a dark surface.
test('links and disclosure triggers get the same focus ring as the rest', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const ring = (loc: ReturnType<typeof page.locator>) =>
		loc.first().evaluate((el: HTMLElement) => {
			el.focus();
			return getComputedStyle(el).outline;
		});

	expect(await ring(page.locator('footer a')), 'a footer link').toBe(RING);
	expect(await ring(page.locator('summary')), 'a disclosure trigger').toBe(RING);

	await openAdjust(page);
	// unchanged, and the reason the rule exists
	expect(await ring(sheet(page).locator('input[type="number"]'))).toBe(RING);
});

// The actions menu beside it dismisses on outside-click and Escape; this panel
// did neither, so once opened it floated over the plan it describes until the
// same summary was clicked again.
test('the fit-score panel closes on Escape and on an outside click', async ({ page }) => {
	await openRecipe(page, RECIPE);

	// By the summary's own accessible name: "fit" as a substring also matches the
	// Get nerdy panel, which explains the fit score.
	const details = page
		.locator('details')
		.filter({ has: page.locator('summary[aria-label^="Recipe fit"]') });
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
	await page.getByRole('heading', { name: 'Schedule' }).click();
	await expect(details).not.toHaveAttribute('open', '');
});

// The menu and the fit panel share one dismissal rule
// (src/lib/components/dismiss.svelte.ts). The panel's half was pinned above;
// the menu's never was, even though it is the copy that started out doing
// nothing at all — a <details> toggles on its own summary and dismisses no
// other way.
test('the actions menu closes on Escape and on an outside click', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const menu = menuTrigger(page);
	const items = page.getByRole('menuitem');

	// Wait for focus, not merely for the item to be visible: <details> opens
	// itself the moment the summary is clicked, while moving focus to the first
	// item and attaching the key handler both happen in the effect that follows.
	// "Visible" is therefore true a tick before Escape can be heard. openMenu()
	// itself waits for nothing, so the wait stays here where its reason is.
	await openMenu(page);
	await expect(items.first()).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(items.first()).toBeHidden();
	await expect(menu).toBeFocused();

	await openMenu(page);
	await expect(items.first()).toBeFocused();
	await page.getByRole('heading', { name: 'Schedule' }).click();
	await expect(items.first()).toBeHidden();
});

// The ARIA menu contract: opening lands on the first item, and the arrows walk
// the list rather than the page. Enabled items only — four of the actions need
// a feasible schedule, and a disabled one must not be a stop on the way down.
//
// Both roles, in DOM order: the language and theme rows are menuitemradio, the
// right role for a set of mutually exclusive choices, and focus has to reach
// them too. Asking only for `menuitem` walked to the last *command* and then
// disagreed with End, which lands on the last row of the panel.
test('the masthead menu roves focus across its items', async ({ page }) => {
	await openRecipe(page, RECIPE);

	await openMenu(page);
	const items = page.locator('[role="menuitem"], [role="menuitemradio"]');
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

// ModeBadge registered its dismissal handlers whether or not it had a panel to
// dismiss. Two of its three callers — the ask flow's ticket stub and the adjust
// sheet's header — render the seal without `explain`, so each left a permanent
// pair of document listeners behind, guarding a <details> that never existed.
// Nothing visible went wrong, which is why it lasted: the guard read a null ref
// and did nothing, on every click and every key, on every view. Chromium's
// debugger is the only place a document listener can be counted from, so this
// asks it directly: one keydown listener per seal that actually opens.
test('a seal without a panel attaches no dismissal listeners', async ({ page }) => {
	const keydownListeners = async () => {
		const cdp = await page.context().newCDPSession(page);
		const { result } = await cdp.send('Runtime.evaluate', { expression: 'document' });
		const { listeners } = await cdp.send('DOMDebugger.getEventListeners', {
			objectId: result.objectId!
		});
		await cdp.detach();
		return listeners.filter((l) => l.type === 'keydown').length;
	};

	// The first question: the stub's seal and the sheet's seal are both on the
	// page, neither opens, and nothing else on this view listens for a key.
	await openRecipe(page, RECIPE, '#ask/when');
	await expect(page.locator('details:has(.seal-panel)')).toHaveCount(0);
	expect(await keydownListeners()).toBe(0);

	// The plan: the mode seal and the fit seal open, the sheet's seal does not.
	// The menu attaches its handler only while open, so it is not in the count.
	await openRecipe(page, RECIPE);
	await expect(page.locator('details:has(.seal-panel)')).toHaveCount(2);
	expect(await keydownListeners()).toBe(2);
});
