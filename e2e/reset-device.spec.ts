import { expect, test, type Page } from '@playwright/test';
import {
	currentView,
	openLibrary,
	openMenu,
	openRecipe,
	openResetDialog,
	resetDevice
} from './helpers';

// "Reset this device" (issue #469): forget everything the app remembers on
// this device except the recipe book, then start over from a bare URL. The
// list of slots is pinned by membership in src/lib/resetDevice.test.ts; what
// only a browser can show is that the menu reaches it on every view, that the
// confirmation says what goes and what stays, and that after the reload the
// recipe book is the only thing left.

const RECIPE =
	'v=8&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T09%3A00%3A00.000Z';

const BOOK = JSON.stringify([
	{ name: 'Friday', search: 'v=8&n=4&b=250', savedAt: '2026-08-28T18:00:00.000Z' }
]);

// Every slot the app has ever written on a device: the live ones, the legacy
// ones the theme and the language migrate out of, and the retired TRMNL id.
const SEEDED: Record<string, string> = {
	'kneadtime:lastRecipe': 'v=8&n=9&b=300',
	'kneadtime:reminders': RECIPE,
	'kneadtime:mode': 'expert',
	'kneadtime:scheduleVerbosity': 'short',
	'kneadtime:theme': 'dark',
	'kneadtime:locale': 'de',
	'kneadtime:recipes': BOOK,
	theme: 'dark',
	'doughcalc:locale': 'de',
	'kneadtime:trmnlUuid': '01234567-89ab-cdef-0123-456789abcdef',
	'doughcalc:trmnlUuid': '01234567-89ab-cdef-0123-456789abcdef'
};

async function seed(page: Page, slots: Record<string, string>) {
	await page.evaluate((entries) => {
		for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
	}, slots);
}

function stored(page: Page): Promise<Record<string, string>> {
	return page.evaluate(() => ({ ...localStorage }));
}

test('a reset forgets everything on the device except the saved recipes', async ({ page }) => {
	await openRecipe(page, RECIPE);
	await seed(page, SEEDED);

	await resetDevice(page);

	expect(await stored(page)).toEqual({ 'kneadtime:recipes': BOOK });
	// A bare URL: no recipe to go straight to, so the questions start again, in
	// the defaults — the forgotten German and dark theme do not come back.
	expect(await currentView(page)).toBe('ask');
	expect(new URL(page.url()).searchParams.get('n')).toBe('6');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(
		false
	);
	// And the book is still on the rack.
	await openLibrary(page);
	await expect(page.getByText('Friday').first()).toBeVisible();
});

test('the confirmation lists what goes and says what stays', async ({ page }) => {
	await openRecipe(page, RECIPE);
	const dialog = await openResetDialog(page);
	await expect(dialog.getByTestId('reset-list').locator('li')).toHaveText([
		'the recipe you were working on',
		'step reminders — the reminder service is asked to delete this device’s schedule',
		'simple or all options',
		'short or detailed steps',
		'the theme',
		'the language'
	]);
	await expect(dialog).toContainText('Your saved recipes stay.');
	// A page cannot revoke a notification permission; saying nothing would
	// promise more than the reset does.
	await expect(dialog).toContainText('a page cannot take it back');
});

test('cancelling the reset forgets nothing', async ({ page }) => {
	await openRecipe(page, RECIPE);
	// Not the reminders fingerprint: with no subscription behind it, the
	// reminders dialog clears it on its own as it mounts, which would race this.
	const rest = { ...SEEDED };
	delete rest['kneadtime:reminders'];
	await seed(page, rest);
	const before = await stored(page);
	const dialog = await openResetDialog(page);
	await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
	await expect(dialog).toBeHidden();
	expect(await stored(page)).toEqual(before);
	expect(await currentView(page)).toBe('plan');
});

// The reset lives in MastheadMenu itself, beside language and theme, because
// a view's own snippet would strand it on that view and nowhere else.
test('the reset is in the menu on every view', async ({ page }) => {
	for (const hash of ['#ask/when', '#plan', '#library']) {
		await openRecipe(page, RECIPE, hash);
		await openMenu(page);
		await expect(
			page.getByRole('menuitem', { name: 'Reset this device…', exact: true })
		).toBeVisible();
	}
});
