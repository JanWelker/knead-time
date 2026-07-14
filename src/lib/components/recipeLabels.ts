import type { Messages } from '../i18n/messages';
import type { SerializableInputs } from '../dough/urlState';

// Helpers shared by the Community and Pizzerias tables/cards. Each takes a
// localized message bundle to keep the components free of i18n plumbing.

export function yeastLabel(inputs: Partial<SerializableInputs>, t: Messages): string {
	switch (inputs.yeastType) {
		case 'fresh':
			return t.form.yeast_fresh;
		case 'instant':
			return t.form.yeast_instant;
		case 'active-dry':
			return t.form.yeast_active_dry;
		case 'sourdough':
			return t.form.yeast_sourdough;
		default:
			return '—';
	}
}

export function preFermentLabel(inputs: Partial<SerializableInputs>, t: Messages): string {
	const pfs = inputs.preFerments;
	if (!pfs || pfs.length === 0) return '—';
	return pfs
		.map((pf) => {
			const name = pf.type === 'biga' ? t.form.preFerment_biga : t.form.preFerment_poolish;
			// Source labels like "Biga (stiff)" — keep just "Biga" for table density.
			const short = name.split('(')[0].trim();
			return `${short} ${pf.flourPercent}%`;
		})
		.join(' + ');
}

export function numLabel(value: number | undefined, suffix = ''): string {
	return value === undefined ? '—' : `${value}${suffix}`;
}
