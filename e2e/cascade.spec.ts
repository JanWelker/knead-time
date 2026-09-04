import { expect, test } from '@playwright/test';
import { card, openRecipe } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// app.css's element defaults used to sit outside any cascade layer, which beats
// every Tailwind utility no matter how specific. Writing the obvious class did
// nothing, silently: `font-sans` on a heading, `focus:outline-none` on an input.
// They live in @layer base now. These two tests pin the consequence from both
// ends — a utility must be able to win, and the focus ring must still be there.

test('a utility can restyle a heading', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const face = (loc: ReturnType<typeof page.locator>) =>
		loc.first().evaluate((el) => {
			const cs = getComputedStyle(el);
			return { font: cs.fontFamily.split(',')[0].trim(), tracking: cs.letterSpacing };
		});

	// Untouched headings keep the display serif from the base rule...
	expect((await face(card(page, 'Schedule').locator('h2'))).font).toBe('ui-serif');
	// ...while the day label, which asks for sans and wide tracking with nothing
	// but utilities, actually gets them.
	const day = await face(card(page, 'Schedule').locator('h3'));
	expect(day.font).toBe('ui-sans-serif');
	expect(day.tracking).toBe('1.68px');
});

// The TRMNL uuid field carried `focus:outline-none`. It never took effect —
// the unlayered focus rule outranked it — so the field has always shown the
// ring. Layering would have handed that class its wish and left the input with
// no focus indicator at all, so the dead class was removed with the change.
// This is the check that the removal actually held.
test('every control keeps the focus ring, including the TRMNL uuid field', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const ring = (loc: ReturnType<typeof page.locator>) =>
		loc.first().evaluate((el: HTMLElement) => {
			el.focus();
			return getComputedStyle(el).outline;
		});

	expect(await ring(page.locator('form input[type="number"]'))).toBe('rgb(200, 64, 26) solid 2px');
	expect(await ring(page.locator('form select'))).toBe('rgb(200, 64, 26) solid 2px');

	// The trigger is a <summary>; Playwright does not expose it as a button.
	await page.locator('summary').filter({ hasText: 'Actions' }).click();
	await page.getByRole('menuitem', { name: 'Send to TRMNL…' }).click();
	const uuid = page.locator('dialog input[type="text"]');
	await expect(uuid).toBeVisible();
	expect(await ring(uuid)).toBe('rgb(200, 64, 26) solid 2px');
});
