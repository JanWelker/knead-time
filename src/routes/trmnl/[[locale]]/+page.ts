import { LOCALES } from '$lib/i18n/messages';

// Override the layout's `ssr = false` for this one route: prerender it with
// the rendered DOM in the HTML so TRMNL's screenshot service sees real content
// on its first fetch, not just an SPA shell that may never hydrate within its
// 5 s budget. The default-input render is what ships in the static HTML;
// client-side hydration immediately swaps in whatever recipe is in the URL.
export const ssr = true;
export const prerender = true;

// Prerender /trmnl (no locale → defaults to English) plus /trmnl/<locale> for
// each supported language. SvelteKit can't reach the optional-param variants
// from a crawl since nothing links to them, so we declare them explicitly.
// Adding a locale to LOCALES automatically extends this list.
export function entries() {
	return [{ locale: undefined }, ...LOCALES.map((locale) => ({ locale }))];
}
