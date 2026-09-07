import { expect, test } from '@playwright/test';
import { openLibrary, openQuestion, openRecipe, region } from './helpers';

// A two-day cold plan, so the schedule really does group steps under more than
// one date heading.
const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

function outline(page: import('@playwright/test').Page) {
	return page.evaluate(() =>
		[...document.querySelectorAll('main h1, main h2, main h3, main h4')]
			// The adjust sheet and the TRMNL dialog live in the page but belong to
			// modals that are closed; they are not part of the document outline
			// being read.
			.filter((h) => !h.closest('dialog'))
			.map((h) => ({ level: Number(h.tagName[1]), text: h.textContent!.trim() }))
	);
}

// Every view names itself with exactly one h1 and hangs its regions off it.
// This is invisible in the markup diff and only shows up in the rendered
// outline, which is why it is a browser test.
test('the plan is headed by the bake moment, with its two regions under it', async ({ page }) => {
	await openRecipe(page, RECIPE);
	const heads = await outline(page);

	expect(heads[0].level).toBe(1);
	expect(heads[0].text).toContain('Ready to bake');
	expect(heads.filter((h) => h.level === 1)).toHaveLength(1);
	expect(heads.filter((h) => h.level === 2).map((h) => h.text)).toEqual([
		'Schedule',
		'Ingredients'
	]);

	// Every step title is an h4 introduced by an h3 date, never the other way
	// round: the first heading inside the schedule must be a day.
	const schedule = heads.slice(heads.findIndex((h) => h.text === 'Schedule'));
	const dayIdx = schedule.findIndex((h) => h.level === 3);
	const firstStep = schedule.findIndex((h) => h.level === 4);
	expect(dayIdx).toBeGreaterThan(-1);
	expect(firstStep).toBeGreaterThan(dayIdx);
	// More than one day, so the grouping is actually doing work here.
	expect(schedule.filter((h) => h.level === 3).length).toBeGreaterThan(1);
});

test('the ask flow is headed by its question, the library by its own title', async ({ page }) => {
	await openQuestion(page, 'window', RECIPE);
	let heads = await outline(page);
	expect(heads[0]).toEqual({ level: 1, text: 'How long should it ferment?' });
	expect(heads.filter((h) => h.level === 2).map((h) => h.text)).toEqual(['Your plan so far']);

	await openRecipe(page, RECIPE);
	await openLibrary(page);
	heads = await outline(page);
	expect(heads[0]).toEqual({ level: 1, text: 'Start from a recipe' });
	// The three collections are entry points now, gathered on one screen rather
	// than buried under the calculator.
	expect(heads.filter((h) => h.level === 2).map((h) => h.text)).toEqual([
		'My recipes',
		'Community recipes',
		'50 Top Pizza recipes'
	]);
});

test('no heading level is skipped, on any view', async ({ page }) => {
	for (const open of [() => openRecipe(page, RECIPE), () => openQuestion(page, 'when', RECIPE)]) {
		await open();
		const heads = await outline(page);
		for (let i = 1; i < heads.length; i++) {
			expect(
				heads[i].level - heads[i - 1].level,
				`after "${heads[i - 1].text}"`
			).toBeLessThanOrEqual(1);
		}
	}
});

// app.css styles `h1, h2, h3, .font-display` from inside @layer base, so a
// utility can still win — but the family comes from that rule, which reaches
// every heading whether or not it wants it. Turning the day label into an h3
// silently made it the display face and dropped its wide tracking; turning the
// step title into an h4 silently dropped the display face it had been
// inheriting. Both faces are pinned here because the markup gives no hint that
// the levels and the fonts are coupled.
test('changing a heading level does not change its typeface', async ({ page }) => {
	await openRecipe(page, RECIPE);

	const face = (loc: ReturnType<typeof page.locator>) =>
		loc.first().evaluate((el) => {
			const cs = getComputedStyle(el);
			return { font: cs.fontFamily.split(',')[0].trim(), tracking: cs.letterSpacing };
		});

	// The date band has always been the workhorse face with wide tracking; the
	// step title has always been the sign painter's.
	const day = await face(region(page, 'Schedule').locator('h3'));
	const step = await face(page.locator('main ol h4'));
	expect(day.font).toBe('Archivo');
	expect(day.tracking).toBe('1.68px');
	expect(step.font).toBe('Anton');
});
