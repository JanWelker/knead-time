import type { Messages } from '../i18n/messages';
import type { SerializableInputs } from '../dough/urlState';

// Helpers shared by the Community and Pizzerias tables/cards. Each takes a
// localized message bundle to keep the components free of i18n plumbing.

export function yeastLabel(inputs: Partial<SerializableInputs>, t: Messages): string {
	if (inputs.yeastType === 'sourdough') return t.form.yeast_sourdough;
	if (inputs.yeastType === 'fresh') return t.form.yeast_fresh;
	return '—';
}

export function preFermentLabel(inputs: Partial<SerializableInputs>, t: Messages): string {
	const pf = inputs.preFerment;
	if (!pf) return '—';
	const name = pf.type === 'biga' ? t.form.preFerment_biga : t.form.preFerment_poolish;
	// Source labels like "Biga (stiff)" — keep just "Biga" for table density.
	const short = name.split('(')[0].trim();
	return `${short} ${pf.flourPercent}%`;
}

export function numLabel(value: number | undefined, suffix = ''): string {
	return value === undefined ? '—' : `${value}${suffix}`;
}
