import type { Messages } from '../i18n/messages';
import type { SerializableInputs } from '../dough/urlState';

// Helpers and copy shapes shared by the Community and Pizzerias tables/cards.
// Each takes a localized message bundle to keep the components free of i18n
// plumbing.
//
// The two message namespaces are parallel by design — same heading/intro/empty
// /contribute shape, same col_* names for the columns they share — so these
// structural types accept either one without the components knowing which
// section they are in. Community simply has no oil or sugar column, which is
// why those two are optional rather than absent from the list.

export interface RecipeSectionCopy {
	heading: string;
	intro: string;
	empty: string;
	contribute: {
		before_md: string;
		md: string;
		between: string;
		pr: string;
		after: string;
	};
}

export interface RecipeSpecLabels {
	col_pizzas: string;
	col_ball: string;
	col_hydration: string;
	col_salt: string;
	col_oil?: string;
	col_sugar?: string;
	col_yeast: string;
	col_temp: string;
	col_fridge: string;
	col_preFerment: string;
}

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
