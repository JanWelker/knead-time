import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openAdjust, openMenu, openQuestion, openRecipe, sheet } from './helpers';

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

// app.css's element defaults used to sit outside any cascade layer, which beats
// every Tailwind utility no matter how specific. Writing the obvious class did
// nothing, silently: `font-sans` on a heading, `focus:outline-none` on an input.
// They live in @layer base now. These two tests pin the consequence from both
// ends — something later in the cascade must be able to win, and the focus ring
// must still be there.

test('a later layer can retune a heading the base rule already styled', async ({ page }) => {
	await openQuestion(page, 'when', RECIPE);

	const type = await page.locator('h1.question').evaluate((el) => {
		const cs = getComputedStyle(el);
		return { tracking: parseFloat(cs.letterSpacing), size: parseFloat(cs.fontSize) };
	});

	// @layer base gives every h1 +0.01em, which Anton needs at reading sizes;
	// `.question` asks for +0.005em, because at 72 px the same tracking opens the
	// caps up too far, and it gets it. Unlayered, the base rule would have won
	// and the app's one loud piece of type would have been silently detuned.
	expect(type.tracking / type.size).toBeCloseTo(0.005, 3);
});

// The TRMNL uuid field carried `focus:outline-none`. It never took effect —
// the unlayered focus rule outranked it — so the field has always shown the
// ring. Layering would have handed that class its wish and left the input with
// no focus indicator at all, so the dead class was removed with the change.
// This is the check that the removal actually held.
test('every control keeps the focus ring, including the TRMNL uuid field', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	const ring = (loc: ReturnType<typeof page.locator>) =>
		loc.first().evaluate((el: HTMLElement) => {
			el.focus();
			return getComputedStyle(el).outline;
		});

	expect(await ring(sheet(page).locator('input[type="number"]'))).toBe(
		'rgb(200, 64, 26) solid 3px'
	);
	expect(await ring(sheet(page).locator('select'))).toBe('rgb(200, 64, 26) solid 3px');
	await page.getByRole('button', { name: 'Done', exact: true }).click();

	await openMenu(page);
	await page.getByRole('menuitem', { name: 'Send to TRMNL…' }).click();
	// By its accessible name: there is more than one dialog with a text field
	// in the page now, and "the input inside a dialog" stopped being unique.
	const uuid = page.getByRole('textbox', { name: 'Plugin UUID' });
	await expect(uuid).toBeVisible();
	expect(await ring(uuid)).toBe('rgb(200, 64, 26) solid 3px');
});

// The two fermentation-band fills — the room band and the cold band on the
// window rail, plus the swatch that explains them — were the last raw `basil-*`
// classes anywhere in src/ and the only `dark:` variants, because they had no
// `--kt-*` role to reach for. They have one now (`band-room` / `band-cold`),
// and it has to resolve to exactly the colour it replaced in each theme: a
// tokenisation that shifts a fill by one step of the scale is invisible in the
// diff, invisible to every other spec, and only ever shows on the rail.
test('the fermentation bands keep their exact fills in both themes', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	const fills = () =>
		page.evaluate(() => {
			// The rail paints the room band first and the cold band second, then
			// the stop notches; Caputo Pizzeria (W 265) has both bands.
			const [room, cold] = [...document.querySelector('.window-rail')!.children];
			const swatch = document.querySelector('#window-band span')!;
			const bg = (el: Element) => getComputedStyle(el).backgroundColor;
			return { room: bg(room), cold: bg(cold), swatch: bg(swatch) };
		});

	// 32 h is a cold plan, so the swatch wears the cold band's colour.
	expect(await fills()).toEqual({
		room: 'rgb(140, 196, 114)',
		cold: 'rgb(101, 169, 77)',
		swatch: 'rgb(101, 169, 77)'
	});

	await page.evaluate(() => document.documentElement.classList.add('dark'));
	expect(await fills()).toEqual({
		room: 'rgb(32, 64, 26)',
		cold: 'rgb(44, 87, 34)',
		swatch: 'rgb(44, 87, 34)'
	});
});

// The scrim behind every <dialog> was `backdrop:bg-stone-950/50` — the last raw
// Tailwind colour anywhere in src/, and the one surface that stayed a cool
// near-black while html.dark re-inked everything else. It is the ink role at
// half strength now, so it has to be exactly what the palette says that is, in
// both themes. Compared against a reference element mixing `--kt-ink` the same
// way rather than against rgb literals: Tailwind mixes in oklab and Chromium
// reports the result as oklab(), whose channels would only be pinnable to the
// float formatting of one browser build.
test('the dialog scrim is the ink at half strength in both themes', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await openAdjust(page);

	const scrim = () =>
		page.evaluate(() => {
			const reference = document.createElement('div');
			reference.style.backgroundColor = 'color-mix(in oklab, var(--kt-ink) 50%, transparent)';
			document.body.append(reference);
			const expected = getComputedStyle(reference).backgroundColor;
			reference.remove();
			const actual = getComputedStyle(
				document.querySelector('dialog[open]')!,
				'::backdrop'
			).backgroundColor;
			return { actual, expected };
		});

	const light = await scrim();
	expect(light.actual).toBe(light.expected);
	expect(light.actual).toMatch(/^oklab\(.* \/ 0\.5\)$/);

	await page.evaluate(() => document.documentElement.classList.add('dark'));
	const dark = await scrim();
	expect(dark.actual).toBe(dark.expected);
	// Re-inked, not the same near-black under a different name.
	expect(dark.actual).not.toBe(light.actual);
});

// "Never reach past the roles for a raw `stone-*` or `bg-white`" is a hard
// rule, and half the tree once broke it — which is how the palette resolved to
// "cream plus one red" whatever the tokens said. No browser check can cover
// every file, so this one reads the source. Copy (messages.ts) and tests are
// left out; everything that can carry a class is in.
test('no raw Tailwind colour scale utility survives in src/', () => {
	const RAW =
		/\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|accent|decoration|shadow|placeholder|divide|caret)-(?:stone|gray|zinc|neutral|slate|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d+)?\b/g;
	const src = fileURLToPath(new URL('../src', import.meta.url));
	const hits: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (
				/\.(svelte|css|ts|html)$/.test(entry.name) &&
				!/\.test\.ts$|^messages\.ts$/.test(entry.name)
			) {
				for (const match of readFileSync(path, 'utf8').matchAll(RAW)) {
					hits.push(`${relative(src, path)}: ${match[0]}`);
				}
			}
		}
	};
	walk(src);
	expect(hits).toEqual([]);
});
