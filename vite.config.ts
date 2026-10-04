import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { storageScopeFor } from './src/lib/storageScope.ts';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

const base = process.env.BASE_PATH ?? '';
// The browser suite builds the app twice — once at the root and once under a
// preview-style base path — and the two builds run concurrently, so each needs
// its own SvelteKit output and adapter output. Unset outside that suite.
const outDir = process.env.KIT_OUT_DIR ?? '.svelte-kit';
const buildDir = process.env.BUILD_DIR ?? 'build';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter({
				pages: buildDir,
				assets: buildDir,
				fallback: '404.html'
			}),
			outDir,
			paths: {
				base: base as '' | `/${string}`
			},
			// One bundle, not eleven. Every chunk the splitter produced was fetched on
			// every visit anyway — six of them under a kilobyte, pure request overhead —
			// and the split cost a wave: app.js had to arrive and parse before the last
			// node chunk was even discovered, which held the webfonts behind it. Single
			// takes the page from 17 requests to 5 for +2 kB gzip (Rollup loses a little
			// cross-chunk dedup). The trade is cache granularity — any change
			// re-downloads the whole bundle — which is close to theoretical on GitHub
			// Pages, where every asset is served with max-age=600 whatever its path says.
			output: {
				bundleStrategy: 'single'
			},
			prerender: {
				handleHttpError: 'warn'
			}
		})
	],
	define: {
		__APP_VERSION__: JSON.stringify(version),
		// The localStorage scope: '' at the root, ':<slug>' on a PR preview, which
		// is served from the production origin (static/CNAME) and would otherwise
		// read and write the live site's saved recipes. See src/lib/storageScope.ts.
		__STORAGE_SCOPE__: JSON.stringify(storageScopeFor(process.env.BASE_PATH ?? '')),
		// The reminder service (push/). Overridden for a local run; see push/README.md.
		__PUSH_ORIGIN__: JSON.stringify(process.env.PUSH_ORIGIN ?? 'https://kneadtime.k8s.wlkr.ch')
	}
});
