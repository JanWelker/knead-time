import { safeGet, safeRemove, safeSet } from './safeStorage';

// One shape for every device-local preference: the view mode, the schedule
// verbosity, the theme, the language, the TRMNL device id. Each is a single
// string under a `kneadtime:` key, validated on the way out because storage is
// shared with whatever else the origin runs and can be hand-edited.
//
// Three of them also carry a legacy slot — 'theme' from before keys were
// prefixed (the app deploys to a shared *.github.io origin, where a bare key
// is visible to every other project page) and two 'doughcalc:' keys from
// before the rename. That migration was written out three times, identically,
// which is three chances for one of them to forget to clear the old slot.
//
// Reads never throw: everything goes through safeStorage, so a blocked or full
// storage degrades to "no preference" instead of killing the mount.

export interface StoredPreference<T extends string> {
	/** The key written today. Exported for tests and for the app.html boot script. */
	readonly key: string;
	/** The stored value, or null when nothing valid is stored. */
	load(storage: Storage | null | undefined): T | null;
	save(storage: Storage | null | undefined, value: T): void;
	clear(storage: Storage | null | undefined): void;
}

export function storedPreference<T extends string>({
	key,
	isValid,
	legacyKey,
	clearOn
}: {
	key: string;
	isValid: (value: unknown) => value is T;
	/** Slot written by an older version. Moved to `key` on first read, then dropped. */
	legacyKey?: string;
	/** Value that means "no choice made" — cleared rather than written. */
	clearOn?: T;
}): StoredPreference<T> {
	return {
		key,

		load(storage) {
			let raw = safeGet(storage, key);
			if (raw === null && legacyKey !== undefined) {
				const legacy = safeGet(storage, legacyKey);
				if (legacy !== null) {
					// Clear the old slot either way: a value we cannot read is not
					// worth carrying forward, and leaving it behind means migrating
					// it again on every load.
					safeRemove(storage, legacyKey);
					if (isValid(legacy)) {
						safeSet(storage, key, legacy);
						raw = legacy;
					}
				}
			}
			return isValid(raw) ? raw : null;
		},

		save(storage, value) {
			if (value === clearOn) safeRemove(storage, key);
			else safeSet(storage, key, value);
		},

		clear(storage) {
			safeRemove(storage, key);
		}
	};
}
