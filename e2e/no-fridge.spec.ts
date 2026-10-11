import { expect, test } from '@playwright/test';
import { openForm, openRecipe, sheet, sheetField } from './helpers';

// "No fridge" (v8, issue #422): the AVPN disciplinare ferments 12–24 h at room
// temperature and never mentions a fridge, but the 16 h cold switch sent every
// window from 16 h up into one with no way to say no. The math is pinned in
// schedule.test.ts; what only a browser shows is the wiring — the toggle
// reaching the plan, the two fridge inputs leaving the sheet, and the flag
// surviving in the share link.

// A 24 h window, well past the cold switch.
const DAY =
	'v=8&n=6&b=280&h=62&s=3&y=f&t=20&ft=4&al=0&fw=0&r=2026-09-05T17%3A00%3A00.000Z&sa=2026-09-04T17%3A00%3A00.000Z';

const COLD_STEP = 'Bulk ferment (fridge)';
const TOGGLE = /Keep it out of the fridge/;

test('the toggle keeps a 24 h dough on the counter and takes the fridge inputs away', async ({
	page
}) => {
	await openForm(page, DAY);
	const form = sheet(page);
	await expect(page.getByText(COLD_STEP)).toHaveCount(1);
	await expect(sheetField(page, 'Fridge temperature')).toBeVisible();
	await expect(form.getByRole('checkbox', { name: /Proof the balls in the fridge/ })).toBeVisible();

	await form.getByRole('checkbox', { name: TOGGLE }).check();

	// Inert without a cold leg, so they go — rather than sit there accepting
	// values that change nothing.
	await expect(sheetField(page, 'Fridge temperature')).toHaveCount(0);
	await expect(form.getByRole('checkbox', { name: /Proof the balls in the fridge/ })).toHaveCount(
		0
	);
	await expect(page).toHaveURL(/[?&]nf=1(&|#|$)/);

	await page.keyboard.press('Escape');
	await expect(sheet(page)).toHaveCount(0);
	await expect(page.getByText(COLD_STEP)).toHaveCount(0);
	await expect(page.getByText('Room ferment').first()).toBeVisible();
});

test('a shared no-fridge link opens on the counter with the box ticked', async ({ page }) => {
	await openRecipe(page, `${DAY}&nf=1`);
	await expect(page.getByText(COLD_STEP)).toHaveCount(0);
	await expect(page.getByText('Room ferment').first()).toBeVisible();

	const form = await openForm(page, `${DAY}&nf=1`);
	await expect(form.getByRole('checkbox', { name: TOGGLE })).toBeChecked();
});

test('switching it back off restores the fridge temperature it hid', async ({ page }) => {
	const form = await openForm(page, DAY.replace('ft=4', 'ft=6'));
	const toggle = form.getByRole('checkbox', { name: TOGGLE });
	await toggle.check();
	await toggle.uncheck();
	await expect(sheetField(page, 'Fridge temperature')).toHaveValue('6');
	await expect(page).not.toHaveURL(/[?&]nf=/);
});
