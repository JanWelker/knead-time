import { expect, test, type Page } from '@playwright/test';
import { NOW, openLibrary, openQuestion, openRecipe, waitForHydration } from './helpers';

const RECIPE =
	'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// The contract: nothing the reader did not ask for leaves for a third party.
// No backend, no CDN — and, since the webfonts were self-hosted, no font server
// either. It is a privacy promise as much as a performance one: a stylesheet
// fetched from another host tells that host who is baking, and it is also a
// single point of failure in front of first paint.
//
// Exactly one host is reached without a click, and it is ours: the Umami visit
// counter at analytics.k8s.wlkr.ch, on the same homelab as the reminder
// service. It sets no cookie and stores no address, and the tag in app.html
// carries data-domains, so from anywhere but the live site the browser fetches
// the script and the script sends nothing. That is what this spec pins: one
// script from that host, never a page view from here, and nothing else.
//
// The other outbound calls in the whole app happen on an explicit click and are
// the feature, not a subresource: the TRMNL webhook, to a URL the user typed
// themselves, and the reminder service at kneadtime.k8s.wlkr.ch, on "Remind me"
// (e2e/reminders.spec.ts pins that nothing else reaches it). Neither is
// reachable without that click.
//
// This lives in the browser suite because it is a fact about what the page
// *fetches*, which no amount of grepping the source can settle: a font CDN can
// come back through app.html, through a component's <img>, through an @import
// in app.css, or through a dependency's stylesheet. Only the network tells.

const ANALYTICS_SCRIPT = 'https://analytics.k8s.wlkr.ch/script.js';

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

/** The tracker script is the one foreign request the page may make. Anything
 *  else, including a page view posted to the analytics host, is a breach. The
 *  count is not pinned: how often a cached script is refetched across
 *  navigations is the browser's business, that it was asked for at all is
 *  what says the tag is there. */
function expectOnlyTheTracker(foreign: string[]) {
	expect([...new Set(foreign)]).toEqual([ANALYTICS_SCRIPT]);
}

test('the app fetches nothing from a third party, only its own visit counter', async ({ page }) => {
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

	expectOnlyTheTracker(foreign);
});

test('the print sheet fetches nothing from a third party either', async ({ page }) => {
	const foreign = foreignRequests(page);

	await page.clock.install({ time: NOW });
	// the route auto-calls window.print() on mount; stub it so the run is headless-safe
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/print/en?${RECIPE}`);
	await page.evaluate(() => document.fonts.ready);

	expectOnlyTheTracker(foreign);
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

// The other half of "what does this page fetch": how many times. `bundleStrategy:
// 'single'` in vite.config.ts collapses the eleven split chunks into one, and it
// is a single config line with nothing else pointing at it — the kind of thing a
// SvelteKit upgrade or a well-meaning tidy removes without anyone noticing, since
// the app works exactly the same either way and only the waterfall gets longer.
// Counting the responses is the cheapest way to notice.
test('the whole app arrives as one script and one stylesheet', async ({ page }) => {
	const served: string[] = [];
	page.on('response', (response) => {
		// The tracker is the one script not served from here; the spec above
		// owns it. This one counts what the bundle is made of.
		if (!response.url().startsWith('http://localhost:')) return;
		const type = response.request().resourceType();
		if (type === 'script' || type === 'stylesheet') served.push(type);
	});

	await openRecipe(page, RECIPE);
	await page.evaluate(() => document.fonts.ready);

	expect(served.filter((t) => t === 'script')).toHaveLength(1);
	expect(served.filter((t) => t === 'stylesheet')).toHaveLength(1);
});

// Self-hosting the faces made this origin their redistributor, and the SIL
// Open Font License asks for its text to accompany the font files. The build
// shipped the four .woff2 files with the notices pointing at node_modules,
// which nobody visiting the site can read. A grep of THIRD-PARTY-NOTICES.md
// cannot tell whether the text is served; a request can.
test('the fonts’ licence text is served from the same origin as the fonts', async ({ page }) => {
	for (const file of ['anton-OFL.txt', 'archivo-OFL.txt']) {
		const response = await page.request.get(`/licenses/${file}`);
		expect(response.status(), file).toBe(200);
		expect(await response.text()).toContain('SIL Open Font License, Version 1.1');
	}
});
