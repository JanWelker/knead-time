import { expect, test } from '@playwright/test';
import {
	openAdjust,
	openLibrary,
	openMenu,
	openQuestion,
	openRecipe,
	region,
	sheet,
	view
} from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// The plan used to open with the schedule on a phone; it opens with the ticket
// now — the weights are what you reach for first at the counter, and the
// schedule is what you come back to between steps. Both cards used to sit
// behind the form as well, measured at 2.2 screens down; the inputs have left
// the page entirely, so the ticket is genuinely the top of the plan. Only a
// browser can show which one a phone actually meets first.
test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the ingredients come before the schedule on a phone', async ({ page }) => {
		await openRecipe(page, RECIPE);

		const schedule = await region(page, 'Schedule').boundingBox();
		const ingredients = await region(page, 'Ingredients').boundingBox();
		expect(schedule).not.toBeNull();
		expect(ingredients).not.toBeNull();

		// Single column here, so "before" is purely vertical.
		expect(ingredients!.y).toBeLessThan(schedule!.y);
	});
});

test.describe('desktop', () => {
	test.use({ viewport: { width: 1440, height: 1000 } });

	test('the weights sit beside the schedule, and no form sits on the plan', async ({ page }) => {
		await openRecipe(page, RECIPE);

		const schedule = await region(page, 'Schedule').boundingBox();
		const ingredients = await region(page, 'Ingredients').boundingBox();

		// Left-hand rail, level with the schedule — both are outputs, and the
		// plan is the one screen where nothing competes with them. The ticket is
		// the narrow column, so it reads as the stub beside the ticket rather
		// than as a second document.
		expect(ingredients!.x + ingredients!.width).toBeLessThanOrEqual(schedule!.x + 2);
		expect(Math.abs(ingredients!.y - schedule!.y)).toBeLessThan(20);
		expect(ingredients!.width).toBeLessThan(schedule!.width);

		// Source order IS the order at both widths — nothing is placed against
		// the grid, so the eye and the reading order can never end up on
		// different cards. The phone rule above is about what a screen reader
		// and the tab key meet first, not only about what is on top.
		const ticketFirst = await page.evaluate(() => {
			const cards = [...document.querySelectorAll('main section.card-loud, main aside.card-loud')];
			return (
				cards.findIndex((c) => c.tagName === 'ASIDE') <
				cards.findIndex((c) => c.tagName === 'SECTION')
			);
		});
		expect(ticketFirst).toBe(true);

		// The whole point of the restructure: the twelve inputs are in a sheet
		// that has to be asked for, so the plan carries no visible form at all.
		await expect(page.locator('form:visible')).toHaveCount(0);
	});
});

// A <label> names its FIRST labelable descendant, so wrapping a date box and a
// time box in one label left both time boxes with no accessible name at all —
// on the two inputs the whole app schedules from. Caught in the accessibility
// tree, not in the markup, which is why this lives in the browser suite.
test('both halves of each date+time pair have an accessible name', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	for (const name of [
		'Start time — Date',
		'Start time — Time',
		'Ready to bake — Date',
		'Ready to bake — Time'
	]) {
		await expect(sheet(page).getByLabel(name)).toBeVisible();
	}
});

// These five controls were 20 px tall. That still passed WCAG 2.5.8, but only
// via the spacing exception — they conformed because nothing happened to sit
// within 24 px of them, which is a property of the current layout rather than
// of the controls. A reflow (a warning appearing, copy growing in another
// locale) could take it away silently. 24 px is now intrinsic to each one.
//
// The ask flow's progress divisions are on the list because the painted mark is
// only 24 px tall by design — a measure ruled across the sheet, not a row of
// buttons — so the target has to be the full height of the strip.
test.describe('tap targets', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the small controls are at least 24px without relying on their neighbours', async ({
		page
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				'kneadtime:recipes',
				JSON.stringify([
					{ name: 'Saturday', search: 'v=6&n=6&b=280', savedAt: '2026-08-30T10:00:00Z' }
				])
			);
		});
		// Expert view, and a 48 h window against a 40 h ideal so "Use best" shows.
		await openRecipe(
			page,
			'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-03T17%3A00%3A00.000Z'
		);
		await openAdjust(page);

		for (const name of ['Now', 'Use best', 'All options']) {
			const box = await page.getByRole('button', { name, exact: true }).first().boundingBox();
			expect(box, `${name} is not on the page`).not.toBeNull();
			expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(24);
			expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(24);
		}

		await page.getByRole('button', { name: 'Done', exact: true }).click();

		// The fit-score disclosure is a <summary>, not a button.
		const fit = await page.locator('summary[aria-label$="of 5 stars"]').boundingBox();
		expect(fit!.height).toBeGreaterThanOrEqual(24);

		// Delete lives in the recipe library now, not at the foot of the page.
		await openLibrary(page);
		const del = await page
			.getByRole('button', { name: 'Delete', exact: true })
			.first()
			.boundingBox();
		expect(del, 'Delete is not on the page').not.toBeNull();
		expect(del!.height).toBeGreaterThanOrEqual(24);
		expect(del!.width).toBeGreaterThanOrEqual(24);
		await page.getByRole('button', { name: 'Back to your plan' }).click();

		// One division of the ask flow's progress rule.
		await page.getByRole('button', { name: 'Guide me' }).click();
		const dot = await page
			.getByRole('navigation', { name: 'Questions' })
			.getByRole('button')
			.first()
			.boundingBox();
		expect(dot!.height).toBeGreaterThanOrEqual(24);
		expect(dot!.width).toBeGreaterThanOrEqual(24);
	});
});

