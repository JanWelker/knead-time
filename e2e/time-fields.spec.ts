import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { openForm, openQuestion } from './helpers';

// The time box clipped its own value: in en-US the ask flow's first question
// showed `07:00 PM` as `07:00 PN` (issue #435), and the sheet's pair cut the
// `M` off the same way. Both widths were fixed numbers measured against a
// 24-hour `19:00`, and a 12-hour locale adds ` PM` beside the picker glyph.
//
// Nothing on the page can see this: the fields live in a user-agent shadow
// root, and `scrollWidth` on a time input equals `clientWidth` however much of
// the value is cut off (measured — a 60 px box still reports no overflow). So
// this reads the shadow tree through the DevTools protocol, which pierces it,
// and compares the row of fields against the edit area that clips it.
//
// The 12-hour rendering is the platform's call. On Linux, where CI runs,
// Chromium formats the time box by the pinned `en-US` locale; on macOS it
// follows the system region, which may well be a 24-hour one, and then this
// passes without having tested anything. CI therefore also insists the AM/PM
// field is really there, so the test cannot quietly go vacuous where it counts.

type Node = {
	nodeId: number;
	nodeName: string;
	attributes?: string[];
	children?: Node[];
	shadowRoots?: Node[];
};

const kids = (n: Node) => [...(n.shadowRoots ?? []), ...(n.children ?? [])];

function byPseudo(n: Node, pseudo: string): Node | undefined {
	const attrs = n.attributes ?? [];
	const at = attrs.indexOf('pseudo');
	if (at >= 0 && attrs[at + 1] === pseudo) return n;
	for (const c of kids(n)) {
		const hit = byPseudo(c, pseudo);
		if (hit) return hit;
	}
	return undefined;
}

function inputs(n: Node, type: string, out: Node[] = []): Node[] {
	const attrs = n.attributes ?? [];
	const at = attrs.indexOf('type');
	if (n.nodeName === 'INPUT' && at >= 0 && attrs[at + 1] === type) out.push(n);
	for (const c of kids(n)) inputs(c, type, out);
	return out;
}

async function rightEdge(cdp: CDPSession, n: Node): Promise<number> {
	const { model } = await cdp.send('DOM.getBoxModel', { nodeId: n.nodeId });
	return model.border[2];
}

/** How far each visible date/time box's value runs past the area that shows it. */
async function overflow(page: Page, type: 'time' | 'date') {
	const cdp = await page.context().newCDPSession(page);
	const { root } = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })) as {
		root: Node;
	};
	const out: { overrun: number; ampm: boolean }[] = [];
	for (const input of inputs(root, type)) {
		const edit = byPseudo(input, '-webkit-datetime-edit');
		const fields = byPseudo(input, '-webkit-datetime-edit-fields-wrapper');
		// An input in a closed view or a closed dialog has no box at all.
		const visible = await cdp
			.send('DOM.getBoxModel', { nodeId: input.nodeId })
			.then(() => true)
			.catch(() => false);
		if (!visible || !edit || !fields) continue;
		out.push({
			overrun: (await rightEdge(cdp, fields)) - (await rightEdge(cdp, edit)),
			ampm: !!byPseudo(input, '-webkit-datetime-edit-ampm-field')
		});
	}
	await cdp.detach();
	return out;
}

async function expectUnclipped(page: Page, type: 'time' | 'date', count: number) {
	const boxes = await overflow(page, type);
	expect(boxes).toHaveLength(count);
	for (const box of boxes) {
		// Half a pixel of subpixel rounding, not a letter.
		expect(box.overrun).toBeLessThanOrEqual(0.5);
		if (process.env.CI && type === 'time') expect(box.ampm).toBe(true);
	}
}

for (const width of [390, 1440]) {
	test.describe(`${width} px`, () => {
		test.use({ viewport: { width, height: 900 } });

		test('a 12-hour time is not cut short on the first question', async ({ page }) => {
			await openQuestion(page, 'when');
			await expectUnclipped(page, 'time', 1);
			await expectUnclipped(page, 'date', 1);
		});

		// The sheet sets each time beside its date in one row, so widening the
		// time takes room from the date: both halves of both pairs are checked.
		test('a 12-hour time is not cut short in the sheet', async ({ page }) => {
			await openForm(page, 'v=7&n=6');
			await expectUnclipped(page, 'time', 2);
			await expectUnclipped(page, 'date', 2);
		});
	});
}
