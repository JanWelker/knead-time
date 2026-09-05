import { expect, test } from '@playwright/test';
import { chosenWindow, dateField, openRecipe, timeField, windowCard } from './helpers';

const CAPUTO = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265';
const FAR_BAKE = 'r=2026-09-06T17%3A00%3A00.000Z';

test('editing the bake time re-picks the longest good window', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}&sa=2026-09-05T09%3A00%3A00.000Z`);
	expect(await chosenWindow(page)).toBe('32 h');

	await dateField(page, 'bake').fill('2026-09-06');

	// Caputo Pizzeria's ceiling, not the rail's and not the deadline's.
	await expect.poll(() => chosenWindow(page)).toBe('40 h');
});

test('changing the flour re-picks too — both inputs of the ideal', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await dateField(page, 'bake').fill('2026-09-06');
	await expect.poll(() => chosenWindow(page)).toBe('40 h');

	const flour = page.locator('form select').first();
	await flour.selectOption('dallagiovanna-napoletana');
	await expect.poll(() => chosenWindow(page)).toBe('72 h');

	// and down again: a weaker flour must not leave you past its tolerance
	await flour.selectOption('supermarket-00');
	await expect.poll(() => chosenWindow(page)).toBe('6 h');
});

test('"not specified" has no band to aim at, so it leaves the window alone', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await dateField(page, 'bake').fill('2026-09-06');
	await expect.poll(() => chosenWindow(page)).toBe('40 h');

	await page.locator('form select').first().selectOption('none');
	expect(await chosenWindow(page)).toBe('40 h');
});

test('the W field re-picks on commit, not on every keystroke', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	await dateField(page, 'bake').fill('2026-09-06');
	await expect.poll(() => chosenWindow(page)).toBe('40 h');

	const w = page.locator('form label', { hasText: 'Flour strength' }).locator('input');
	// typing must not rewrite the schedule under the cursor
	await w.fill('310');
	expect(await chosenWindow(page)).toBe('40 h');

	await w.blur();
	await expect.poll(() => chosenWindow(page)).toBe('72 h');
});

test('emptying the W field does not silently discard the flour', async ({ page }) => {
	// A backspace used to write null through the binding, which reads as "no
	// flour stated": the preset select flipped to "not specified" and fw=0 went
	// into the share URL while the user was mid-edit.
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}`);
	const flour = page.locator('form select').first();
	const w = page.locator('form label', { hasText: 'Flour strength' }).locator('input');

	await w.fill('');
	await w.blur();

	await expect(flour).toHaveValue('caputo-pizzeria');
	await expect(w).toBeVisible();
	expect(new URL(page.url()).searchParams.get('fw')).not.toBe('0');
});

test('a start time after the bake is refused and explained', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);

	await dateField(page, 'start').fill('2026-09-05');

	// clamped to the bake moment rather than accepted as a negative window
	await expect(dateField(page, 'start')).toHaveValue('2026-09-02');
	await expect(timeField(page, 'start')).toHaveValue('19:00');
	await expect(page.locator('form [role="alert"]').first()).toContainText('after the bake');
});

test('the start field cannot be pushed past the bake by the picker either', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&r=2026-09-02T19%3A00%3A00.000Z`);
	await expect(dateField(page, 'start')).toHaveAttribute('max', '2026-09-02');
});

test('a drag that moves the start onto another day says so', async ({ page }) => {
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}&sa=2026-09-06T09%3A00%3A00.000Z`);

	const slider = page.locator('form input[type="range"]');
	await slider.focus();
	for (let i = 0; i < 6; i++) await slider.press('ArrowRight');

	await expect(windowCard(page).locator('[role="status"]')).toContainText('different day');
});

test('pulling the bake time back past the start drags the start with it', async ({ page }) => {
	// FormState.setReadyBy applies the startAt <= readyBy floor from the other
	// side, for the case where no window re-pick happens. Only "not specified"
	// reaches it — with a flour stated the re-pick rewrites the start anyway —
	// so the branch had no coverage at all, and stranding the start after the
	// bake is exactly the negative window setStartAt refuses from the front.
	await openRecipe(page, `v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=0&${FAR_BAKE}`);
	await expect(page.locator('form select').first()).toHaveValue('none');
	await dateField(page, 'start').fill('2026-09-05');
	await expect(dateField(page, 'start')).toHaveValue('2026-09-05');

	// bake moves to before the start
	await dateField(page, 'bake').fill('2026-09-03');

	await expect(dateField(page, 'start')).toHaveValue('2026-09-03');
	await expect(timeField(page, 'start')).toHaveValue(await timeField(page, 'bake').inputValue());
});

test('turning a pre-ferment on and off again gives the autolyse choice back', async ({ page }) => {
	// A biga already rests the flour, so the autolyse toggle is hidden while one
	// is on — but the flag is a real DoughInputs field, not a view preference,
	// and it has to survive being hidden. Only a browser sees the round trip.
	await openRecipe(page, `${CAPUTO}&${FAR_BAKE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	const autolyse = page.locator('form label', { hasText: 'Autolyse rest' }).locator('input');
	await expect(autolyse).toBeChecked();
	await autolyse.uncheck();
	await expect.poll(() => new URL(page.url()).searchParams.get('al')).toBe('0');

	const biga = page.locator('form label', { hasText: 'Biga (' }).locator('input');
	await biga.check();
	await expect(autolyse).toHaveCount(0); // hidden: the biga rests the flour

	await biga.uncheck();
	await expect(autolyse).not.toBeChecked();
	expect(new URL(page.url()).searchParams.get('al')).toBe('0');
});