// This design draws with hard edges instead of shadows: a solid offset block
// beside the schedule card, header bands and day dividers pulled out of their
// card's padding with negative margins, and perforation notches hung off the
// card's own rule. Every one of those paints OUTSIDE the box it belongs to, so
// any of them can widen the document by a few pixels and put a horizontal
// scrollbar under a phone — which is exactly the width the app has to read at.
// Nothing in the markup hints at it; only a rendered page can say.
test.describe('nothing paints past the edge of the page', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	const noSidewaysScroll = async (page: import('@playwright/test').Page) => {
		const { scrollWidth, clientWidth } = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth
		}));
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	};

	test('the phone plan never scrolls sideways', async ({ page }) => {
		// Biga + poolish + cold: the longest schedule and the widest ingredient
		// ticket (two pre-doughs, a main dough and a totals block), every band and
		// every perforation in play at once.
		await openRecipe(
			page,
			'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&o=2&sg=1&p=b30_p20&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-03T09%3A00%3A00.000Z'
		);
		await noSidewaysScroll(page);
	});

	// The ask flow carries the perforated ticket stub, the widest single piece of
	// type in the app, and the one animation: the question block slides in from
	// 2 rem to the right of where it lands, which painted 32 px past the sheet
	// and put a horizontal scrollbar under every move between questions. It was
	// invisible on a desktop, where the page is wider than its own content.
	test('the phone ask flow never scrolls sideways', async ({ page }) => {
		await openQuestion(page, 'window', RECIPE);
		await noSidewaysScroll(page);
		// Mid-slide is when it actually overflowed, so measure there too.
		await page.getByRole('button', { name: 'Next' }).click();
		await noSidewaysScroll(page);
	});
});

// Every modal opened pinned to the top-left corner of the screen (issue #468).
// A modal <dialog> is centred by the user agent's `margin: auto` inside its
// `inset: 0` box, and Tailwind's preflight resets every margin to 0, so
// `.dialog-panel` lost it without a word; on a phone the dialogs also touched
// both edges and the offset block was cut off on the right. It was missed
// because every dialog spec asserts what is IN the dialog, never where it is,
// and the phone-width check above never opens one. The adjust sheet is the
// deliberate exception — a bottom sheet on a phone, a right-hand drawer on a
// desktop — so it is held to that shape instead.
type Box = { x: number; y: number; width: number; height: number };

async function openSaveDialog(page: import('@playwright/test').Page) {
	await openMenu(page);
	await page.getByRole('menuitem', { name: 'Save recipe' }).click();
	return page.getByRole('dialog', { name: 'Save recipe' });
}

async function openRemindersDialog(page: import('@playwright/test').Page) {
	await openMenu(page);
	await page.getByRole('menuitem', { name: 'Remind me on this device…' }).click();
	return page.getByRole('dialog', { name: 'Step reminders on this device' });
}

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1280, height: 800 }
]) {
	test.describe(`modal dialogs at ${viewport.width} px`, () => {
		test.use({ viewport });

		for (const [name, open] of [
			['save recipe', openSaveDialog],
			['reminders', openRemindersDialog]
		] as const) {
			test(`the ${name} dialog opens centred, with room for its offset block`, async ({ page }) => {
				await openRecipe(page, RECIPE);
				const dialog = await open(page);
				await expect(dialog).toBeVisible();
				const box = (await dialog.boundingBox()) as Box;
				expect(box).not.toBeNull();

				const left = box.x;
				const right = viewport.width - (box.x + box.width);
				const top = box.y;
				const bottom = viewport.height - (box.y + box.height);
				expect(Math.abs(left - right), `left ${left}, right ${right}`).toBeLessThanOrEqual(1);
				expect(Math.abs(top - bottom), `top ${top}, bottom ${bottom}`).toBeLessThanOrEqual(1);
				// A gutter either side, wide enough for the 6 px block the sheet
				// stands on to stay on screen.
				expect(left).toBeGreaterThanOrEqual(15);
				expect(right).toBeGreaterThanOrEqual(15);
			});
		}

		test('the adjust sheet keeps its sheet or drawer shape', async ({ page }) => {
			await openRecipe(page, RECIPE);
			const box = (await (await openAdjust(page)).boundingBox()) as Box;
			expect(box).not.toBeNull();
			// Flush with the bottom edge on a phone, flush with the right on a
			// desktop — centring it would float it in the middle of the page.
			expect(Math.abs(box.x + box.width - viewport.width)).toBeLessThanOrEqual(1);
			expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThanOrEqual(1);
			if (viewport.width < 1024) {
				expect(box.x).toBeLessThanOrEqual(1);
				expect(box.y).toBeGreaterThan(0);
			} else {
				expect(box.y).toBeLessThanOrEqual(1);
				expect(box.x).toBeGreaterThan(viewport.width / 2);
			}
		});

		// The fit seal's panel hung from its own <details>, so it began where the
		// second seal does and ran about 178 px past the right edge of a 390 px
		// phone; the mode seal's panel fitted with 2 px to spare (issue #468).
		// The panels are closed by default, so no layout check ever saw one.
		test('both seal panels open inside the screen', async ({ page }) => {
			await openRecipe(page, RECIPE);
			const seals = page.locator('details:has(.seal-panel)');
			await expect(seals).toHaveCount(2);
			for (const i of [0, 1]) {
				const seal = seals.nth(i);
				await seal.locator('summary').click();
				const panel = seal.locator('.seal-panel');
				await expect(panel).toBeVisible();
				const box = (await panel.boundingBox()) as Box;
				expect(box).not.toBeNull();
				expect(box.x).toBeGreaterThanOrEqual(0);
				// The panel's 4 px offset shadow has to land on screen as well.
				expect(box.x + box.width + 4, `seal ${i}`).toBeLessThanOrEqual(viewport.width);
				// ...and it still opens beneath the seal that opened it.
				const summary = (await seal.locator('summary').boundingBox()) as Box;
				expect(box.y).toBeGreaterThanOrEqual(summary.y + summary.height);
				await page.keyboard.press('Escape');
				await expect(panel).not.toBeVisible();
			}
		});
	});
}

