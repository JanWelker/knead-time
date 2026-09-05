import { storedPreference } from '../storedPreference';

// TRMNL Private Plugin webhooks are addressed by a UUIDv4 baked into the
// configuration form. We only accept that shape so a typo in the user's
// paste doesn't silently send to nowhere.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTrmnlUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_RE.test(value);
}

const pref = storedPreference({
	key: 'kneadtime:trmnlUuid',
	isValid: isTrmnlUuid,
	// Pre-rename key (the project was once called 'doughcalc').
	legacyKey: 'doughcalc:trmnlUuid'
});

export const TRMNL_UUID_STORAGE_KEY = pref.key;
export const loadTrmnlUuid = pref.load;
export const saveTrmnlUuid = pref.save;
export const clearTrmnlUuid = pref.clear;
