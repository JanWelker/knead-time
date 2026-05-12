// Fermentation model: ferment "units" = yeast% × hours × temperatureFactor(T)
// A target unit count must be reached for the dough to fully ferment.
//
// References (commonly cited Neapolitan rules of thumb):
//   - Fresh yeast 0.2% at 22 °C: full ferment in ~8 h (≈6 h bulk + 2 h proof)
//   - Sourdough starter 20% at 22 °C: full ferment in ~8 h
// Temperature factor follows a Q10 = 2 model (rate doubles every 10 °C).

export const REF_TEMP_C = 22;
export const Q10 = 2;

// Calibration constants — units of (yeast_pct × hours) at reference temperature.
export const TARGET_UNITS_FRESH = 1.6;
export const TARGET_UNITS_SOURDOUGH = 160;

export function temperatureFactor(tempC: number): number {
	return Math.pow(Q10, (tempC - REF_TEMP_C) / 10);
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
