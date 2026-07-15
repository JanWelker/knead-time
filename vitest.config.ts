import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			// Test files, .svelte runtime modules (need the Svelte plugin to instrument),
			// pure-type modules, and the i18n message catalogue (data, no logic).
			exclude: [
				'src/lib/**/*.test.ts',
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
