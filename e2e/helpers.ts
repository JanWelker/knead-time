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
// then decodes the URL, picks the view and stamps the fragment. Reading before
// that swap is how a check can "pass" against numbers that were never on
// screen, so every spec waits for the decoded recipe rather than for `load`.
export async function waitForHydration(page: Page) {
	await expect(view(page)).toBeVisible();
	await expect
		.poll(async () => new URL(page.url()).searchParams.get('sa'), { timeout: 10_000 })
		.not.toBeNull();
}

/**
 * Whichever of the three views is mounted. Exactly one ever is — the app is a
 * sequence of places, not one page and a scroll — and each stamps its own name,
 * so a spec can assert where the visitor landed.
 */
export function view(page: Page) {
	return page.locator('main [data-view]');
}

export async function currentView(page: Page): Promise<string | null> {
	return view(page).getAttribute('data-view');
}

/** A titled region of the plan or the library, addressed by its heading. */
export function region(page: Page, heading: string) {
	return page
		.locator('section, aside')
		.filter({ has: page.getByRole('heading', { name: heading }) });
}

/** The adjust sheet: every input in DoughInputs, on one surface. */
export function sheet(page: Page) {
	return page.locator('dialog[open]').filter({ has: page.locator('form') });
}

/** Open the adjust sheet from the plan, the way a user would. */
export async function openAdjust(page: Page) {
	await page.getByRole('button', { name: 'Adjust', exact: true }).click();
	await expect(sheet(page)).toBeVisible();
	return sheet(page);
}

/** Walk the ask flow to one of its questions. */
export async function openQuestion(page: Page, step: string, query = '') {
	await page.clock.install({ time: NOW });
	await page.goto(`/?${query}#ask/${step}`);
	await waitForHydration(page);
}

/** The fermentation-window control, wherever it currently lives. */
export function windowCard(page: Page) {
	return page.locator('.window-card');
}

/** The big duration readout, e.g. "40 h". */
export async function chosenWindow(page: Page): Promise<string> {
	return (await windowCard(page).locator('.data').first().innerText()).trim();
}

export function slider(page: Page) {
	return page.locator('#field-window');
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

/** Date part of an input pair, as the adjust sheet shows it. */
export function dateField(page: Page, which: 'start' | 'bake') {
	return page.locator('dialog input[type="date"]').nth(which === 'start' ? 0 : 1);
}

export function timeField(page: Page, which: 'start' | 'bake') {
	return page.locator('dialog input[type="time"]').nth(which === 'start' ? 0 : 1);
}

export async function setBakeDate(page: Page, value: string) {
	await dateField(page, 'bake').fill(value);
}

/** A field in the adjust sheet, addressed by the label above it. */
export function sheetField(page: Page, label: string | RegExp) {
	return sheet(page).locator('label', { hasText: label }).locator('input');
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
