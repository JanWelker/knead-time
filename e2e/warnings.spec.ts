import { expect, test } from '@playwright/test';
import { openQuestion, openRecipe, region, windowCard } from './helpers';

// Which surface each warning is rendered on. warningSlots.ts pins the mapping;
// only a browser can show that all three mount points actually exist — a slot
// with no mount is a warning nobody ever sees, and the unit test cannot tell.
//
// The mount points moved with the restructure. The rule did not: a warning
// still reads next to what caused it. On the plan the causes are the values in
// the summary (the window, the room temperature) and the weights themselves —
// the fields that set them live in a sheet that has to be asked for, and a
// warning behind a button is a warning nobody sees.

const PLAN =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

test('the window warnings read with the plan’s window value', async ({ page }) => {
	// Weak flour, long window: past what it tolerates.
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=180&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-02T17%3A00%3A00.000Z'
	);

	const warning = page.getByRole('listitem').filter({ hasText: 'tolerates' });
	await expect(warning).toBeVisible();
	// Above the schedule, next to the chips it is about — not buried under it.
	const box = await warning.boundingBox();
	const schedule = await region(page, 'Schedule').boundingBox();
	expect(box!.y).toBeLessThan(schedule!.y);
});

test('the same warning follows the slider onto the ask flow', async ({ page }) => {
	// On the question screen the slider IS the page, so the window family reads
	// inside the control rather than beside a value.
	await openQuestion(
		page,
		'window',
		'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=180&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-02T17%3A00%3A00.000Z'
	);

	await expect(windowCard(page).getByRole('listitem')).toContainText('tolerates');
});

test('the temperature warning renders with the other plan-level notices', async ({ page }) => {
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=10&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T17%3A00%3A00.000Z'
	);

	await expect(page.getByRole('listitem').filter({ hasText: 'chilly' })).toBeVisible();
	// ...and not with the weights, which own a different family
	await expect(
		region(page, 'Ingredients').getByRole('listitem').filter({ hasText: 'chilly' })
	).toHaveCount(0);
});

test('the yeast warning renders with the weights', async ({ page }) => {
	// Cold room, very short window: the solve needs an unusual amount of yeast.
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=10&ft=4&fw=310&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-05T14%3A00%3A00.000Z'
	);

	// Exactly one live region carries it, and it is the one beside the weights.
	// (The schedule's own steps list "Fresh yeast" as an amount to weigh, which
	// is why this counts warning regions rather than list items.)
	const yeast = page.locator('ul[aria-live="polite"] li').filter({ hasText: 'Yeast' });
	await expect(yeast).toHaveCount(1);
	await expect(
		region(page, 'Ingredients').locator('ul[aria-live="polite"] li').filter({ hasText: 'Yeast' })
	).toHaveCount(1);
});

test('no warning is rendered twice, and none is dropped', async ({ page }) => {
	// A recipe that trips all three families at once.
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=10&ft=4&fw=310&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-05T14%3A00%3A00.000Z'
	);

	const all = await page.locator('ul[aria-live="polite"] li').allInnerTexts();
	const trimmed = all.map((t) => t.trim());
	expect(new Set(trimmed).size).toBe(trimmed.length);
	expect(trimmed.length).toBeGreaterThanOrEqual(2);
});

test('the schedule itself carries no warnings', async ({ page }) => {
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=10&ft=4&fw=180&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-02T17%3A00%3A00.000Z'
	);

	await expect(region(page, 'Schedule').locator('ul[aria-live="polite"]')).toHaveCount(0);
});

// WCAG 1.4.1: the two severities used to differ only in hue — red box versus
// tan box, same rounded rectangle, no icon, no wording. Anyone who cannot
// separate those two colours got no signal at all that one of these means a
// spoiled dough and the other is advice. The icons differ in SHAPE, and the
// severity is spoken in front of the message.
test('severity is carried by shape and wording, not colour alone', async ({ page }) => {
	// Weak flour on a long window (danger) in a cold kitchen (info).
	await openRecipe(
		page,
		'v=6&n=6&b=280&h=70&s=3&y=f&t=10&ft=4&fw=180&r=2026-09-08T17%3A00%3A00.000Z&sa=2026-09-05T17%3A00%3A00.000Z'
	);

	const danger = page.getByRole('listitem').filter({ hasText: 'tolerates' });
	const info = page.getByRole('listitem').filter({ hasText: 'chilly' });
	await expect(danger).toBeVisible();
	await expect(info).toBeVisible();

	// A triangle for danger, a circle for info — distinguishable without colour.
	await expect(danger.locator('svg path[d^="M7 1.6"]')).toHaveCount(1);
	await expect(danger.locator('svg circle[r="5.7"]')).toHaveCount(0);
	await expect(info.locator('svg circle[r="5.7"]')).toHaveCount(1);
	await expect(info.locator('svg path[d^="M7 1.6"]')).toHaveCount(0);

	// ...and named, for anyone who sees neither.
	await expect(danger.locator('.sr-only')).toHaveText('Warning:');
	await expect(info.locator('.sr-only')).toHaveText('Note:');
});

// The live region used to be created by the same {#if} that produced its first
// message. A region that arrives together with its content is not announced by
// most screen readers, so a warning appearing as the user dragged the window
// was silent for exactly the people depending on it. It has to be in the DOM
// while there is still nothing to say.
test('the live region is present before any warning is', async ({ page }) => {
	// A recipe that trips nothing.
	await openRecipe(page, PLAN);

	const regions = page.locator('main ul[aria-live="polite"]');
	await expect(regions).toHaveCount(3);
	await expect(page.locator('main ul[aria-live="polite"] li')).toHaveCount(0);
});
