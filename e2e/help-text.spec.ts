import { expect, test } from '@playwright/test';
import { formCard, openRecipe, windowCard } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// Standing help under every field was 32 % of the form's height in both views —
// 576 px of 1791 in expert. The expert view is the one that has opted out of
// being walked through, and it is the one paying for the fourteen extra
// controls it reveals, so that is where the help goes.
test('the beginner view keeps the help the expert view drops', async ({ page }) => {
	await openRecipe(page, `${RECIPE}&md=b`);
	await expect(formCard(page)).toContainText("The earliest you're available to start");
	await expect(formCard(page)).toContainText('The moment the first pizza goes in the oven');
	await expect(formCard(page)).toContainText('A spiral mixer kneads most efficiently');

	await openRecipe(page, RECIPE);
	await expect(formCard(page)).not.toContainText("The earliest you're available to start");
	await expect(formCard(page)).not.toContainText('The moment the first pizza goes in the oven');
	await expect(formCard(page)).not.toContainText('A spiral mixer kneads most efficiently');
});

// The window card is not per-field help — it is the slider's own readout, and
// the benefit paragraph was kept deliberately. Neither may follow the rest out.
test('the window card keeps its band caption and benefit in both views', async ({ page }) => {
	for (const query of [RECIPE, `${RECIPE}&md=b`]) {
		await openRecipe(page, query);
		await expect(windowCard(page)).toContainText('tolerates');
		await expect(windowCard(page)).toContainText('enzymes');
	}
});

// A notice that appears in response to a choice is not a description of a
// field. Both of these carry something the reader needs at the moment they
// show up — how to treat active dry yeast, and why the second share is capped —
// so they stay in the expert view where their controls live.
test('conditional notices survive in the expert view', async ({ page }) => {
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=a&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z'
	);
	await expect(formCard(page)).toContainText('Dissolve active dry yeast');

	await openRecipe(page, `${RECIPE}&p=b30_p20`);
	await expect(formCard(page)).toContainText('at most 80%');
});
