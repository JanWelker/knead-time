import { expect, test, type Page } from '@playwright/test';
import { NOW } from './helpers';

// The print sheet is a page whose whole job is to come out of a printer, and
// both of the bugs in issue #424 were invisible anywhere but on paper. No unit
// test can lay out a page box, so these render the real route to a PDF.

// Six balls of 280 g, baked Saturday 17:00. The start moments pick the leg:
// room mode needs the window left after the longest pre-ferment under 16 h,
// cold mode needs it at 16 h or more.
const BASE = 'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z';

const SHAPES = [
	{ name: 'no pre-ferment, room', mode: 'room', query: 'sa=2026-09-05T09%3A00%3A00.000Z' },
	{ name: 'biga, room', mode: 'room', query: 'sa=2026-09-04T19%3A00%3A00.000Z&p=b30' },
	{ name: 'poolish, room', mode: 'room', query: 'sa=2026-09-04T19%3A00%3A00.000Z&p=p20' },
	{
		name: 'biga + poolish, room',
		mode: 'room',
		query: 'sa=2026-09-04T19%3A00%3A00.000Z&p=b30_p20'
	},
	{ name: 'no pre-ferment, cold', mode: 'cold', query: 'sa=2026-09-04T11%3A00%3A00.000Z' },
	{ name: 'biga, cold', mode: 'cold', query: 'sa=2026-09-03T17%3A00%3A00.000Z&p=b30' },
	{ name: 'poolish, cold', mode: 'cold', query: 'sa=2026-09-03T17%3A00%3A00.000Z&p=p20' },
	{
		name: 'biga + poolish, cold',
		mode: 'cold',
		query: 'sa=2026-09-03T17%3A00%3A00.000Z&p=b30_p20'
	}
] as const;

const WORST = SHAPES[SHAPES.length - 1];

async function openPrintSheet(page: Page, path: string) {
	await page.clock.install({ time: NOW });
	// the route auto-calls window.print() on mount; stub it so the run is headless-safe
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(path);
	// The QR is drawn from the share URL, which only exists once the page has
	// hydrated and decoded the query — the prerendered skeleton has none, and
	// measuring that would measure the build-time defaults.
	await expect(page.locator('.printpage-qr svg')).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
}

// Chromium writes one `/Type /Page` dictionary per page and one `/Type /Pages`
// for the tree that holds them. The PDF is not compressed at the object level,
// so the count can be read straight off the bytes. Pinned to exactly 1 below,
// so a regex that stopped matching would fail as 0, not pass.
async function pageCount(page: Page, format: 'A4' | 'Letter') {
	const pdf = await page.pdf({ format });
	return pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

// Issue #424: a pre-ferment recipe printed its footer — the colophon and the
// QR, nothing else — alone on a second page, which reads as a blank sheet
// coming out of the printer. The sheet carried 6 mm of padding top and bottom
// inside the @page margin, stacked up to four ingredient sections in one
// column, and gave every label room to wrap; biga + poolish ran a third of a
// page over on Letter. It was never caught because nothing had ever paginated
// the route: every print spec read the DOM, where a page break does not exist.
// CLAUDE.md promises one page for exactly these eight shapes.
for (const shape of SHAPES) {
	test(`the ${shape.name} recipe prints on one page, A4 and Letter alike`, async ({ page }) => {
		await openPrintSheet(page, `/print/en?${BASE}&${shape.query}`);

		// The shape is the one the name claims: the fridge row is printed only
		// for a cold schedule.
		const fridge = page.locator('.printpage-summary').getByText('Fridge temperature');
		await (shape.mode === 'cold' ? expect(fridge).toBeVisible() : expect(fridge).toHaveCount(0));

		expect(await pageCount(page, 'A4')).toBe(1);
		expect(await pageCount(page, 'Letter')).toBe(1);
	});
}

// The worst case again in every language, on both papers: the step copy runs
// longer in French and German than in English, and the shape that fits in one
// can still spill in another.
test('the longest schedule prints on one page in every language', async ({ page }) => {
	for (const locale of ['en', 'de', 'it', 'fr', 'nl']) {
		await openPrintSheet(page, `/print/${locale}?${BASE}&${WORST.query}`);
		expect(await pageCount(page, 'A4'), `${locale} A4`).toBe(1);
		expect(await pageCount(page, 'Letter'), `${locale} Letter`).toBe(1);
	}
});

// Issue #424: app.css sets h1-h3 in Anton from its base layer, and the sheet
// only ever set a family on `.printpage` — which its headings never inherit,
// because an element rule beats inheritance. They printed in Anton, at the
// sheet's font-weight 700, on a face that ships one weight: the browser
// synthesised a bold on top of an already heavy display face. The DOM looked
// right in every existing spec because none of them asked what face it was in.
test('the print sheet sets its headings in the system stack, not the web display face', async ({
	page
}) => {
	await openPrintSheet(page, `/print/en?${BASE}&${WORST.query}`);
	await page.emulateMedia({ media: 'print' });

	const families = await page
		.locator('.printpage')
		.locator('h1, h2, h3')
		.evaluateAll((els) => els.map((el) => getComputedStyle(el).fontFamily));
	// h1, the recipe and ingredient and schedule headings, and the four
	// ingredient sections of a biga + poolish recipe
	expect(families.length).toBeGreaterThanOrEqual(8);
	for (const family of families) {
		expect(family).not.toMatch(/Anton|Archivo/);
		expect(family).toMatch(/^ui-sans-serif, system-ui/);
	}
});

// The other half of the same fix: a face nothing on the page uses is never
// requested, so once the headings stopped asking for Anton, printing costs no
// webfont at all. The faces are declared in the one shared stylesheet (the app
// ships as a single bundle), so not *declaring* them here is not on offer —
// not *using* them is, and the network is what proves it.
test('printing the sheet fetches no webfont', async ({ page }) => {
	const fonts: string[] = [];
	page.on('request', (request) => {
		if (request.url().endsWith('.woff2')) fonts.push(request.url());
	});

	await openPrintSheet(page, `/print/en?${BASE}&${WORST.query}`);
	await page.emulateMedia({ media: 'print' });
	await page.pdf({ format: 'A4' });

	expect(fonts).toEqual([]);
});
