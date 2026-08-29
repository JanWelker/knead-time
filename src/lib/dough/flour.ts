import type { FermentMode } from './types';

// Flour strength (Chopin alveograph W) and what it actually predicts.
//
// W measures the deformation energy of a dough bubble — how much work the
// gluten survives before it tears. It is NOT a water-absorption figure: that
// is a separate farinograph measurement driven by protein content, damaged
// starch, pentosans and ash, and two flours at the same W can differ by
// several points of absorption. So W never touches hydration or the yeast
// solve here (issue #260). What it does predict is how long the dough
// tolerates fermenting before proteolysis wrecks the gluten — which is
// exactly the quantity a time-anchored calculator already works in.

export type FlourPresetId =
	| 'supermarket-00'
	| 'caputo-pizzeria'
	| 'caputo-nuvola'
	| 'dallagiovanna-napoletana'
	| 'dallagiovanna-uniqua-blu';

// The flours the form offers, weakest first. W values are the
// manufacturers'/retailer's own published figures:
//   - a generic supermarket tipo 00 is a soft everyday flour around W 180
//   - Caputo Pizzeria (blue) is stated W 260–270, "ideal for doughs under 24 h"
//   - Caputo Nuvola is a tipo 0 at W 260–280 (12.5 % protein), sold for
//     high-hydration airy crusts and long fermentation; we take the top of
//     its published range, the figure quoted with that claim
//   - Molino Dallagiovanna La Napoletana is stated W 310, built for 24–72 h
//   - Molino Dallagiovanna Uniqua Blu is stated W 380, a tipo 1 sold for
//     long-fermentation pizza and focaccia (and panettone). It sits above the
//     top tolerance anchor, so it shares La Napoletana's band: the mill
//     publishes no total-window figure for it — only a 14–16 h biga at 18 °C,
//     which is a pre-ferment leg the schedule already handles — and inventing
//     a longer tolerance from two anchors is exactly what the clamp avoids.
// Names are brand names, so they are not translated; only the generic
// supermarket entry gets a localised label.
export const FLOUR_PRESETS: ReadonlyArray<{ id: FlourPresetId; w: number }> = [
	{ id: 'supermarket-00', w: 180 },
	{ id: 'caputo-pizzeria', w: 265 },
	{ id: 'caputo-nuvola', w: 280 },
	{ id: 'dallagiovanna-napoletana', w: 310 },
	{ id: 'dallagiovanna-uniqua-blu', w: 380 }
];

// Caputo Pizzeria is the default flour for a fresh visit — the workhorse
// Neapolitan tipo 00 and the one most users actually have on the counter.
export const DEFAULT_FLOUR_W = 265;

// Which preset a W value corresponds to, or null for a hand-typed strength.
// The form's select reads this so it never needs its own state field.
export function flourPresetForW(w: number): FlourPresetId | null {
	return FLOUR_PRESETS.find((p) => p.w === w)?.id ?? null;
}

export interface FermentWindowBand {
	// Wall-clock hours of total window (readyBy − startAt) the flour suits.
	min: number;
	max: number;
}

// Fermentation-tolerance anchors, in hours of total window, per mode.
//
// The shape comes from the commonly cited W→fermentation reference table
// (W 160–180: 2–3 h room / 8–12 h cold; W 240–260: 6–9 h / 24–36 h;
// W 300–320: 15–24 h / 60–96 h), which its own authors call "a very broad
// and general reference". We calibrate the upper edge against the three
// preset flours' published fermentation ranges instead of the table's cold
// column, which runs optimistic: Caputo Pizzeria tops out around 40 h rather
// than 96 h, and La Napoletana's stated 24–72 h lands on the nose. The lower
// edge is deliberately generous — using a strong flour for a short ferment
// wastes the flour, it doesn't spoil the dough.
const W_ANCHORS = [
	{ w: 180, room: [2, 4], cold: [6, 12] },
	{ w: 265, room: [4, 10], cold: [16, 40] },
	{ w: 310, room: [6, 18], cold: [24, 72] }
] as const;

// Tolerance grows geometrically with W (the reference table roughly triples
// per +70 W), so interpolate in log-hours and clamp — never extrapolate — at
// the ends: a W 400 manitoba is stronger than La Napoletana, but claiming a
// proportionally longer window from a two-point trend would be invention.
function logLerp(a: number, b: number, f: number): number {
	return a * Math.pow(b / a, f);
}

export function flourWindowHours(w: number, mode: FermentMode): FermentWindowBand {
	const [low, mid, high] = W_ANCHORS;
	if (w <= low.w) return { min: low[mode][0], max: low[mode][1] };
	if (w >= high.w) return { min: high[mode][0], max: high[mode][1] };
	const [lo, hi] = w <= mid.w ? [low, mid] : [mid, high];
	const f = (w - lo.w) / (hi.w - lo.w);
	return {
		min: logLerp(lo[mode][0], hi[mode][0], f),
		max: logLerp(lo[mode][1], hi[mode][1], f)
	};
}

// The bands as the slider paints them: the app only ever runs one of two
// regimes, and it picks between them on the window length alone (cold above
// COLD_MODE_THRESHOLD_MIN, room below). So a band is only reachable where it
// overlaps its own regime — clip each one to its side of the threshold and
// drop it when nothing survives. A weak supermarket 00 tops out at ~12 h,
// well under the 16 h cold switch, so it correctly offers no cold zone at
// all: that flour cannot do a cold ferment in this app.
//
// The threshold is a parameter rather than an import so this module stays
// free of the schedule (which imports it back for the warnings).
export function flourZones(
	w: number,
	coldThresholdHours: number
): { room: FermentWindowBand | null; cold: FermentWindowBand | null } {
	const room = flourWindowHours(w, 'room');
	const cold = flourWindowHours(w, 'cold');
	const roomMax = Math.min(room.max, coldThresholdHours);
	const coldMin = Math.max(cold.min, coldThresholdHours);
	return {
		room: roomMax > room.min ? { min: room.min, max: roomMax } : null,
		cold: cold.max > coldMin ? { min: coldMin, max: cold.max } : null
	};
}
