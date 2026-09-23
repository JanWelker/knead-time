import { readFileSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { storageScopeFor } from './src/lib/storageScope.ts';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(version),
		// The localStorage scope: '' at the root, ':<slug>' on a PR preview, which
		// is served from the production origin (static/CNAME) and would otherwise
		// read and write the live site's saved recipes. See src/lib/storageScope.ts.
		__STORAGE_SCOPE__: JSON.stringify(storageScopeFor(process.env.BASE_PATH ?? ''))
	}
});
