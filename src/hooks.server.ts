import { isLocale } from '$lib/i18n/messages';
import type { Handle } from '@sveltejs/kit';

// `app.html` is one file for every page, so its `lang` attribute is one value —
// and it was `en` for all five prerendered print sheets. `/print/de` shipped
// German copy inside `<html lang="en">`, which tells a screen reader to read it
// with an English voice and a translator that it is already English. The app
// route corrects itself after hydration (`+layout.svelte` mirrors `i18n.locale`
// onto the element), but the print route is SSR + prerendered precisely because
// the print dialog can fire before the bundle has parsed — the moment the
// attribute matters most is the one moment no JS has run.
//
// So it is stamped at prerender time instead, from the locale already in the
// URL path: SvelteKit's documented `%lang%` + `transformPageChunk` pattern.
// Anything that is not one of our locales — the app route, the `404.html`
// fallback, `/print` with no locale — falls back to English, which is the value
// the file used to hard-code.
//
// `%storage-scope%` rides the same mechanism: the theme boot script in app.html
// reads localStorage before any module runs, so the deployment's storage scope
// (see storageScope.ts) has to be written into the markup rather than imported.
export const handle: Handle = async ({ event, resolve }) => {
	const locale = isLocale(event.params.locale) ? event.params.locale : 'en';
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%lang%', locale).replaceAll('%storage-scope%', __STORAGE_SCOPE__)
	});
};
