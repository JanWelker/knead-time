import { LOCALES } from '$lib/i18n/messages';

// Override the layout's `ssr = false` so the prerendered HTML for this
// route ships a meaningful skeleton before hydration. The print dialog
// can fire before the JS bundle finishes parsing on a cold cache;
// rendering server-side keeps the page presentable in that window.
export const ssr = true;
export const prerender = true;

// One prerendered file per locale plus a no-locale fallback (English).
export function entries() {
	return [{ locale: undefined }, ...LOCALES.map((locale) => ({ locale }))];
}
