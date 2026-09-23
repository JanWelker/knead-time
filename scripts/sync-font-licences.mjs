#!/usr/bin/env node
// Copies each font package's LICENSE into static/licenses/, so the text ships
// with the .woff2 files the deploy serves. Run after a Fontsource bump changes
// the licence text; scripts/lib/fontLicences.test.mjs fails until you do.

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { FONT_LICENCES } from './lib/fontLicences.mjs';

const root = new URL('../', import.meta.url);

for (const { pkg, source, target } of FONT_LICENCES) {
	const to = new URL(target, root);
	mkdirSync(dirname(to.pathname), { recursive: true });
	copyFileSync(new URL(source, root), to);
	console.log(`${pkg}: ${source} → ${target}`);
}
