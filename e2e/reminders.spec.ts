import { expect, test, type Page, type Route } from '@playwright/test';
import { openAdjust, openMenu, openRecipe, sheetField } from './helpers';

const RECIPE =
	'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

const SERVICE = 'https://kneadtime.k8s.wlkr.ch';
const ENDPOINT = 'https://web.push.apple.com/fake-endpoint';
// A 65-byte P-256 point, base64url, as the service serves it.
const VAPID = 'B' + 'A'.repeat(85) + 'Q';

// Reminders are the one thing the app cannot do alone: iOS wakes a service
// worker only for a server-sent push, so the page hands the schedule to the
// reminder service (push/) — and hands it over on an explicit tap, never on
// load. Chromium cannot subscribe to a real push service headlessly and has no
// way to deliver a push, so PushManager is stubbed and the service is answered
// by the test; what this pins is the wiring between them: which requests one
// tap makes, what they carry, and what the plan says afterwards.

interface Seen {
	method: string;
	path: string;
	body: unknown;
}

/** Answer the reminder service locally and record what reached it. */
async function fakeService(page: Page, putStatus = 200) {
	const seen: Seen[] = [];
	await page.route(`${SERVICE}/**`, (route: Route) => {
		const request = route.request();
		const method = request.method();
		const cors = {
			'Access-Control-Allow-Origin': 'http://localhost:4173',
			'Access-Control-Allow-Methods': 'GET, PUT, DELETE',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Content-Type': 'application/json'
		};
		if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
		const url = new URL(request.url());
		const raw = request.postData();
		seen.push({ method, path: url.pathname + url.search, body: raw ? JSON.parse(raw) : null });
		if (method === 'GET') {
			return route.fulfill({
				status: 200,
				headers: cors,
				body: JSON.stringify({ publicKey: VAPID })
			});
		}
		if (method === 'PUT') {
			const reminders = (seen.at(-1)?.body as { reminders: unknown[] }).reminders.length;
			return route.fulfill({
				status: putStatus,
				headers: cors,
				body: JSON.stringify(
					putStatus === 200
						? { scheduled: reminders, dropped: 0, receipt: true }
						: { detail: 'the push service refused this subscription' }
				)
			});
		}
		return route.fulfill({ status: 204, headers: cors });
	});
	return seen;
}

/**
 * A PushManager that hands out one fake subscription per page load, and a
 * Notification that says yes: headless Chromium answers `denied` whatever the
 * context was granted, because it has nowhere to show one.
 */
async function fakePushManager(page: Page) {
	await page.addInitScript((endpoint: string) => {
		Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
		Notification.requestPermission = async () => 'granted';
		const state: { sub: PushSubscription | null; options: unknown } = { sub: null, options: null };
		const fake = () =>
			({
				endpoint,
				toJSON: () => ({ endpoint, keys: { p256dh: 'BFake', auth: 'fake' } }),
				unsubscribe: async () => {
					state.sub = null;
					return true;
				}
			}) as unknown as PushSubscription;
		PushManager.prototype.subscribe = async function (options) {
			state.options = options;
			state.sub = fake();
			return state.sub;
		};
		PushManager.prototype.getSubscription = async () => state.sub;
		(window as unknown as { __push: typeof state }).__push = state;
	}, ENDPOINT);
}

async function openDialog(page: Page) {
	await openMenu(page);
	await page.getByRole('menuitem', { name: 'Remind me on this device…' }).click();
	const dialog = page.locator('dialog[open]', {
		has: page.getByRole('heading', { name: 'Step reminders on this device' })
	});
	await expect(dialog).toBeVisible();
	return dialog;
}

function status(page: Page) {
	return page.locator('dialog[open] p[role="status"]');
}

test.beforeEach(async ({ page }) => {
	await fakePushManager(page);
});

