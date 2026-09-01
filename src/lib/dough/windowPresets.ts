import type { FermentWindowBand } from './flour';

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
export function nearestWindowStopIndex(hours: number, stops: number[] = WINDOW_STOPS): number {
	let best = 0;
	for (let i = 1; i < stops.length; i++) {
		if (Math.abs(stops[i] - hours) < Math.abs(stops[best] - hours)) best = i;
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
export function windowAxisPercent(hours: number, stops: number[] = WINDOW_STOPS): number {
	const last = stops.length - 1;
	if (hours <= stops[0]) return 0;
	if (hours >= stops[last]) return 100;
	let i = 0;
	while (stops[i + 1] < hours) i++;
	const lo = stops[i];
	const hi = stops[i + 1];
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

// Largest stop that still fits between now and the bake, or -1 when even the
// shortest one overshoots. Fermentation cannot run past "ready to bake" — the
// bake time is the anchor and the window is measured back from it — so any
// stop longer than the time remaining would have had to start before now. The
// slider greys those out rather than offering a plan that is already lost.
export function reachableStopIndex(hoursUntilBake: number, stops: number[] = WINDOW_STOPS): number {
	for (let i = stops.length - 1; i >= 0; i--) {
		if (stops[i] <= hoursUntilBake) return i;
	}
	return -1;
}

// The stop to land on when the bake time moves: the longest window the flour
// still handles well that also fits before the bake.
//
// Picking when to bake is the app's primary action, so the schedule should
// answer it with the best plan available rather than keeping whatever window
// happened to be set for the old time. "Best" is the longest one, because
// fermentation time is what buys flavour — bounded on one side by the
// deadline (reachableStopIndex) and on the other by the flour's own tolerance
// (the zones), which is exactly the pair of limits the rail already paints.
//
// Zones are used rather than a raw band because each one is already clipped
// to its own regime, so a stop inside the cold zone is necessarily long
// enough to run cold and a stop inside the room zone necessarily short enough
// to run at room temperature — the choice can't contradict the mode the
// schedule will then pick for it.
//
// Returns null when there is nothing to recommend: no flour stated (without
// one there is no notion of "good", so the window is left as the user set it)
// or a bake so close that not even the shortest window fits.
export function bestWindowStopIndex(
	hoursUntilBake: number,
	zones: { room: FermentWindowBand | null; cold: FermentWindowBand | null } | null,
	stops: number[] = WINDOW_STOPS
): number | null {
	if (zones === null) return null;
	const reachable = reachableStopIndex(hoursUntilBake, stops);
	if (reachable < 0) return null;

	const inZone = (hours: number) =>
		(zones.room !== null && hours >= zones.room.min && hours <= zones.room.max) ||
		(zones.cold !== null && hours >= zones.cold.min && hours <= zones.cold.max);

	for (let i = reachable; i >= 0; i--) {
		if (inZone(stops[i])) return i;
	}

	// No stop lands inside the tolerance at all. The only flours this happens
	// to are the weak ones: their room band closes before the shortest stop
	// (a supermarket 00 wants 2–4 h; the rail starts at 6 h) and their cold
	// band never survives the clip to the cold regime. A flour strong enough
	// to have a cold zone always has stops inside one band or the other, at
	// any deadline that fits a window at all. So the answer here is the
	// shortest window the rail offers — as close to that flour's limit as it
	// can get, and the direction that errs toward under- rather than
	// over-fermenting.
	return 0;
}

// The window this recipe should actually get: the longest one that is both
// inside the flour's tolerance and still fits before the bake.
//
// This is the number the re-pick aims at, and it is almost never one of the
// canonical stops — a flour's band ends where its gluten gives out (Caputo
// Pizzeria at 40 h), not on a round Neapolitan figure. Rounding it down to
// 36 h to fit the rail threw away hours of good fermentation and, worse, made
// the value unreachable by hand: the slider could never return to what the app
// itself had chosen. So the ideal becomes a stop of its own (`stopsWithIdeal`).
//
// Floored to the hour: it has to stay inside both limits it was derived from,
// and the tolerance band is interpolated from a table its own authors call a
// broad reference, so its minutes are noise either way.
//
// Cold is tried first because it is the longer regime; a flour with no cold
// zone, or a bake too close to reach one, falls back to the room band. Null
// when nothing good is reachable — including an ideal below the rail's
// shortest stop, which no slider position could express.
export function idealWindowHours(
	zones: { room: FermentWindowBand | null; cold: FermentWindowBand | null } | null,
	hoursUntilBake: number
): number | null {
	if (zones === null) return null;
	for (const band of [zones.cold, zones.room]) {
		if (band === null || band.min > hoursUntilBake) continue;
		const ideal = Math.floor(Math.min(band.max, hoursUntilBake));
		if (ideal >= WINDOW_STOPS[0] && ideal >= band.min) return ideal;
	}
	return null;
}

// The rail's stops with the ideal spliced in, or the canonical list unchanged
// when there is no ideal, it already coincides with a stop, or it falls outside
// the rail. The rail is linear in stop *index*, so this list is what positions
// every notch, zone edge and tick label — the tick labels shift slightly when
// the ideal appears or moves, which only happens on a flour or bake-time
// change, never mid-drag.
export function stopsWithIdeal(ideal: number | null): number[] {
	if (ideal === null || ideal < WINDOW_STOPS[0]) return WINDOW_STOPS;
	if (ideal > WINDOW_STOPS[WINDOW_STOPS.length - 1] || WINDOW_STOPS.includes(ideal)) {
		return WINDOW_STOPS;
	}
	return [...WINDOW_STOPS, ideal].sort((a, b) => a - b);
}
