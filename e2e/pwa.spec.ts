import { expect, test, type Page } from '@playwright/test';
import { currentView, NOW, openRecipe, waitForHydration } from './helpers';

const RECIPE =
	'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// Added to a Home Screen this stops being a page: standalone, its own icon, and
// readable in a kitchen with no signal. Every part of that is a fact about
// files the browser fetches and a worker it installs, which is why none of it
// can be checked by grepping the source — a renamed icon, a manifest that never
// reached the head, or a precache list that quietly stopped covering the bundle
// all leave the app working perfectly in a tab and broken on a home screen.
//
// What is deliberately NOT here: anything about notifications. iOS only wakes a
// service worker for an incoming push message, so a step reminder needs a
// server to send it — see issue #306.

/** The manifest, parsed, plus the URL it was served from (icons resolve against it). */
async function manifest(page: Page) {
	const response = await page.request.get('/manifest.webmanifest');
	expect(response.status()).toBe(200);
	return { url: response.url(), body: await response.json(), response };
}

/** Wait until a worker is not merely registered but actually serving this page. */
async function waitForController(page: Page) {
	await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, {
		timeout: 15_000
	});
}

test('the manifest is served, and describes an app that installs standalone', async ({ page }) => {
	await page.goto('/');
	const { body, response } = await manifest(page);

	// A manifest served as text/plain is ignored outright by some browsers.
	expect(response.headers()['content-type']).toContain('application/manifest+json');
	expect(body.display).toBe('standalone');
	expect(body.name).toBe('Knead Time');
	// iOS truncates the home-screen label at roughly a dozen characters.
	expect(body.short_name.length).toBeLessThanOrEqual(12);
	// The paper stock, so the splash screen is the sheet the app then prints on.
	expect(body.background_color).toBe('#efe7d5');
});

// start_url and scope are written relative ('.') so BASE_PATH never has to be
// interpolated into a static file — the same trick the hashed .woff2 files use.
// The failure that guards against is silent: an absolute '/' would send every
// PR preview's installed app to the production root.
test('start_url and scope resolve to the app root, not the domain root', async ({ page }) => {
	await page.goto('/');
	const { url, body } = await manifest(page);
	const root = new URL('.', url).href;

	expect(new URL(body.start_url, url).href).toBe(root);
	expect(new URL(body.scope, url).href).toBe(root);
});

test('every icon the manifest promises is really there', async ({ page }) => {
	await page.goto('/');
	const { url, body } = await manifest(page);

	for (const icon of body.icons) {
		const response = await page.request.get(new URL(icon.src, url).href);
		expect(response.status(), `${icon.src} is listed in the manifest`).toBe(200);
		expect(response.headers()['content-type']).toContain(icon.type);
	}

	// Android crops the maskable one to whatever shape the launcher likes; without
	// an icon marked for it the launcher shrinks the 'any' icon into a white
	// blob instead.
	expect(body.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
});

test('the head links the manifest and the icon Safari actually reads', async ({ page }) => {
	await page.goto('/');

	await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
	// iOS does not take the home-screen icon from the manifest: apple-touch-icon
	// is what the share sheet uses, so it has to be declared here as well.
	await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
	await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
		'content',
		'Knead Time'
	);
});

// iOS composites a transparent icon onto black, which would put the cream
// ticket on a black square on half the phones that install it. The PNGs are
// rendered from SVGs whose ground is a full-bleed rect; losing that rect is a
// one-line edit in a file nobody looks at again.
test('the home-screen icon is opaque to the corner', async ({ page }) => {
	await page.goto('/');

	const corner = await page.evaluate(async () => {
		const image = new Image();
		image.src = 'apple-touch-icon.png';
		await image.decode();
		const canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		const context = canvas.getContext('2d')!;
		context.drawImage(image, 0, 0);
		const [r, g, b, a] = context.getImageData(2, 2, 1, 1).data;
		return { r, g, b, a };
	});

	expect(corner.a).toBe(255);
});

test('the service worker precaches the whole app, bundle and pages alike', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await waitForController(page);

	const cached = await page.evaluate(async () => {
		const names = await caches.keys();
		const entries = await Promise.all(names.map(async (name) => (await caches.open(name)).keys()));
		return entries.flat().map((request) => new URL(request.url).pathname);
	});

	// One cache per build, never several accumulating.
	expect(await page.evaluate(() => caches.keys())).toHaveLength(1);

	// The app is a finite list of files precisely because it fetches nothing
	// from anywhere; assert each kind is covered rather than sampling one.
	expect(cached.some((p) => /\/_app\/immutable\/bundle\..*\.js$/.test(p))).toBe(true);
	expect(cached.some((p) => /\/_app\/immutable\/assets\/bundle\..*\.css$/.test(p))).toBe(true);
	expect(cached.filter((p) => p.endsWith('.woff2'))).toHaveLength(4);
	expect(cached).toContain('/manifest.webmanifest');
	expect(cached).toContain('/apple-touch-icon.png');
	expect(cached).toContain('/');
	// The print sheet is a separate document per locale, and it is the one thing
	// you reach for when the phone is covered in flour.
	expect(cached).toContain('/print/en');
	expect(cached).toContain('/print/nl');
});

test('the plan still opens with the network cut', async ({ page, context }) => {
	await openRecipe(page, RECIPE);
	await waitForController(page);

	await context.setOffline(true);
	await page.reload();
	await waitForHydration(page);

	expect(await currentView(page)).toBe('plan');
	// Not just "something rendered": the recipe in the query has to survive,
	// because a share link opened cold in a kitchen is the whole point.
	await expect(page.getByText('280', { exact: false }).first()).toBeVisible();
});

// A share link the device has never seen before: '/?v=7&n=6…' is not a URL
// anything precached, but the recipe lives entirely in the query and one
// document renders every one of them. Without ignoreSearch in the worker's
// offline fallback this is a network error page.
test('a recipe URL the cache has never seen still opens offline', async ({ page, context }) => {
	await openRecipe(page, RECIPE);
	await waitForController(page);

	await context.setOffline(true);
	await page.clock.install({ time: NOW });
	await page.goto('/?v=7&n=4&b=250&h=65&s=2.8&y=f&t=20&ft=4&fw=300');
	await waitForHydration(page);

	expect(await currentView(page)).toBe('plan');
});