test('one tap asks permission, subscribes and hands the schedule over — and nothing before it', async ({
	page
}) => {
	const seen = await fakeService(page);
	await openRecipe(page, RECIPE);
	const dialog = await openDialog(page);
	// Six hands-on steps in a cold no-pre-ferment plan: prep, mix, into the
	// fridge, divide, out of the fridge, bake. Autolyse and the room bulk start
	// on their own and get no reminder.
	await expect(dialog.getByTestId('reminders-summary')).toContainText('6 reminders, the first for');
	expect(seen).toEqual([]);

	await dialog.getByRole('button', { name: 'Set reminders' }).click();
	await expect(status(page)).toHaveText('Reminders set. A test notification is on its way.');

	expect(seen.map((s) => `${s.method} ${s.path}`)).toEqual(['GET /v1/vapid', 'PUT /v1/schedules']);
	const put = seen[1].body as {
		subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
		receipt: { title: string; body: string };
		reminders: { uid: string; at: string; title: string; body: string }[];
	};
	expect(put.subscription).toEqual({ endpoint: ENDPOINT, keys: { p256dh: 'BFake', auth: 'fake' } });
	expect(put.receipt.title).toBe('Reminders set');
	expect(put.reminders.map((r) => r.uid)).toEqual([
		'prep',
		'mix',
		'bulk-cold',
		'divide',
		'final-proof',
		'ready'
	]);
	expect(put.reminders[0].title).toBe('Weigh & prep');
	// The time first, then the weights, then the method, in the page's locale.
	expect(put.reminders[0].body).toMatch(/^09:00 AM · 970 g Flour, 679 g Water · Weigh/);
	expect(put.reminders[0].body.length).toBeLessThanOrEqual(240);
	for (const r of put.reminders) expect(new Date(r.at).toISOString()).toBe(r.at);

	// The subscription was taken with the served key, as a raw 65-byte point.
	const options = await page.evaluate(() => {
		const { options } = (window as unknown as { __push: { options: PushSubscriptionOptionsInit } })
			.__push;
		return {
			userVisibleOnly: options.userVisibleOnly,
			keyLength: (options.applicationServerKey as Uint8Array).byteLength
		};
	});
	expect(options).toEqual({ userVisibleOnly: true, keyLength: 65 });

	// The plan the reminders were set for is remembered on the device.
	expect(await page.evaluate(() => localStorage.getItem('kneadtime:reminders'))).toBe(
		new URL(page.url()).search.slice(1)
	);
	await expect(dialog.getByRole('button', { name: 'Update reminders' })).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Turn off' })).toBeVisible();
});

test('editing the plan flags the reminders as stale until they are updated', async ({ page }) => {
	const seen = await fakeService(page);
	await openRecipe(page, RECIPE);
	const dialog = await openDialog(page);
	await dialog.getByRole('button', { name: 'Set reminders' }).click();
	await expect(status(page)).toContainText('Reminders set');
	await dialog.getByRole('button', { name: 'Close' }).click();

	const notice = page.getByText(
		'The reminders on this device are for an earlier version of this plan.'
	);
	await expect(notice).toHaveCount(0);

	await openAdjust(page);
	await sheetField(page, 'Pizzas').fill('7');
	await page.getByRole('button', { name: 'Done', exact: true }).click();
	await expect(notice).toBeVisible();
	// Only the tap talks to the service: an edit does not.
	expect(seen).toHaveLength(2);

	await page.getByRole('button', { name: 'Update reminders' }).click();
	await page.locator('dialog[open]').getByRole('button', { name: 'Update reminders' }).click();
	await expect(status(page)).toContainText('Reminders set');
	await expect(notice).toHaveCount(0);
	// A returning device sends no second GET: the browser still holds the subscription.
	expect(seen.map((s) => `${s.method} ${s.path}`)).toEqual([
		'GET /v1/vapid',
		'PUT /v1/schedules',
		'PUT /v1/schedules'
	]);
});

