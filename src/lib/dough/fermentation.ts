// Fermentation model: ferment "units" = yeast% × hours × temperatureFactor(T)
// A target unit count must be reached for the dough to fully ferment.
//
// References (commonly cited Neapolitan rules of thumb):
//   - Fresh yeast 0.2% at 22 °C: full ferment in ~8 h (≈6 h bulk + 2 h proof)
//   - Sourdough starter 20% at 22 °C: full ferment in ~8 h
// Temperature factor follows a Q10 = 2 model (rate doubles every 10 °C).

const REF_TEMP_C = 22;
const Q10 = 2;

// Calibration constants — units of (yeast_pct × hours) at reference temperature.
// Fresh: 0.2% yeast × ~8 h at 22 °C = 1.6 units (matches the bench rule of thumb).
export const TARGET_UNITS_FRESH = 1.6;
// Sourdough: 20% starter × ~8 h at 22 °C = 160 units (~100× fresh — starter is far less active per gram).
export const TARGET_UNITS_SOURDOUGH = 160;

// Pre-ferment reference fermentation loads (equivalent-hours at 22 °C). A biga
// is stiffer and traditionally sits cooler/longer, so we credit it slightly
// more equivalent hours than a poolish.
export const PREFERMENT_REF_HOURS_BIGA = 14;
export const PREFERMENT_REF_HOURS_POOLISH = 12;

// Wall-clock clamps for the pre-ferment. Below 8 h a biga/poolish won't build
// enough flavour; above 24 h it's likely to collapse. Outside this window the
// equivalent-hours target is approximated rather than exact.
export const PREFERMENT_MIN_HOURS = 8;
export const PREFERMENT_MAX_HOURS = 24;

export function temperatureFactor(tempC: number): number {
	return Math.pow(Q10, (tempC - REF_TEMP_C) / 10);
}

export function prefermentRefHours(type: 'biga' | 'poolish'): number {
	return type === 'biga' ? PREFERMENT_REF_HOURS_BIGA : PREFERMENT_REF_HOURS_POOLISH;
}

// Wall-clock duration for a pre-ferment at the given ambient temperature.
// Solves refHours = wallHours · f(T) for wallHours, then clamps to a sane band.
// Below the clamp the math wants an unrealistically short rest; above, it asks
// for a multi-day ferment that would overproof.
export function prefermentDurationHours(type: 'biga' | 'poolish', tempC: number): number {
	const refHours = prefermentRefHours(type);
	const wall = refHours / temperatureFactor(tempC);
	if (wall < PREFERMENT_MIN_HOURS) return PREFERMENT_MIN_HOURS;
	if (wall > PREFERMENT_MAX_HOURS) return PREFERMENT_MAX_HOURS;
	return wall;
}

// Equivalent-hours-at-22°C the pre-ferment actually delivers at the user's
// kitchen temperature. Inside the clamped band this equals the reference load
// exactly; at the band edges it's the clamped wall-clock × f(T).
export function prefermentEquivHours(type: 'biga' | 'poolish', tempC: number): number {
	return prefermentDurationHours(type, tempC) * temperatureFactor(tempC);
}

export interface FermentPhase {
	hours: number;
	tempC: number;
}

export function equivalentHoursAtRef(phases: FermentPhase[]): number {
	return phases.reduce((sum, p) => sum + p.hours * temperatureFactor(p.tempC), 0);
}

export function yeastPercentForPhases(
	yeastType: 'fresh' | 'sourdough',
	phases: FermentPhase[]
): number {
	const eq = equivalentHoursAtRef(phases);
	if (eq <= 0) return 0;
	const target = yeastType === 'fresh' ? TARGET_UNITS_FRESH : TARGET_UNITS_SOURDOUGH;
	return target / eq;
}

export function fermentHoursForYeast(
	yeastType: 'fresh' | 'sourdough',
	yeastPct: number,
	tempC: number
): number {
	const target = yeastType === 'fresh' ? TARGET_UNITS_FRESH : TARGET_UNITS_SOURDOUGH;
	return target / (yeastPct * temperatureFactor(tempC));
}
