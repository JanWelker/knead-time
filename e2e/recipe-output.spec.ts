import { expect, test } from '@playwright/test';
import { chooseInMenu, NOW, openAdjust, openLibrary, openRecipe, region, sheet } from './helpers';

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

test('"Round numbers" never leaves the ball-weight box outside its own band', async ({ page }) => {
	// 1 × 100 g rounds ~58 g of flour to 50 g, which asks for an 86.5 g ball.
	// The result went into the raw field, which is not clamped — only the
	// derived inputs are — so the box read 86.5 while the recipe silently used
	// 100. The existing round-numbers test starts from the middle of the band,
	// where the snap never leaves it, so nothing caught it.
	await openRecipe(page, `v=6&n=1&b=100&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z`);

	const round = page.locator('button:has-text("Round numbers")');
	await round.click();
	await openAdjust(page);
	const ball = sheet(page).locator('label', { hasText: 'Ball weight' }).locator('input');
	const min = Number(await ball.getAttribute('min'));
	expect(Number(await ball.inputValue())).toBeGreaterThanOrEqual(min);
	await expect(ball).toHaveValue('100');
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

// The ingredient rows of one rendering, "label amount" per two-cell row, for
// holding the screen and the paper together. The summary block beside the print
// ticket is a table too — only the ingredient ones are passed in.
const ingredientRows = (scope: ReturnType<typeof region>) =>
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

test('the print sheet shows the recipe in its URL, not the prerendered defaults', async ({
	page
}) => {
	// issue #191: print is its own SSR route and had drifted from the screen.
	// This used to read "Flour", "Water", "Salt" and a step title off the body
	// straight after `goto` — every one of which the prerendered defaults
	// already print — so it compared nothing and waited for nothing. Five 260 g
	// balls are not the defaults; their total is what the sheet has to reach.
	const PLAIN = `v=6&n=5&b=260&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z&sa=2026-09-05T09%3A00%3A00.000Z`;
	await openRecipe(page, PLAIN);
	const onScreen = await ingredientRows(region(page, 'Ingredients'));
	// flour, water, salt, yeast and the total — one flat table, no pre-dough
	expect(onScreen).toHaveLength(5);

	await page.clock.install({ time: NOW });
	// the route auto-calls window.print() on mount; stub it so the run is headless-safe
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/print/en?${PLAIN}`);
	await expect(page.locator('.printpage-ingredients')).toContainText('1300 g');

	expect(await ingredientRows(page.locator('.printpage-ingredients'))).toEqual(onScreen);
	await expect(page.locator('body')).toContainText('Weigh & prep');
});

// The screen and the print sheet now render one list (src/lib/ingredientRows.ts)
// rather than building the same tables in two places. This is the check that
// they still agree, on the recipe with the most to disagree about: two
// pre-doughs, a main dough and a totals section, with oil and sugar in play.
test('the print sheet weighs exactly what the screen weighs', async ({ page }) => {
	const RICH = `v=6&${BASE}&o=2&sg=1&p=b30_p20&sa=2026-09-05T09%3A00%3A00.000Z`;
	const rows = ingredientRows;

	await openRecipe(page, RICH);
	const onScreen = await rows(region(page, 'Ingredients'));
	// Biga (flour, water, yeast) + poolish (the same three) + main dough
	// (flour, water, salt, oil, sugar) + totals (flour, water, salt, oil,
	// sugar, yeast) + the total-dough line = 3 + 3 + 5 + 6 + 1. Pinned: the
	// row count for a fixed recipe is deterministic, and `> 10` left a
	// dropped row invisible.
	expect(onScreen).toHaveLength(18);

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

test('the German print sheet punctuates the yeast percentage the German way', async ({ page }) => {
	// ingredientRows called formatPercent without the locale, so every locale
	// printed "0.35%" - English punctuation beside German weights. The unit
	// pin on formatPercent(x, 'de') never reached a renderer; this is the
	// paper itself.
	await page.addInitScript(() => {
		window.print = () => {};
	});
	// Five 260 g balls, because the German sheet is prerendered with the six
	// 280 g defaults and a fresh-yeast row: every assertion below was already
	// true before the URL's recipe arrived, which is the trap the sibling test
	// two below documents. The 1300 g total only exists once it has.
	await page.goto(
		`/print/de?v=6&n=5&b=260&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z&sa=2026-09-05T09%3A00%3A00.000Z`
	);
	const ingredients = page.locator('.printpage-ingredients').last();
	await expect(ingredients).toContainText(/1300\s?g/);
	await expect(ingredients).toContainText('Frischhefe');
	await expect(ingredients).toContainText(/\(\d+,\d+\s%\)/);
	await expect(ingredients).not.toContainText(/\d\.\d+%/);
});

test('the German print sheet punctuates the weights the German way too', async ({ page }) => {
	// The percentage was fixed one PR before the weights, which left the German
	// sheet reading "1.3 g" on the very row whose hint said "0,35 %". Weights
	// reach the paper through three separate renderers — the ingredient ticket,
	// the batch line and the schedule's own step lists — so this reads the
	// whole page rather than one table.
	await page.addInitScript(() => {
		window.print = () => {};
	});
	// A small batch, so the yeast lands under a gram and shows its decimals.
	await page.goto(`/print/de?v=6&n=2&b=180&h=70&s=3&y=f&t=22&ft=4&r=2026-09-06T17%3A00%3A00.000Z`);
	const sheet = page.locator('body');
	// 2 × 180 g = 360 g: wait for the decoded recipe before reading the page,
	// or the prerendered defaults answer for it.
	await expect(sheet).toContainText(/360\s?g/);
	await expect(sheet).toContainText('Frischhefe');
	await expect(sheet).toContainText(/\d,\d+\sg/);
	await expect(sheet).not.toContainText(/\d\.\d+\sg/);
});

// `app.html` carried `lang="en"` for every page, so all five prerendered print
// sheets claimed English while shipping German, Italian, French or Dutch. The
// app route corrects itself after hydration, which is exactly the fix the print
// route cannot rely on: it is SSR'd and prerendered *because* the print dialog
// can fire before the bundle has parsed. So this reads the raw bytes with
// `page.request.get` — no browser, no hydration — which is the only way to see
// what a screen reader, a translator or a print-to-PDF gets on a cold cache.
test('each prerendered print sheet declares the language it is written in', async ({ page }) => {
	for (const [path, lang] of [
		['/print/de', 'de'],
		['/print/nl', 'nl'],
		// No locale in the path is English, which is what the attribute used to
		// say for everyone.
		['/print', 'en'],
		['/print/en', 'en']
	]) {
		const html = await (await page.request.get(path)).text();
		expect(html, path).toContain(`<html lang="${lang}"`);
	}

	// And the app route, which is not locale-addressed, keeps the value it had.
	expect(await (await page.request.get('/')).text()).toContain('<html lang="en"');
});

// The print sheet forces `background: #fff !important` and prints black on
// white, but the layout used to call `theme.init()` on every route — so on a
// dark system the pre-paint boot script's `dark` class stayed on the element
// and brought `color-scheme: dark` with it, styling the browser's own widgets
// and scrollbars against a page that is white by decree.
test.describe('the print sheet on a machine set to dark', () => {
	test.use({ colorScheme: 'dark' });

	test('is not dressed in the dark palette', async ({ page }) => {
		await page.clock.install({ time: NOW });
		await page.addInitScript(() => {
			window.print = () => {};
		});
		await page.goto(`/print/en?v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
		await expect(page.locator('.printpage-ingredients').first()).toBeVisible();

		await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
		expect(await page.locator('html').evaluate((el) => getComputedStyle(el).colorScheme)).toBe(
			'light'
		);

		// The app route on the same machine still resolves dark — this is about
		// the print sheet, not about disabling the theme.
		await page.goto(`/?v=6&${BASE}&sa=2026-09-05T09%3A00%3A00.000Z`);
		await expect(page.locator('html')).toHaveClass(/\bdark\b/);
	});
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

// The weights were fixed in PR #346 and the percentage one PR before that, and
// both times a renderer further out kept the English point: the plan's expert
// chips and the print summary wrote `${saltPercent} %` as a template string,
// and the library's numLabel concatenated its own suffix. Salt steps by 0.1
// and the room by 0.5, so both carry a decimal to get wrong. Three tests, one
// per renderer, each on a value whose default has no decimal — so the
// prerendered page cannot satisfy them before the recipe is decoded.
const DECIMALS = 'v=7&n=6&b=280&h=70&s=2.5&y=f&t=22.5&ft=4&r=2026-09-06T17%3A00%3A00.000Z';

test('the German plan punctuates a decimal salt and a half-degree room the German way', async ({
	page
}) => {
	await openRecipe(page, `${DECIMALS}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await chooseInMenu(page, 'Deutsch');

	const chips = page.locator('.chip-field');
	await expect(chips.filter({ hasText: /2,5\s%/ })).toHaveCount(1);
	await expect(chips.filter({ hasText: /22,5\s°C/ })).toHaveCount(1);
	await expect(chips.filter({ hasText: /\d\.\d/ })).toHaveCount(0);
});

test('the German print summary punctuates the salt and the temperatures the German way', async ({
	page
}) => {
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/print/de?${DECIMALS}&sa=2026-09-05T09%3A00%3A00.000Z`);
	const summary = page.locator('.printpage-summary');
	await expect(summary).toContainText(/2,5\s%/);
	await expect(summary).toContainText(/22,5\s°C/);
	await expect(summary).not.toContainText(/\d\.\d/);
});

test('the German library punctuates a pizzeria’s decimal salt the German way', async ({ page }) => {
	// Pepe in Grani's row carries 2.75 % salt; it is the one figure on the rack
	// with two decimals.
	await openRecipe(page, `${DECIMALS}&sa=2026-09-05T09%3A00%3A00.000Z`);
	await openLibrary(page);
	await chooseInMenu(page, 'Deutsch');
	const rack = page.locator('details').filter({
		has: page.getByRole('heading', { name: /50.Top.Pizza/ })
	});
	await rack.locator('summary').first().click();
	await expect(rack).toContainText(/2,75\s%/);
	await expect(rack).not.toContainText(/2\.75/);
});