// A header band and a day divider are reversed out of the ink and have to run
// the full width of their sheet — that is what makes them read as a band rather
// than as a heading with a background colour. They get there by cancelling the
// card's own padding (`-mx-5 sm:-mx-6` against `.card-body`'s `p-5 sm:p-6`), so
// those two numbers are coupled with nothing in the markup to say so: change the
// padding and the bands quietly inset by a few pixels, which just reads as a
// mistake.
test('the header band and the day divider run the full width of the schedule card', async ({
	page
}) => {
	await openRecipe(page, RECIPE);

	// By its heading, not by `.card-loud`: the ingredients ticket wears the same
	// offset block now, so the class alone matches two cards.
	const schedule = page.locator('section.card-loud').filter({ hasText: 'Schedule' });
	const card = await schedule.boundingBox();
	const band = await schedule.locator('.card-header').boundingBox();
	const day = await schedule.locator('h3').first().boundingBox();

	// Flush inside the card's own 2 px rule, and nowhere short of it.
	expect(band!.x).toBeCloseTo(card!.x + 2, 0);
	expect(band!.width).toBeCloseTo(card!.width - 4, 0);
	// The day divider sits inside the padded body, so it is the band around the
	// date rather than the date itself that has to reach the edges.
	const divider = await schedule
		.locator('h3')
		.first()
		.evaluate((el) => {
			const b = el.parentElement!.getBoundingClientRect();
			return { x: b.x, width: b.width };
		});
	expect(divider.x).toBeCloseTo(card!.x + 2, 0);
	expect(divider.width).toBeCloseTo(card!.width - 4, 0);
	expect(day!.x).toBeGreaterThan(divider.x);
});

// The colophon is two one-line credits, and it used to carry a 52ch measure of
// its own — a reading width, on a footer that is not reading copy. Every locale
// broke the share line in two well short of the trimmed edge, and the whole
// block sat left against a page that is centred everywhere else. Only a
// rendered page can say how many lines a paragraph actually took.
test.describe('the colophon', () => {
	test.use({ viewport: { width: 1440, height: 1000 } });

	test('sits centred and on one line per credit at desktop width', async ({ page }) => {
		await openRecipe(page, RECIPE);

		const credits = page.locator('footer p');
		await expect(credits).toHaveCount(3);

		for (const p of await credits.all()) {
			const { lines, align } = await p.evaluate((el) => ({
				lines: Math.round(
					el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)
				),
				align: getComputedStyle(el).textAlign
			}));
			expect(lines, await p.textContent()).toBe(1);
			expect(align).toBe('center');
		}
	});
});

// The sheet wrote its checkbox row out five times and the control six, with the
// ask flow's tiles carrying a seventh copy of the control; they are `.check-row`
// and `.check-box` now. A copy that drifts is invisible to every other spec —
// the row still renders — so this pins that every checkbox and radio in the
// app is set through the named classes and none through a class list.
test('every checkbox and radio is set through the named classes', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	const boxes = sheet(page).locator('input[type="checkbox"]');
	await expect(boxes).not.toHaveCount(0);
	await expect(sheet(page).locator('input[type="checkbox"]:not(.check-box)')).toHaveCount(0);
	await expect(
		sheet(page).locator('label:has(> input[type="checkbox"]):not(.check-row)')
	).toHaveCount(0);
	await page.getByRole('button', { name: 'Done', exact: true }).click();

	await openQuestion(page, 'method', RECIPE);
	const radios = view(page).locator('input[type="radio"]');
	await expect(radios).not.toHaveCount(0);
	await expect(view(page).locator('input[type="radio"]:not(.check-box)')).toHaveCount(0);
});
