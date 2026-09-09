import { expect, test, type Page } from '@playwright/test';
import { NOW, openAdjust, openMenu, openRecipe, sheetField, waitForHydration } from './helpers';

// The bridge to the native iOS shell (issue #309). None of this can be checked
// in vitest: the rules under test are about *wiring* — whether a menu item is
// there at all, whether an effect fires on a recipe edit, whether a preference
// survives a reload — and every one of them lives in a component or in the
// hydration order, not in a pure function.
//
// The host is faked, because the real one is an app the browser suite cannot
// build. What is being tested is our half of the contract: what we post, when,
// and what we do with what comes back. The Swift half has its own XCTest suite.

const RECIPE =
	'v=7&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

type Posted = { type: string; v: number; reminders?: unknown[] };

/**
 * Stand in for the shell. addInitScript runs before the page's own scripts on
 * every navigation, which is what puts this in place before the root layout's
 * onMount calls nativeHost.init.
 */
async function withNativeHost(
	page: Page,
	permission: 'granted' | 'denied' | 'unknown' = 'granted'
) {
	await page.addInitScript((grant) => {
		const w = window as unknown as {
			__native: Posted[];
			webkit: unknown;
			kneadtime?: { onState(s: { permission: string; pending: number }): void };
		};
		w.__native = [];
		w.webkit = {
			messageHandlers: {
				kneadtime: {
					postMessage: (m: Posted) => {
						w.__native.push(m);
						// The shell answers a handshake with what it currently knows, and
						// a permission request with the user's answer. Same path, which is
						// what a cold launch and a foreground return also use.
						if (m.type === 'hello') {
							w.kneadtime?.onState({ permission: 'unknown', pending: 0 });
						}
						if (m.type === 'permission') {
							w.kneadtime?.onState({
								permission: grant,
								pending: grant === 'granted' ? (m.reminders?.length ?? 6) : 0
							});
						}
						if (m.type === 'reminders') {
							w.kneadtime?.onState({ permission: grant, pending: m.reminders?.length ?? 0 });
						}
					}
				}
			}
		};
	}, permission);
}

function posted(page: Page): Promise<Posted[]> {
	return page.evaluate(() => (window as unknown as { __native: Posted[] }).__native ?? []);
}

// The menu is a <details>; openMenu clicks its summary, so calling it twice
// toggles the panel shut again. Open once, then address what is inside.
async function remindersItem(page: Page) {
	await openMenu(page);
	return page.getByRole('menuitem', { name: /reminder/i });
}

async function openRemindersDialog(page: Page) {
	await (await remindersItem(page)).click();
	await expect(page.getByRole('heading', { name: /remind me at each step/i })).toBeVisible();
}

/** Open the dialog and turn reminders on. */
async function turnOn(page: Page) {
	await openRemindersDialog(page);
	await page.getByRole('button', { name: /turn on reminders/i }).click();
}

test('a browser is never offered a button the shell alone can honour', async ({ page }) => {
	await openRecipe(page, RECIPE);
	// No addInitScript here: this is the plain web app, which is what almost
	// everyone gets. A menu item that cannot do anything is worse than none.
	await expect(await remindersItem(page)).toHaveCount(0);
});

test('inside the shell the item is there, and opens a dialog', async ({ page }) => {
	await withNativeHost(page);
	await openRecipe(page, RECIPE);

	const item = await remindersItem(page);
	await expect(item).toHaveCount(1);
	await item.click();
	await expect(page.getByRole('heading', { name: /remind me at each step/i })).toBeVisible();
});

test('the page shakes hands on launch and then waits to be asked', async ({ page }) => {
	await withNativeHost(page);
	await openRecipe(page, RECIPE);

	const messages = await posted(page);
	expect(messages.map((m) => m.type)).toEqual(['hello']);
	// Every message carries the wire version, because a months-old shell will
	// meet a freshly deployed page.
	expect(messages[0].v).toBe(1);
});

test('permission is asked for on a press, and nothing is scheduled before it is granted', async ({
	page
}) => {
	await withNativeHost(page, 'denied');
	await openRecipe(page, RECIPE);
	await turnOn(page);

	const types = (await posted(page)).map((m) => m.type);
	expect(types).toContain('permission');
	// iOS gives an app one prompt ever. Nothing may be scheduled against a
	// permission that has not been granted.
	expect(types).not.toContain('reminders');
});

