// `app.html` is the one file Svelte does not compile: its `<!-- -->` prose is
// copied verbatim into every prerendered page, so the notes that explain the
// manifest, the icon and the theme boot script shipped in `index.html`,
// `404.html` and all six print sheets — about 2.5 kB a page. Svelte strips
// the comments in `.svelte` templates itself and esbuild strips the ones in
// `<script>`, so this is the last place a comment could reach a reader.
//
// Only prose is removed. Svelte's hydration markers are comments too —
// `<!--[-->`, `<!--]-->`, `<!--[0-->`, `<!---->` and the head anchor
// `<!--1hugt37-->` — and the page cannot hydrate without them; none of them
// opens with whitespace, and every note in `app.html` does, which is the whole
// of the rule.
const PROSE_COMMENT = /<!--\s[\s\S]*?-->\n?/g;

export function stripTemplateComments(html: string): string {
	return html.replace(PROSE_COMMENT, '');
}
