import { expect, test } from '@playwright/test';
import { openRecipe } from './helpers';
import { INFO_SECTIONS } from '../src/lib/infoSections';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// The "Get nerdy" panel is a contract: every calculation the app performs has
// to be represented there. infoSections.test.ts holds the list against the
// message bundle; this holds the rendered panel against the list, so a section
// cannot be dropped from the markup with both suites green. It is the half
// that can only be checked in a browser — the panel is a <details> that ships
// closed, and expert-only besides.
test('the nerdy panel renders every section and every formula', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const panel = page.locator('form details').filter({ hasText: 'Get nerdy' });
	await panel.locator('summary').click();

	// Each section is one heading paragraph plus its parts.
	await expect(panel.locator('p.font-semibold')).toHaveCount(INFO_SECTIONS.length);

	const formulas = INFO_SECTIONS.flatMap((s) =>
		s.parts.filter((p) => p.kind === 'formula').map((p) => p.formula)
	);
	await expect(panel.locator('pre')).toHaveCount(formulas.length);
	expect(await panel.locator('pre').allInnerTexts()).toEqual(formulas);
});
