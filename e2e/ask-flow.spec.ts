import { expect, test } from '@playwright/test';
import { chosenWindow, currentView, dragTo, openQuestion, slider } from './helpers';

// The five questions. Each has to be answerable in one gesture and skippable by
// somebody who already knows what they want — a flow that costs a power user
// twelve taps is a worse form, not a better one.

const RECIPE = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-06T17%3A00%3A00.000Z';

test('every question is one gesture, and the rail walks between them', async ({ page }) => {
	await openQuestion(page, 'when', RECIPE);

	// Forward through all five, then back to the first, by the rail alone.
	const rail = page.getByRole('navigation', { name: 'Questions' }).getByRole('button');
	await expect(rail).toHaveCount(5);

	for (const heading of [
		'How many pizzas?',
		'Which flour is in your cupboard?',
		'How long should it ferment?',
		'How will you knead it?'
	]) {
		await page.getByRole('button', { name: 'Next', exact: true }).click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
	}
	// The last question hands over rather than offering a sixth.
	await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);

	await rail.first().click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('When are you eating?');
	await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
});

test('the whole flow is skippable from the first question', async ({ page }) => {
	// Speed for someone who knows what they want is the requirement a wizard
	// usually fails. One press from question one to the finished plan.
	await openQuestion(page, 'when', RECIPE);

	await page.getByRole('button', { name: 'Skip to the plan' }).click();
	expect(await currentView(page)).toBe('plan');
});

test('the pizza stepper answers with a single tap in either direction', async ({ page }) => {
	await openQuestion(page, 'pizzas', RECIPE);

	const count = page.getByLabel('Pizzas', { exact: true });
	await expect(count).toHaveValue('6');
	await page.getByRole('button', { name: 'One more' }).click();
	await expect(count).toHaveValue('7');
	await page.getByRole('button', { name: 'One fewer' }).click();
	await expect(count).toHaveValue('6');
});

// The window question is the one that changes everything, so it gets a whole
// screen — and the slider on it is the same control, with the same clamping,
// as the one in the recipe sheet.
test('the window question drives the same slider as the sheet', async ({ page }) => {
	await openQuestion(page, 'window', `${RECIPE}&sa=2026-09-05T09%3A00%3A00.000Z`);

	expect(await chosenWindow(page)).toBe('32 h');
	await dragTo(page, 0);
	expect(await chosenWindow(page)).toBe('6 h');
	// ...and the answer is written into the shared recipe query, not held aside.
	await expect.poll(() => new URL(page.url()).searchParams.get('sa')).toContain('2026-09-06');
	expect(await slider(page).getAttribute('aria-label')).toBe('Fermentation window');
});

// Motion is part of the argument here — the question block slides so the flow
// reads as one surface travelling — but it is the only non-user-triggered
// animation in the app and it has to disappear entirely for anyone who asked
// for less of it. A CSS-only guard is easy to lose in a refactor.
test('the question surface does not animate when the reader asked for less motion', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await openQuestion(page, 'pizzas', RECIPE);

	const running = await page.locator('.kt-enter').evaluate((el) => el.getAnimations().length);
	expect(running).toBe(0);
});