test('a refused permission says so and leaves the plan entirely usable', async ({ page }) => {
	await withNativeHost(page, 'denied');
	await openRecipe(page, RECIPE);
	await turnOn(page);

	await expect(page.getByText(/notifications are switched off/i)).toBeVisible();
	await page.getByRole('button', { name: /close/i }).click();
	await expect(page.locator('main [data-view]')).toHaveAttribute('data-view', 'plan');
	// .card-loud is worn by both the ingredient ticket and the schedule.
	await expect(page.locator('.card-loud')).toHaveCount(2);
	expect((await posted(page)).map((m) => m.type)).not.toContain('reminders');
});

test('once granted, the whole step list crosses in one message', async ({ page }) => {
	await withNativeHost(page);
	await openRecipe(page, RECIPE);
	await turnOn(page);

	await expect
		.poll(async () => (await posted(page)).some((m) => m.type === 'reminders'))
		.toBe(true);
	const last = (await posted(page)).filter((m) => m.type === 'reminders').at(-1)!;
	const reminders = last.reminders as Array<{ id: string; at: number; silent: boolean }>;

	// This recipe is a room-temperature plan with no pre-ferment and autolyse on:
	// prep, mix, divide, ready. The autolyse rest is not among them — the baker
	// has already walked away from it.
	expect(reminders.map((r) => r.id.replace(/-\d+$/, ''))).toEqual([
		'prep',
		'mix',
		'divide',
		'ready'
	]);
	expect(new Set(reminders.map((r) => r.id)).size).toBe(reminders.length);
	// Every one of them is still ahead of the pinned clock.
	for (const r of reminders) expect(r.at).toBeGreaterThan(NOW.getTime());
});

test('editing the recipe re-posts the whole list, not a delta', async ({ page }) => {
	await withNativeHost(page);
	await openRecipe(page, RECIPE);
	await turnOn(page);
	await expect
		.poll(async () => (await posted(page)).some((m) => m.type === 'reminders'))
		.toBe(true);

	const before = (await posted(page)).filter((m) => m.type === 'reminders').at(-1)!
		.reminders as Array<{ id: string; body: string }>;

	await page.getByRole('button', { name: /close/i }).click();
	await openAdjust(page);
	await sheetField(page, /pizzas/i).fill('8');
	await sheetField(page, /pizzas/i).blur();

	// The set the shell holds is replaced wholesale — the shell cancels
	// everything pending and re-adds this — so an abandoned plan cannot survive
	// as a stale 03:00 buzz.
	await expect
		.poll(async () => (await posted(page)).filter((m) => m.type === 'reminders').length)
		.toBeGreaterThan(1);
	const after = (await posted(page)).filter((m) => m.type === 'reminders').at(-1)!
		.reminders as Array<{ id: string; body: string }>;
	expect(after.length).toBe(before.length);
	// More pizzas move no step, so the identities are unchanged — which is the
	// point: the shell can cancel by id and re-add. What changed is the copy,
	// and that it changed is what proves this was a real re-post rather than the
	// dedupe letting a stale list stand.
	expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
	expect(after.map((r) => r.body)).not.toEqual(before.map((r) => r.body));
});

test('a recipe left alone is not re-posted', async ({ page }) => {
	await withNativeHost(page);
	await openRecipe(page, RECIPE);
	await turnOn(page);
	await expect
		.poll(async () => (await posted(page)).some((m) => m.type === 'reminders'))
		.toBe(true);

	// Opening and closing the sheet touches nothing. Every post is a full
	// cancel-and-re-add on the other side, so an unchanged list must not travel.
	const count = () => posted(page).then((m) => m.filter((x) => x.type === 'reminders').length);
	const before = await count();
	await page.getByRole('button', { name: /close/i }).click();
	await openAdjust(page);
	await page.keyboard.press('Escape');
	expect(await count()).toBe(before);
});

test('turning reminders off cancels them, and stays off across a reload', async ({ page }) => {
	await withNativeHost(page);
	await openRecipe(page, RECIPE);
	await turnOn(page);
	await expect
		.poll(async () => (await posted(page)).some((m) => m.type === 'reminders'))
		.toBe(true);

	await page.getByRole('button', { name: /turn off/i }).click();
	expect((await posted(page)).map((m) => m.type)).toContain('reminders-off');

	await page.reload();
	await waitForHydration(page);
	// A fresh page: the handshake, and nothing else. The preference really
	// cleared rather than merely being forgotten by this tab.
	expect((await posted(page)).map((m) => m.type)).toEqual(['hello']);
});
