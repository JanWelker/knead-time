import type { PreFermentSpec } from './types';

// The numeric bands InputForm.svelte enforces via min/max attributes — the
// single source both entry points share: the form clamps typed values through
// FormState and decode() clamps hand-crafted URLs, so no route into the math
// can carry an out-of-band number (issues #193/#194). Every value the app's
// own encoders ever wrote sits inside these bands, so clamping never changes
// the meaning of a legacy share-link.
export const INPUT_BOUNDS = {
	pizzaCount: { min: 1, max: 100 },
	ballWeight: { min: 100, max: 600 },
	hydration: { min: 50, max: 90 },
	saltPercent: { min: 0, max: 5 },
	oilPercent: { min: 0, max: 15 },
	sugarPercent: { min: 0, max: 5 },
	starterHydration: { min: 40, max: 150 },
	roomTempC: { min: 10, max: 35 },
	fridgeTempC: { min: 0, max: 12 },
	preFermentTempC: { min: 4, max: 35 }
} as const;

export type BoundedInput = keyof typeof INPUT_BOUNDS;

// Pre-ferment flour shares live in their own band because the cap is shared:
// each share sits in [MIN, MAX] and the shares together may not exceed MAX.
export const PREFERMENT_SHARE_MIN = 5;
export const PREFERMENT_SHARE_MAX = 80;

// NaN collapses to the band minimum — a cleared form field must not poison
// the math; infinities clamp to the nearest band edge like any other outlier.
export function clampInput(field: BoundedInput, value: number): number {
	const { min, max } = INPUT_BOUNDS[field];
	if (Number.isNaN(value)) return min;
	return Math.min(max, Math.max(min, value));
}

// Live clamp for the share field currently being edited: cap it against the
// other enabled share so the sum can never pass the cap, but only floor at 0
// — mid-typing values ("3" on the way to "30") must survive; the recipe-side
// clampPreFermentShares raises sub-minimum shares to the band minimum.
// Non-numeric input (an emptied field binds null/NaN) keeps the last value.
export function clampShareInput(value: number, otherShare: number, fallback: number): number {
	if (!Number.isFinite(value)) return fallback;
	return Math.min(Math.max(0, value), PREFERMENT_SHARE_MAX - otherShare);
}

// Canonical sanitiser for a pre-ferment list: clamps each share into
// [PREFERMENT_SHARE_MIN, PREFERMENT_SHARE_MAX], and where the sum would pass
// the cap the later entry yields to the earlier one — dropped entirely when
// the remainder falls below the minimum. Entry order is preserved; callers
// own dedupe and canonical ordering.
export function clampPreFermentShares(list: PreFermentSpec[]): PreFermentSpec[] {
	const out: PreFermentSpec[] = [];
	for (const pf of list) {
		const clamped = Math.min(PREFERMENT_SHARE_MAX, Math.max(PREFERMENT_SHARE_MIN, pf.flourPercent));
		const remaining = PREFERMENT_SHARE_MAX - out.reduce((sum, p) => sum + p.flourPercent, 0);
		const share = Math.min(clamped, remaining);
		if (share < PREFERMENT_SHARE_MIN) continue;
		out.push({ type: pf.type, flourPercent: share });
	}
	return out;
}
