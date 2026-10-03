import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const { scripts } = JSON.parse(
	readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
);

describe('a fresh install', () => {
	// tsconfig.json extends $app/tsconfig, which only exists once `svelte-kit sync` has
	// written it into node_modules. After the SvelteKit 3 migration nothing ran the sync on
	// install, so `npm ci && npm test` failed every suite with "Tsconfig not found" — the
	// pre-commit hook included. CI missed it because `npm run check` syncs before the tests.
	it('generates the tsconfig every test transform extends', () => {
		expect(scripts.prepare).toMatch(/^svelte-kit sync\b/);
	});
});
