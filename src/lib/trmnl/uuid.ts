export const TRMNL_UUID_STORAGE_KEY = 'doughcalc:trmnlUuid';

// TRMNL Private Plugin webhooks are addressed by a UUIDv4 baked into the
// configuration form. We only accept that shape so a typo in the user's
// paste doesn't silently send to nowhere.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTrmnlUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_RE.test(value);
}

export function loadTrmnlUuid(storage: Storage | null | undefined): string | null {
	if (!storage) return null;
	const raw = storage.getItem(TRMNL_UUID_STORAGE_KEY);
	return isTrmnlUuid(raw) ? raw : null;
}

export function saveTrmnlUuid(storage: Storage | null | undefined, uuid: string): void {
	if (!storage) return;
	storage.setItem(TRMNL_UUID_STORAGE_KEY, uuid);
}

export function clearTrmnlUuid(storage: Storage | null | undefined): void {
	if (!storage) return;
	storage.removeItem(TRMNL_UUID_STORAGE_KEY);
}
