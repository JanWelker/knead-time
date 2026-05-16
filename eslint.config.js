import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				// Inlined at build time by vite (see vite.config.ts `define`).
				__APP_VERSION__: 'readonly'
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
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
		files: ['**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parser: ts.parser
		}
	},
	{
		ignores: ['build/', '.svelte-kit/', 'coverage/', 'dist/', 'node_modules/']
	}
);
