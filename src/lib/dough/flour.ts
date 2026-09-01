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
	| 'caputo-doppio-zero'
	| '5stagioni-napoletana'
	| 'caputo-pizzeria'
	| 'polselli-classica'
	| 'caputo-nuvola'
	| 'caputo-saccorosso'
	| 'dallagiovanna-classica-oro'
	| 'dallagiovanna-napoletana'
	| 'caputo-cuoco'
	| 'caputo-nuvola-super'
	| 'dallagiovanna-uniqua-blu';

// The flours the form offers, weakest first. Every W is the mill's or a
// retailer's published figure for that product; where the figure is a range we
// take its midpoint. Nothing here is estimated — a flour whose W nobody
// publishes (Molino Vigevano's Vesuvio, Swiss supermarket own-brands) is left
// out rather than guessed at, which is the same rule the pizzeria table uses
// for its Source column.
//
//   supermarket-00            the one generic entry: a soft everyday tipo 00,
//                             around W 180. Stands in for a Coop/Migros
//                             own-brand, none of which publish a W at all.
//   caputo-doppio-zero        Caputo's own page: W 220–240, "ideal for short
//                             leavening". Sold by Coop.
//   5stagioni-napoletana      W 250–270, 12 % protein, 24–48 h. Agugiaro &
//                             Figna is an AVPN-listed supplier.
//   caputo-pizzeria           datasheet W 260–270 (the marketing page says
//                             260–280), 12.5 % protein.
//   polselli-classica         W 260–280, 12.5 % protein.
//   caputo-nuvola             tipo 0, W 260–280, sold for airy high-hydration
//                             crusts; we take the top of the range. Note this
//                             OVERLAPS Pizzeria — the two differ far more in
//                             absorption and P/L than in W, so the gap this
//                             table gives them is the most generous reading of
//                             the published figures, not a measured difference.
//   caputo-saccorosso         W 280–300, 13 % protein — the professional sack.
//   dallagiovanna-classica-oro W 300–320, 13 % protein.
//   dallagiovanna-napoletana  stated as a single figure, W 310, AVPN certified
//                             and sold for 24–72 h. The firmest anchor here.
//   caputo-cuoco (Chef)       W 300–320, 13 % protein, 24–72 h at 65–75 %
//                             hydration — the red bag most Neapolitan
//                             pizzaioli reach for. Listed at 315 because
//                             La Napoletana already sits on that range's
//                             midpoint and preset W values must stay unique
//                             (see below); 315 is inside its published band.
//   caputo-nuvola-super       tipo 0, W 320–340, 13.5 % protein, built for
//                             biga and poolish at 36–48 h.
//   dallagiovanna-uniqua-blu  tipo 1, stated W 380. Above the top tolerance
//                             anchor, so it shares La Napoletana's band: the
//                             mill publishes no total-window figure for it —
//                             only a 14–16 h biga at 18 °C, a pre-ferment leg
//                             the schedule already handles — and inventing a
//                             longer tolerance from two anchors is exactly
//                             what the clamp avoids.
//
// **W values must stay unique across presets.** `flourPresetForW` maps a W back
// to an id to drive the select, so two presets sharing a W would make one of
// them unselectable — the form would show the other one's name. Pinned by a
// test.
//
// Names are brand names, so they are not translated; only the generic
// supermarket entry gets a localised label.
export const FLOUR_PRESETS: ReadonlyArray<{ id: FlourPresetId; w: number }> = [
	{ id: 'supermarket-00', w: 180 },
	{ id: 'caputo-doppio-zero', w: 230 },
	{ id: '5stagioni-napoletana', w: 260 },
	{ id: 'caputo-pizzeria', w: 265 },
	{ id: 'polselli-classica', w: 270 },
	{ id: 'caputo-nuvola', w: 280 },
	{ id: 'caputo-saccorosso', w: 290 },
	{ id: 'dallagiovanna-classica-oro', w: 305 },
	{ id: 'dallagiovanna-napoletana', w: 310 },
	{ id: 'caputo-cuoco', w: 315 },
	{ id: 'caputo-nuvola-super', w: 330 },
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

// Which shelf a flour sits on in the form's grouped select.
//
// These are W thresholds, NOT the tolerance bands above. The tolerance model
// clamps at the W 310 anchor, so every flour stronger than that computes an
// identical window and they could not be told apart on a shelf derived from it.
// A baker choosing a bag wants "what is this strong enough for", which is a
// property of the flour alone, so the shelves are cut on W and labelled with
// the ferment length that strength is sold for.
//
// The outer edges are the AVPN disciplinare's, which specifies the dough as
// "1800 g of flour (w220-380)": below 220 is outside the spec, and above it a
// flour is stronger than a Neapolitan dough asks for — useful in a biga or cut
// with a weaker flour, not on its own.
export type FlourBandId = 'weak' | 'sameDay' | 'day24' | 'day48' | 'day72' | 'veryStrong';

/** Render order, weakest first. */
export const FLOUR_BANDS: readonly FlourBandId[] = [
	'weak',
	'sameDay',
	'day24',
	'day48',
	'day72',
	'veryStrong'
];

export function flourBand(w: number): FlourBandId {
	if (w >= 350) return 'veryStrong';
	if (w >= 310) return 'day72';
	if (w >= 280) return 'day48';
	if (w >= 250) return 'day24';
	if (w >= 220) return 'sameDay';
	return 'weak';
}

// Presets grouped for the select, in shelf order, skipping shelves nothing
// lands on — an empty group heading is a promise of options that aren't there.
export function flourPresetGroups(): Array<{
	band: FlourBandId;
	presets: Array<{ id: FlourPresetId; w: number }>;
}> {
	return FLOUR_BANDS.map((band) => ({
		band,
		presets: FLOUR_PRESETS.filter((p) => flourBand(p.w) === band)
	})).filter((g) => g.presets.length > 0);
}
