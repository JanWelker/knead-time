import { expect, test } from '@playwright/test';
import { formCard, openRecipe, windowCard } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

const START_HELP = "The earliest you're available to start";
const OIL_HELP = 'Olive oil or similar';
const AUTOLYSE_HELP = 'Rest flour and water for 30 min';

// Standing help under every field was 32 % of the form's height — 576 px of
// 1791 in expert. Beginner reads it standing; expert reads it while editing.
// Assertions are about VISIBILITY, not text: the copy is in the DOM either
// way, which is the whole point of it still being reachable.
test('beginner shows the help standing', async ({ page }) => {
	await openRecipe(page, `${RECIPE}&md=b`);
	await expect(page.getByText(START_HELP)).toBeVisible();
	await expect(formCard(page).getByText('A spiral mixer kneads most efficiently')).toBeVisible();
});

test('expert shows nothing at rest, and the field being edited explains itself', async ({
	page
}) => {
	await openRecipe(page, RECIPE);
	await expect(page.getByText(START_HELP)).toBeHidden();

	await page.locator('form input[type="date"]').first().focus();
	await expect(page.getByText(START_HELP)).toBeVisible();

	// ...and it goes away again, so the form does not accumulate height.
	await page.locator('form select').first().focus();
	await expect(page.getByText(START_HELP)).toBeHidden();
});

// The fix this file exists for. These notes describe fields the beginner view
// never renders, so hiding help in expert left them with no view at all —
// `oil` in particular carries a number a reader cannot infer from the label.
test('the notes on expert-only fields are reachable again', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const oil = page.getByText(OIL_HELP);
	await expect(oil).toBeHidden();
	await page.getByLabel('Oil (% of flour)').focus();
	await expect(oil).toBeVisible();

	const autolyse = page.getByText(AUTOLYSE_HELP);
	await expect(autolyse).toBeHidden();
	await page.getByRole('checkbox', { name: /Autolyse/ }).focus();
	await expect(autolyse).toBeVisible();
});

// The window card is the slider's own readout, not per-field help, and the
// benefit paragraph was kept visible on purpose. Neither may follow the rest.
test('the window card keeps its band caption and benefit in both views', async ({ page }) => {
	for (const query of [RECIPE, `${RECIPE}&md=b`]) {
		await openRecipe(page, query);
		await expect(windowCard(page).getByText(/tolerates/)).toBeVisible();
		await expect(windowCard(page).getByText(/enzymes/)).toBeVisible();
	}
});

// A notice that appears in response to a choice is not a description of a
// field: both of these are needed at the moment they show up, so they stand.
test('conditional notices stay visible in the expert view', async ({ page }) => {
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=a&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z'
	);
	await expect(formCard(page).getByText('Dissolve active dry yeast')).toBeVisible();

	await openRecipe(page, `${RECIPE}&p=b30_p20`);
	await expect(formCard(page).getByText(/at most 80%/)).toBeVisible();
});
