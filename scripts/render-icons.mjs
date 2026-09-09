#!/usr/bin/env node
// Rasterises the two icon sources in static/ into the PNGs the manifest and
// iOS need. Run by hand after touching icon.svg or icon-maskable.svg; the PNGs
// are committed, so neither CI nor a contributor's first build depends on this.
//
// It borrows Playwright's Chromium — already a devDependency for the browser
// suite — rather than adding an SVG rasteriser. The alternatives were a native
// module (sharp/resvg: a compiled dependency for four files that change once a
// year) or macOS `sips`, which cannot read SVG at all.
//
//   node scripts/render-icons.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const staticDir = new URL('../static/', import.meta.url);

// Sizes are the smallest set that covers the three consumers: Android's install
// prompt wants a 192, the splash screen and app listings want a 512, iOS reads
// apple-touch-icon at 180, and Android's adaptive launcher crops the maskable.
const TARGETS = [
	{ source: 'icon.svg', out: 'icon-192.png', size: 192 },
	{ source: 'icon.svg', out: 'icon-512.png', size: 512 },
	{ source: 'icon.svg', out: 'apple-touch-icon.png', size: 180 },
	{ source: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 }
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { source, out, size } of TARGETS) {
	const svg = readFileSync(new URL(source, staticDir), 'utf8');
	// The SVG is inlined into a box of exactly the target size rather than
	// loaded as a document: a standalone SVG's intrinsic sizing depends on the
	// viewport, and a stray body margin would shift it by 8 px.
	await page.setViewportSize({ width: size, height: size });
	await page.setContent(
		`<!doctype html><html><body style="margin:0">` +
			`<div id="box" style="width:${size}px;height:${size}px">${svg}</div>` +
			`</body></html>`
	);
	await page.addStyleTag({ content: '#box > svg { width: 100%; height: 100%; display: block }' });
	const png = await page.locator('#box').screenshot({ omitBackground: false });
	writeFileSync(new URL(out, staticDir), png);
	console.log(`${out} — ${size}×${size} from ${source} (${png.length} bytes)`);
}

await browser.close();