test('turning reminders off forgets the device on the service and in the browser', async ({
	page
}) => {
	const seen = await fakeService(page);
	await openRecipe(page, RECIPE);
	const dialog = await openDialog(page);
	await dialog.getByRole('button', { name: 'Set reminders' }).click();
	await expect(status(page)).toContainText('Reminders set');

	await dialog.getByRole('button', { name: 'Turn off' }).click();
	await expect(status(page)).toHaveText('Reminders turned off.');
	expect(seen.at(-1)).toEqual({
		method: 'DELETE',
		path: `/v1/schedules?endpoint=${encodeURIComponent(ENDPOINT)}`,
		body: null
	});
	await expect(dialog.getByRole('button', { name: 'Turn off' })).toHaveCount(0);
	await expect(dialog.getByRole('button', { name: 'Set reminders' })).toBeVisible();
	expect(await page.evaluate(() => localStorage.getItem('kneadtime:reminders'))).toBeNull();
	expect(
		await page.evaluate(() => (window as unknown as { __push: { sub: unknown } }).__push.sub)
	).toBeNull();
});

test('a subscription the browser dropped is reported, not pretended', async ({ page }) => {
	await fakeService(page);
	await openRecipe(page, RECIPE);
	const dialog = await openDialog(page);
	await dialog.getByRole('button', { name: 'Set reminders' }).click();
	await expect(status(page)).toContainText('Reminders set');

	// A reload is what iOS does to the subscription when the icon leaves the
	// Home Screen: the fake PushManager starts empty, the fingerprint is still stored.
	await page.reload();
	await openDialog(page);
	await expect(status(page)).toContainText('This browser has dropped its subscription');
	expect(await page.evaluate(() => localStorage.getItem('kneadtime:reminders'))).toBeNull();
	await expect(
		page.locator('dialog[open]').getByRole('button', { name: 'Set reminders' })
	).toBeVisible();
});

test('a refusal from the service names its reason through the locale', async ({ page }) => {
	await fakeService(page, 410);
	await openRecipe(page, RECIPE);
	const dialog = await openDialog(page);
	await dialog.getByRole('button', { name: 'Set reminders' }).click();
	await expect(status(page)).toHaveText(
		'Could not set reminders: the push service refused this subscription'
	);
	// 410 means the browser's copy is dead too: it is dropped, so the next tap subscribes afresh.
	expect(
		await page.evaluate(() => (window as unknown as { __push: { sub: unknown } }).__push.sub)
	).toBeNull();
	await expect(dialog.getByRole('button', { name: 'Set reminders' })).toBeVisible();
});

test('the menu item waits for a plan that is feasible', async ({ page }) => {
	// A zero-length window: nothing to remind anyone of.
	await openRecipe(
		page,
		'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-05T17%3A00%3A00.000Z'
	);
	await openMenu(page);
	await expect(page.getByRole('menuitem', { name: 'Remind me on this device…' })).toBeDisabled();
});

test('the schedule wears a "Remind me" plaque that opens the same dialog', async ({ page }) => {
	// The menu item was the only way in, one press behind a summary on the far
	// side of the page from the steps it acts on. The plaque sits on the
	// schedule's own band, the way "Round numbers" sits on the ticket's.
	await openRecipe(page, RECIPE);
	const schedule = page.locator('section.card-loud').filter({ hasText: 'Schedule' });
	const plaque = schedule.locator('.card-header').getByRole('button', { name: 'Remind me' });
	await expect(plaque).toBeEnabled();
	await plaque.click();
	const dialog = page.locator('dialog[open]', {
		has: page.getByRole('heading', { name: 'Step reminders on this device' })
	});
	await expect(dialog).toBeVisible();
	await expect(dialog.getByTestId('reminders-summary')).toContainText('6 reminders, the first for');
});

test('the schedule plaque waits for a feasible plan like the menu item', async ({ page }) => {
	await openRecipe(
		page,
		'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-05T17%3A00%3A00.000Z'
	);
	await expect(page.getByRole('button', { name: 'Remind me', exact: true })).toBeDisabled();
});
