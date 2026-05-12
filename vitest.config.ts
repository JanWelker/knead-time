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
				'src/lib/i18n/messages.ts'
			],
			reporter: ['text', 'json-summary', 'html', 'lcov'],
			thresholds: {
				lines: 99,
				functions: 99,
				branches: 96,
				statements: 98
			}
		}
	}
});
