import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openRecipe } from './helpers';

// An automated sweep, not a substitute for the hand-written a11y specs beside
// it: axe catches the mechanical rules (contrast, names, roles, structure) and
// is blind to whether a control makes sense. It earns its place because those
// mechanical rules are exactly the ones that regress silently — a colour token
// swapped in one component, a label dropped in a refactor.
//
// Every WCAG 2.0/2.1/2.2 A and AA tag, so the gate cannot quietly narrow.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const RECIPE =
	'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

/** Readable failures: axe's own report is a wall of JSON. */
function summarise(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
	return violations
		.map((v) => {
			const where = v.nodes.slice(0, 3).map((n) => n.html.slice(0, 70));
			return `${v.id} (${v.impact}, ${v.nodes.length} nodes): ${v.help}\n    ${where.join('\n    ')}`;
		})
		.join('\n  ');
}

// Both themes, because the palette is defined twice and only one half is ever
// on screen at a time. The dark half is how `text-tomato-600` links sat at
// 2.71:1 in the community and pizzeria tables without anyone seeing it.
for (const theme of ['light', 'dark'] as const) {
	// Both view modes, because expert reveals roughly fourteen more controls
	// that beginner never renders.
	for (const mode of ['expert', 'beginner'] as const) {
		test(`no accessibility violations: ${mode}, ${theme}`, async ({ page }) => {
			await openRecipe(page, mode === 'beginner' ? `${RECIPE}&md=b` : RECIPE);
			if (theme === 'dark') {
				await page.evaluate(() => document.documentElement.classList.add('dark'));
			}
			// Community and 50 Top Pizza ship collapsed. Their rows are the
			// densest markup in the app and would otherwise never be scanned.
			//
			// Content sections only, never the popovers. The actions menu and the
			// fit-score panel are absolutely positioned and are MEANT to cover
			// what is beneath them while open, so forcing them open alongside
			// everything else made axe report the verbosity toggle under the menu
			// as "partially obscured" — a true observation about an arrangement no
			// user is ever in, since opening either popover is a deliberate act
			// that dismisses on the next click. Their own contents are covered by
			// the menu-keyboard and dialog specs instead.
			await page.evaluate(() =>
				document.querySelectorAll('details').forEach((d) => {
					const panel = d.querySelector(':scope > :not(summary)');
					const floats = panel !== null && getComputedStyle(panel).position === 'absolute';
					if (!floats) d.open = true;
				})
			);

			const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
			expect(violations, `\n  ${summarise(violations)}\n`).toEqual([]);
		});
	}
}
