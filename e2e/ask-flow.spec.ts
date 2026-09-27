import { expect, test, type Page } from '@playwright/test';
import { chosenWindow, currentView, dragTo, openQuestion, slider } from './helpers';

// The questions. Each has to be answerable in one gesture and skippable by
// somebody who already knows what they want — a flow that costs a power user
// twelve taps is a worse form, not a better one.
//
// How many there are is itself the first answer (issue #316): the simple route
// asks six, the advanced route nine, and the three extra screens are the field
// groups the recipe sheet only shows in expert. A recipe in the query resolves
// the view mode to expert, so a spec that wants the simple walk opens bare.

const RECIPE = 'v=6&n=6&b=280&h=70&s=3&y=f&t=22&ft=4&fw=265&r=2026-09-06T17%3A00%3A00.000Z';

const rail = (page: Page) =>
	page.getByRole('navigation', { name: 'Questions' }).getByRole('button');
const nextButton = (page: Page) => page.getByRole('button', { name: 'Next', exact: true });
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

test('the simple route is six questions, and the rail walks between them', async ({ page }) => {
	await openQuestion(page, 'mode');

	await expect(rail(page)).toHaveCount(6);
	await expect(h1(page)).toHaveText('How much do you want to decide?');

	for (const heading of [
		'When are you eating?',
		'Which flour is in your cupboard?',
		'How long should it ferment?',
		'How many pizzas?',
		'How will you knead it?'
	]) {
		await nextButton(page).click();
		await expect(h1(page)).toHaveText(heading);
	}
	// The last question hands over rather than offering a seventh.
	await expect(nextButton(page)).toHaveCount(0);

	await rail(page).first().click();
	await expect(h1(page)).toHaveText('How much do you want to decide?');
	await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
});

// The point of asking first: the answer re-cuts the walk behind it, and the
// three screens it adds are the sheet's own groups rather than a second
// hand-written copy of those fields.
test('choosing the advanced route adds the three screens the simple one skips', async ({
	page
}) => {
	await openQuestion(page, 'mode');

	await page.getByRole('radio', { name: /^Advanced/ }).check();
	await expect(rail(page)).toHaveCount(9);

	for (const heading of [
		'When are you eating?',
		'Which flour is in your cupboard?',
		'How long should it ferment?',
		'How many pizzas?',
		'What goes into it?',
		'How will you knead it?',
		'What is going to raise it?',
		'Where is it going to sit?'
	]) {
		await nextButton(page).click();
		await expect(h1(page)).toHaveText(heading);
	}
	await expect(nextButton(page)).toHaveCount(0);

	// And the fields on those screens are the sheet's, not a lookalike: the
	// leaven group's pre-ferment branching is the part that would rot in a copy.
	await rail(page).nth(7).click();
	await expect(page.getByRole('combobox', { name: 'Yeast' })).toBeVisible();
	await page.getByRole('checkbox', { name: /^Biga/ }).check();
	await expect(page.getByLabel('Biga flour (% of total)')).toBeVisible();
	// Autolyse rests the flour, and a biga already does — so it goes away.
	await expect(page.getByRole('checkbox', { name: /Autolyse/ })).toHaveCount(0);
});

// A fragment can name a question the current mode does not ask. Standing on a
// screen with no Back and no Next is the failure; the flow falls back to the
// question that decides which screens exist at all.
test('an advanced question opened on the simple route falls back to the first', async ({
	page
}) => {
	await openQuestion(page, 'leaven');

	await expect(h1(page)).toHaveText('How much do you want to decide?');
	expect(new URL(page.url()).hash).toBe('#ask/mode');
});

test('the whole flow is skippable from the first question', async ({ page }) => {
	// Speed for someone who knows what they want is the requirement a wizard
	// usually fails. One press from question one to the finished plan.
	await openQuestion(page, 'mode', RECIPE);

	await page.getByRole('button', { name: 'Skip to the plan' }).click();
	expect(await currentView(page)).toBe('plan');
});

// Every screen says what its answer buys and what it costs. A control with no
// consequence written next to it is a survey question, and half of these are
// decisions a first-time baker cannot weigh from the label alone.
test('every question names an upside and a downside', async ({ page }) => {
	await openQuestion(page, 'mode');
	await page.getByRole('radio', { name: /^Advanced/ }).check();

	const upside = page.getByRole('term').filter({ hasText: 'What it buys you' });
	const downside = page.getByRole('term').filter({ hasText: 'What it costs' });

	for (let i = 0; i < 9; i++) {
		await rail(page).nth(i).click();
		await expect(upside).toHaveCount(1);
		await expect(downside).toHaveCount(1);
		// Not merely present: a heading over an empty line says nothing.
		await expect(page.getByRole('definition').first()).not.toBeEmpty();
	}
});

test('the pizza stepper answers with a single tap in either direction', async ({ page }) => {
	await openQuestion(page, 'batch', RECIPE);

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
	await openQuestion(page, 'batch', RECIPE);

	const running = await page.locator('.kt-enter').evaluate((el) => el.getAnimations().length);
	expect(running).toBe(0);
});
