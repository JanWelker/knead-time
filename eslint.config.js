import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				// Inlined at build time by vite (see vite.config.ts `define`).
				__APP_VERSION__: 'readonly',
				__STORAGE_SCOPE__: 'readonly',
				__PUSH_ORIGIN__: 'readonly'
			}
		}
	},
	{
		// Rune modules (`*.svelte.ts`) go through svelte-eslint-parser like
		// components do, so the Svelte rules see `$state`/`$effect` as runes.
		// TypeScript is the parser *it* delegates the script to; setting
		// `languageOptions.parser` to ts.parser instead replaced the Svelte
		// parser for those files outright.
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				extraFileExtensions: ['.svelte']
			}
		}
	},
	{
		// Pizzerias.svelte renders external URLs (50 Top Pizza profile pages,
		// recipe sources) supplied by pizzerias.md, so resolve() does not apply.
		files: ['src/lib/components/Pizzerias.svelte'],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		ignores: [
			'build/',
			'build-base/',
			'.svelte-kit/',
			'.svelte-kit-base/',
			'coverage/',
			'dist/',
			'node_modules/'
		]
	}
);
