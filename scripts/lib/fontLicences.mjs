// The two typefaces are served from this origin, which makes the deploy the
// redistributor of their font files, and the SIL Open Font License asks for
// its text to travel with them (OFL 1.1, condition 2). A pointer into
// node_modules in THIRD-PARTY-NOTICES.md does not reach a visitor of the site.
// So the licence files are copied into static/, next to where the .woff2
// files end up, and a test holds the copies byte-identical to the packages'
// own — a Fontsource bump that changes the text fails until they are re-synced
// with `node scripts/sync-font-licences.mjs`.
//
// Paths are relative to the repository root.
export const FONT_LICENCES = [
	{
		pkg: '@fontsource/anton',
		source: 'node_modules/@fontsource/anton/LICENSE',
		target: 'static/licenses/anton-OFL.txt'
	},
	{
		pkg: '@fontsource-variable/archivo',
		source: 'node_modules/@fontsource-variable/archivo/LICENSE',
		target: 'static/licenses/archivo-OFL.txt'
	}
];
