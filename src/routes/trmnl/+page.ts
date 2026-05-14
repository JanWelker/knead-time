// Override the layout's `ssr = false` for this one route: prerender it with
// the rendered DOM in the HTML so TRMNL's screenshot service sees real content
// on its first fetch, not just an SPA shell that may never hydrate within its
// 5 s budget. The default-input render is what ships in the static HTML;
// client-side hydration immediately swaps in whatever recipe is in the URL.
export const ssr = true;
export const prerender = true;
