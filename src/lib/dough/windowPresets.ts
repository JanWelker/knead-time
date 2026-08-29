// The fermentation windows the schedule slider snaps to.
//
// These are the totals Neapolitan practice actually talks about, so dragging
// the slider lands on a plan someone would recognise rather than an arbitrary
// "37 h 15 min". Exact control still lives in the startAt/readyBy fields —
// the slider is the quick way to say "make it a 24-hour dough".
//
//    6 h — fast same-day
//    8 h — the AVPN direct dough: ~2 h bulk + ~6 h appretto at room temperature
//   12 h — overnight at room temperature
//   16 h — where this app switches from room to cold fermentation
//   18 h — contemporary overnight-plus
//   24 h — the contemporary workhorse
//   36 h — extended cold
//   48 h — common contemporary long cold
//   72 h — long cold, and the point where flour strength starts to matter
//   80 h — NOT a canonical time. It is the schedule's own ceiling: cold bulk
//          caps at COLD_BULK_CEIL_MIN, so ~78 h is the longest window even a
//          maximal pre-ferment can still spend. Kept as the last stop so those
//          schedules stay reachable and the strongest flours' "too long"
//          warning can still be triggered from the slider.
export const WINDOW_STOPS = [6, 8, 12, 16, 18, 24, 36, 48, 72, 80];

// Index of the stop closest to an arbitrary window. Ties keep the shorter
// stop, which is the safer direction for a dough.
export function nearestWindowStopIndex(hours: number): number {
	let best = 0;
	for (let i = 1; i < WINDOW_STOPS.length; i++) {
		if (Math.abs(WINDOW_STOPS[i] - hours) < Math.abs(WINDOW_STOPS[best] - hours)) best = i;
	}
	return best;
}

// Where a given number of hours sits on the slider rail, as a percentage.
//
// The rail is linear in *stop index*, not in hours: the stops bunch up at the
// short end (6, 8, 12, 16, 18) and spread out at the long end (48, 72), so an
// hour-linear rail would squash half the useful choices into its first fifth
// — unusable with a thumb on a phone. Spacing the stops evenly gives every
// choice the same target size, and interpolating between them keeps the
// tolerance zones and tick labels aligned with the same axis.
export function windowAxisPercent(hours: number): number {
	const last = WINDOW_STOPS.length - 1;
	if (hours <= WINDOW_STOPS[0]) return 0;
	if (hours >= WINDOW_STOPS[last]) return 100;
	let i = 0;
	while (WINDOW_STOPS[i + 1] < hours) i++;
	const lo = WINDOW_STOPS[i];
	const hi = WINDOW_STOPS[i + 1];
	return ((i + (hours - lo) / (hi - lo)) / last) * 100;
}

// Which "what a longer ferment buys you" explanation the schedule shows in
// its detailed view. Both thresholds are themselves stops, so the copy
// changes exactly when the thumb crosses a labelled notch rather than at some
// invisible point in between.
//
//   short  — under 12 h the yeast is mostly making gas; the enzymes have had
//            little time to do anything
//   medium — amylase has broken enough starch into sugar to matter for taste
//            and crust colour, and protease has relaxed the gluten
//   long   — the deep-flavour end, where returns flatten and the flour's own
//            tolerance becomes the binding constraint
export const BENEFIT_MEDIUM_FROM_H = 12;
export const BENEFIT_LONG_FROM_H = 36;

export type FermentationBenefitTier = 'short' | 'medium' | 'long';

export function fermentationBenefitTier(hours: number): FermentationBenefitTier {
	if (hours < BENEFIT_MEDIUM_FROM_H) return 'short';
	if (hours < BENEFIT_LONG_FROM_H) return 'medium';
	return 'long';
}
