import { defineConfig, devices } from '@playwright/test';

// Browser tests for the things vitest structurally cannot reach: the schedule
// is computed by pure modules that are unit-tested to 100 %, but the controls
// that drive it live in `.svelte` and `.svelte.ts` files, which have no Svelte
// plugin in the vitest config — `$state` is not even defined there. Everything
// in `e2e/` is a rule that was previously only ever checked by hand.
//
// Runs against the real static build, not the dev server: the app ships as
// prerendered HTML that hydrates and only then decodes the URL, and that
// sequence is itself something worth testing.
const PORT = 4173;

export default defineConfig({
	testDir: 'e2e',
	// The suite mutates only its own page, so parallel is safe.
	fullyParallel: true,
	// A `.only` left in a spec must fail the build rather than silently shrink it.
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		// Pinned for the same reason the vitest scripts pin TZ=UTC: the whole app
		// is wall-clock arithmetic, and a runner in another zone would shift every
		// step time. The locale is pinned because the assertions read UI copy.
		timezoneId: 'UTC',
		locale: 'en-US',
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
