import { expect, test } from '@playwright/test';
import { NOW, openAdjust, openRecipe, region, sheet } from './helpers';

const BASE = 'n=6&b=280&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z';

test('no ingredient is weighed twice across the schedule', async ({ page }) => {
	// PR #182: the mix step used to repeat prep's whole ingredient list, so the
	// baker weighed the flour twice. With no pre-ferment there is exactly one
	// weighing of each thing, on exactly one step.
	await openRecipe(page, `v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	const schedule = region(page, 'Schedule');
	for (const name of [/^Flour$/, /^Water$/, /^Salt$/]) {
		await expect(schedule.locator('span').filter({ hasText: name })).toHaveCount(1);
	}
});

test('oil and sugar rows appear only when the recipe uses them', async ({ page }) => {
	await openRecipe(page, `v=6&${BASE}`);
	const ingredients = region(page, 'Ingredients');
	await expect(ingredients).not.toContainText('Oil');
	await expect(ingredients).not.toContainText('Sugar');

	await openRecipe(page, `v=6&${BASE}&o=3&sg=1`);
	await expect(region(page, 'Ingredients')).toContainText('Oil');
	await expect(region(page, 'Ingredients')).toContainText('Sugar');
});

test('a pre-ferment carries all the fresh yeast, none on baking day', async ({ page }) => {
	await openRecipe(page, `v=6&${BASE}&p=b30&sa=2026-09-04T09%3A00%3A00.000Z`);

	const ingredients = region(page, 'Ingredients');
	await expect(ingredients).toContainText('Biga');
	await expect(ingredients).toContainText('Totals');
	// the main-dough section hides its yeast row; the totals row surfaces it
	const mainDough = ingredients.locator('table').nth(1);
	await expect(mainDough).not.toContainText('yeast');
});

test('the ingredients list names the flour that was picked', async ({ page }) => {
	// The row read a generic "Flour" while the form above it already knew the
	// bag. The name lives in the preset table, which only the mounted form
	// reaches, so nothing but a browser check covers the wiring.
	await openRecipe(page, `v=6&${BASE}`);
	await expect(region(page, 'Ingredients').locator('tr').first()).toContainText('Caputo Pizzeria');

	// a hand-typed strength matches no bag, so the row keeps the generic label
	await openRecipe(page, `v=6&${BASE}&fw=300`);
	await expect(region(page, 'Ingredients').locator('tr').first()).toContainText('Flour');
});

test('"Round numbers" lands the flour on a tidy figure and is idempotent', async ({ page }) => {
	await openRecipe(page, `v=6&n=6&b=283.5&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z`);

	const ball = () => sheet(page).locator('label', { hasText: 'Ball weight' }).locator('input');
	const round = page.locator('button:has-text("Round numbers")');
	await round.click();
	await openAdjust(page);
	const ballAfterFirst = await ball().inputValue();
	await page.getByRole('button', { name: 'Done', exact: true }).click();

	// first row is the flour — it is labelled with the chosen bag's name, not
	// the word "Flour", so address it by position
	const flour = await region(page, 'Ingredients').locator('tr').first().innerText();
	const grams = Number(flour.replace(/[^\d.]/g, ''));
	expect(grams % 50).toBe(0);

	// second click is a no-op — the snap must not creep
	await round.click();
	await openAdjust(page);
	await expect(ball()).toHaveValue(ballAfterFirst);
});

test('a pre-v5 link reproduces its original no-autolyse recipe', async ({ page }) => {
	// The version gate: `al` is absent from old links and must read as OFF,
	// or every bookmark silently gains a rest step it never had.
	await openRecipe(page, `v=4&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await expect(region(page, 'Schedule')).not.toContainText('Autolyse');

	await openRecipe(page, `v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await expect(region(page, 'Schedule')).toContainText('Autolyse');
});

test('a pre-v6 link claims no flour it was never made with', async ({ page }) => {
	await openRecipe(page, `v=5&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await openAdjust(page);

	await expect(sheet(page).locator('select').first()).toHaveValue('none');
});

test('the print route renders the same recipe as the screen', async ({ page }) => {
	// issue #191: print is its own SSR route and had drifted from the screen.
	await page.clock.install({ time: NOW });
	// the route auto-calls window.print() on mount; stub it so the run is headless-safe
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/print/en?v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	await expect(page.locator('body')).toContainText('Flour');
	await expect(page.locator('body')).toContainText('Water');
	await expect(page.locator('body')).toContainText('Salt');
	await expect(page.locator('body')).toContainText('Weigh & prep');
});

// The screen and the print sheet now render one list (src/lib/ingredientRows.ts)
// rather than building the same tables in two places. This is the check that
// they still agree, on the recipe with the most to disagree about: two
// pre-doughs, a main dough and a totals section, with oil and sugar in play.
test('the print sheet weighs exactly what the screen weighs', async ({ page }) => {
	const RICH = `v=6&${BASE}&o=2&sg=1&p=b30_p20&sa=2026-09-05T09%3A00%3A00.000Z`;
	const rows = (scope: ReturnType<typeof region>) =>
		scope.locator('tr').evaluateAll((trs) =>
			trs
				.map((tr) => {
					const cells = tr.querySelectorAll('th, td');
					return cells.length === 2
						? `${cells[0].textContent} ${cells[1].textContent}`.replace(/\s+/g, ' ').trim()
						: '';
				})
				.filter(Boolean)
		);

	await openRecipe(page, RICH);
	const onScreen = await rows(region(page, 'Ingredients'));
	// biga + poolish + main + totals, each with its rows, plus the total line
	expect(onScreen.length).toBeGreaterThan(10);

	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/print/en?${RICH}`);
	// Wait for the decoded recipe, exactly as waitForHydration does on the main
	// route: the print page ships prerendered with DEFAULT_INPUTS and swaps in
	// the URL's recipe on hydration, so reading straight after `goto` could
	// compare the paper against numbers that were never asked for. It did, once,
	// under parallel load — the run reported the defaults as "the paper".
	await expect(page.locator('.printpage-ingredients').last()).toContainText('Oil');
	// The summary block beside it is a table too — only the ingredient ones count.
	const onPaper = await rows(page.locator('.printpage-ingredients'));

	expect(onPaper).toEqual(onScreen);
});

test('the flour select is shelved by what each strength is for', async ({ page }) => {
	// Twelve bag names in a flat list say nothing about which one suits the
	// plan. The shelves are cut on W, labelled by ferment length, with the AVPN
	// spec (w220-380) at the outer edges.
	await openRecipe(page, `v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await openAdjust(page);

	const groups = sheet(page).locator('select').first().locator('optgroup');
	await expect(groups).toHaveCount(6);
	await expect(groups.first()).toHaveAttribute('label', /Too weak/);
	await expect(groups.last()).toHaveAttribute('label', /Very strong/);

	// the weakest shelf holds the supermarket flour and nothing else
	await expect(groups.first().locator('option')).toHaveCount(1);
	await expect(groups.first().locator('option')).toContainText('W 180');

	// and every preset still lives on exactly one shelf
	const inGroups = await groups.locator('option').count();
	expect(inGroups).toBe(12);
});

test.describe('a flour name too long for one line', () => {
	test.use({ viewport: { width: 320, height: 900 } });

	// The leader used to be a flex child sized with flex-1, and a flex item
	// cannot sit on the last line of a sibling that wrapped: at a narrow measure
	// "Dallagiovanna La Napoletana" took two lines, the leader collapsed to its
	// min-width and left a four-dot stub floating in the middle of the row, with
	// the weight centred across both lines. Only a browser shows it — the markup
	// was correct and every unit test passed — and only at a width narrow enough
	// to wrap the longest preset name, which is why it shipped.
	test('the leader reaches the weight on the line the name ends on', async ({ page }) => {
		// W 310 is Dallagiovanna La Napoletana, the longest name in the list.
		await openRecipe(page, `v=6&${BASE}&fw=310&sa=2026-09-05T09%3A00%3A00.000Z`);
		// Whether the name wraps is a question about text metrics, so it has to be
		// asked after the webfonts have swapped in. Without this the check races
		// the font: it passed alone and failed under parallel load, measuring the
		// fallback face, which sets the name narrow enough to fit on one line.
		await page.evaluate(() => document.fonts.ready);

		const ticket = region(page, 'Ingredients');
		// Where the text actually lands, not the box it sits in: a table cell's
		// own rect is the full row height and says nothing about the line.
		const textRect = (locator: ReturnType<typeof ticket.locator>) =>
			locator.evaluate((el) => {
				const range = document.createRange();
				range.selectNodeContents(el);
				const box = range.getBoundingClientRect();
				return { top: box.top, bottom: box.bottom, height: box.height };
			});

		const longRow = ticket.locator('tr').filter({ hasText: 'Dallagiovanna La Napoletana' });
		const name = await textRect(longRow.locator('th'));
		const weight = await textRect(longRow.locator('td'));
		const oneLine = await textRect(
			ticket.locator('tr').filter({ hasText: 'Water' }).first().locator('th')
		);

		// It really is wrapping here — otherwise this test proves nothing.
		expect(name.height).toBeGreaterThan(oneLine.height * 1.5);

		// The weight sits on the last line of the name rather than halfway up it:
		// the two text bottoms line up. Centred across two lines — the bug — put
		// them roughly half a line apart.
		expect(Math.abs(name.bottom - weight.bottom)).toBeLessThan(6);

		// And the leader is painted by the cell, so it has a last line to sit on
		// at any number of lines. The stub was a separate box between the two.
		await expect(longRow.locator('th')).toHaveClass(/leader-cell/);
		expect(
			await longRow.locator('th').evaluate((el) => getComputedStyle(el).backgroundImage)
		).toContain('gradient');
	});
});
