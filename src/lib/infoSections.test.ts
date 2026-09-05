import { describe, expect, it } from 'vitest';
import { INFO_SECTIONS, infoSectionKeys } from './infoSections';
import { LOCALES, MESSAGES } from './i18n/messages';

// The panel is a contract: every calculation the app performs has to be
// represented there, in all five locales, and the copy has to match the code.
// Before this the contract lived only in CLAUDE.md and in whoever remembered
// to read it — the markup and the message bundle could disagree in either
// direction with a green suite. These two tests are that contract, checked.
describe('the "Get nerdy" panel and the message bundle agree', () => {
	it('renders only keys that exist, in every locale', () => {
		for (const locale of LOCALES) {
			const form = MESSAGES[locale].form as Record<string, string>;
			for (const key of infoSectionKeys()) {
				expect(form[key], `${locale}.form.${key}`).toBeTruthy();
			}
		}
	});

	it('renders every info_ message exactly once', () => {
		// info_heading names the disclosure itself and info_intro sits above the
		// sections — everything else is section copy and has to be on screen.
		const standalone = new Set(['info_heading', 'info_intro']);
		const inBundle = Object.keys(MESSAGES.en.form)
			.filter((k) => k.startsWith('info_'))
			.filter((k) => !standalone.has(k));
		const rendered = infoSectionKeys();

		expect([...rendered].sort()).toEqual([...inBundle].sort());
		expect(new Set(rendered).size, 'a key rendered twice').toBe(rendered.length);
	});

	it('pins the formulas the panel prints against the code', () => {
		// The formulas are not translated — they are the code's own maths, quoted.
		// Pinned literally so a constant that moves in src/lib/dough/ cannot leave
		// a stale formula on screen without this failing.
		const formulas = INFO_SECTIONS.flatMap((s) =>
			s.parts.filter((p) => p.kind === 'formula').map((p) => p.formula)
		);
		expect(formulas).toEqual([
			'f(T) = 2^((T − 22) / 10)',
			'yeast% = target / Σ (w · hours · f(T))',
			'wallHours = refHours / f(roomTempC),  8 ≤ wallHours ≤ 24',
			'water = 3·23 − 2·room − friction',
			'flour = total / pctSum',
			'pctSum = 100 + hydration + salt% + yeast% + oil% + sugar%',
			'pctSum = 100 + hydration + salt% + oil% + sugar%',
			'hours(W) = lo · (hi/lo)^((W − Wlo) / (Whi − Wlo))'
		]);
	});
});
