import { expect, type Page } from '@playwright/test';

// A fixed "now" for every spec. The schedule is wall-clock arithmetic — which
// stops are still reachable, whether a step falls at night, how long is left
// before the bake — so a real clock would make assertions drift by the hour and
// fail overnight. Installed before navigation so the app never sees the real one.
export const NOW = new Date('2026-09-01T09:00:00Z');

/** Fixed clock, then load a recipe, then wait for hydration to finish. */
export async function openRecipe(page: Page, query: string) {
	await page.clock.install({ time: NOW });
	await page.goto(`/?${query}`);
	await waitForHydration(page);
}

// The app ships as prerendered HTML carrying build-time defaults; `onMount`
// then decodes the URL. Reading before that swap is how a check can "pass"
// against numbers that were never on screen, so every spec waits for the
// decoded recipe to land rather than for `load`.
export async function waitForHydration(page: Page) {
	await expect(page.locator('form input[type="range"]')).toBeEnabled();
	await expect
		.poll(async () => new URL(page.url()).searchParams.get('sa'), { timeout: 10_000 })
		.not.toBeNull();
}

/** A top-level card, addressed by its heading. */
export function card(page: Page, heading: string) {
	return page.locator('.card').filter({ has: page.getByRole('heading', { name: heading }) });
}

/** The card holding the form (it has no heading of its own). */
export function formCard(page: Page) {
	return page.locator('.card').filter({ has: page.locator('input[type="range"]') });
}

/** The fermentation-window card. */
export function windowCard(page: Page) {
	return page.locator('form div.rounded-2xl').filter({ has: page.locator('input[type="range"]') });
}

/** The big duration readout, e.g. "40 h". */
export async function chosenWindow(page: Page): Promise<string> {
	return (await windowCard(page).locator('.font-display').innerText()).trim();
}

export function slider(page: Page) {
	return page.locator('form input[type="range"]');
}

/** Drag the slider to a stop index the way a user would: focus and arrow-key. */
export async function dragTo(page: Page, index: number) {
	const el = slider(page);
	const current = Number(await el.inputValue());
	await el.focus();
	const key = index > current ? 'ArrowRight' : 'ArrowLeft';
	for (let i = 0; i < Math.abs(index - current); i++) await el.press(key);
}

/** Every window the slider can be dragged to, in rail order. */
export async function allStops(page: Page): Promise<string[]> {
	const el = slider(page);
	const max = Number(await el.getAttribute('max'));
	const out: string[] = [];
	for (let i = 0; i <= max; i++) {
		await dragTo(page, i);
		out.push(await chosenWindow(page));
	}
	return out;
}

/** Date part of an input pair, as the form shows it. */
export function dateField(page: Page, which: 'start' | 'bake') {
	return page.locator('form input[type="date"]').nth(which === 'start' ? 0 : 1);
}

export function timeField(page: Page, which: 'start' | 'bake') {
	return page.locator('form input[type="time"]').nth(which === 'start' ? 0 : 1);
}

export async function setBakeDate(page: Page, value: string) {
	await dateField(page, 'bake').fill(value);
}

/**
 * Where the browser actually paints the range thumb's centre. A native thumb
 * travels between `radius` and `width - radius`, which is exactly the geometry
 * every marker on the rail has to match.
 */
export async function thumbCentreX(page: Page): Promise<number> {
	return slider(page).evaluate((el: HTMLInputElement) => {
		const r = el.getBoundingClientRect();
		const radius = 10; // half the 1.25rem thumb
		const frac = Number(el.value) / Number(el.max);
		return r.left + radius + frac * (r.width - 2 * radius);
	});
}

/** Centre x of a marker arrow. `up` is the ideal marker, `down` the bake flag. */
export async function arrowCentreX(page: Page, dir: 'up' | 'down'): Promise<number | null> {
	const path = dir === 'up' ? 'M5 0' : 'M5 6';
	const svg = windowCard(page).locator(`svg:has(path[d^="${path}"])`);
	if ((await svg.count()) === 0) return null;
	const box = await svg.first().boundingBox();
	return box ? box.x + box.width / 2 : null;
}
