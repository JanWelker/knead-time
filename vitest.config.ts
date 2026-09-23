import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Unit tests run at the root scope, so every stored key is the literal a
	// returning user's device already holds (pinned in storedPreference.test.ts).
	define: {
		__STORAGE_SCOPE__: '""'
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.test.mjs'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts', 'scripts/lib/**/*.mjs'],
			// Test files, .svelte runtime modules (need the Svelte plugin to instrument),
			// pure-type modules, and the i18n message catalogue (data, no logic).
			// scripts/lib/ holds the pure halves of the repo scripts and is held to the
			// same 100 %; the scripts themselves are I/O and are not instrumented.
			// Both lists are pinned by .github/test-baseline.json — see
			// scripts/check-test-baseline.mjs for why.
			exclude: [
				'src/lib/**/*.test.ts',
				'scripts/lib/**/*.test.mjs',
				'src/lib/**/*.svelte.ts',
				'src/lib/dough/types.ts',
				'src/lib/dough/testFixtures.ts',
				'src/lib/storageFixtures.ts',
				'src/lib/i18n/messages.ts'
			],
			reporter: ['text', 'json-summary', 'html', 'lcov'],
			// CLAUDE.md commits to 100 % lines/functions/branches/statements across
			// every instrumented file. If a future change can't keep this, delete
			// the unreachable branch (preferred) — don't relax the threshold.
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100
			}
		}
	}
});
