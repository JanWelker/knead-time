import { expect, test, type Page } from '@playwright/test';
import { NOW, openLibrary, openQuestion, openRecipe, waitForHydration } from './helpers';

const RECIPE =
	'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// The contract: nothing the reader did not ask for leaves this origin. No
// backend, no analytics, no CDN — and, since the webfonts were self-hosted,
// no font server either. It is a privacy promise as much as a performance one:
// a stylesheet fetched from another host tells that host who is baking, and
// it is also a single point of failure in front of first paint.
//
// The only outbound call in the whole app is the TRMNL webhook, which happens
// on an explicit click, to a URL the user typed themselves — it is the feature,
// not a subresource, and it is not reachable without that click.
//
// This lives in the browser suite because it is a fact about what the page
// *fetches*, which no amount of grepping the source can settle: a font CDN can
// come back through app.html, through a component's <img>, through an @import
// in app.css, or through a dependency's stylesheet. Only the network tells.

/** Every request the page made to somewhere that is not this origin. */
function foreignRequests(page: Page): string[] {
	const foreign: string[] = [];
	page.on('request', (request) => {
		const url = request.url();
		// data:/blob: are the page carrying its own bytes, not a fetch.
		if (!/^https?:/.test(url)) return;
		if (!url.startsWith('http://localhost:')) foreign.push(url);
	});
	return foreign;
}

test('the app fetches nothing from another origin', async ({ page }) => {
	const foreign = foreignRequests(page);

	await openRecipe(page, RECIPE);
	await page.evaluate(() => document.fonts.ready);
	// All three views, because each mounts a different tree: the library is the
	// one carrying links to github.com, which must stay links and never become
	// requests.
	await openQuestion(page, 'when', RECIPE);
	await openRecipe(page, RECIPE);
	await openLibrary(page);
	await page.evaluate(() => document.fonts.ready);

	expect(foreign).toEqual([]);
});

test('the print sheet fetches nothing from another origin either', async ({ page }) => {
	const foreign = foreignRequests(page);

	await page.clock.install({ time: NOW });
	await page.goto(`/print/en?${RECIPE}`);
	await page.evaluate(() => document.fonts.ready);

	expect(foreign).toEqual([]);
});

test('both faces are served from this origin, and both actually load', async ({ page }) => {
	const fonts: string[] = [];
	page.on('request', (request) => {
		if (request.url().endsWith('.woff2')) fonts.push(request.url());
	});

	await openRecipe(page, RECIPE);
	await waitForHydration(page);
	await page.evaluate(() => document.fonts.ready);

	// Not just "no CDN request": the faces have to be present, or this passes
	// on a page that quietly fell back to the system stack everywhere.
	const loaded = await page.evaluate(() => ({
		anton: document.fonts.check('400 16px Anton'),
		archivo: document.fonts.check('400 16px Archivo')
	}));
	expect(loaded).toEqual({ anton: true, archivo: true });

	expect(fonts.length).toBeGreaterThan(0);
	for (const url of fonts) expect(url).toMatch(/^http:\/\/localhost:/);
});
