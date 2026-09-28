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
//
// This walks the string rather than running one regex replace, because a
// single pass can leave a fresh `<!--` behind where two comments are spliced
// (`<!-<!-- x -->-`), which CodeQL reads as an incomplete sanitiser. The loop
// runs until no prose opener is left, so the output never carries one.
const OPENER = /<!--\s/;
const CLOSER = '-->';

export function stripTemplateComments(html: string): string {
	let out = html;
	for (let open = out.search(OPENER); open !== -1; open = out.search(OPENER)) {
		const close = out.indexOf(CLOSER, open);
		// An unterminated comment is not something app.html can contain, but a
		// loop that could not make progress must stop rather than hang the build.
		if (close === -1) break;
		const end = close + CLOSER.length;
		const trailing = out[end] === '\n' ? 1 : 0;
		out = out.slice(0, open) + out.slice(end + trailing);
	}
	return out;
}
