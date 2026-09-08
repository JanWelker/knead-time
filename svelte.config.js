import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base
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
	}
};

export default config;
