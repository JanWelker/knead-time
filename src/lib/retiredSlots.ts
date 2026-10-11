import { safeRemove, storageKey } from './safeStorage';

// Slots a removed feature used to write. Nothing reads them any more, so left
// alone they would sit on every device that ever used the feature, forever:
// storage is per origin and nobody else clears it.
//
// - `trmnlUuid` held the TRMNL Private Plugin id (issue #423 removed the
//   integration). Scoped like every live slot, because it was written through
//   `storageKey()`.
// - `doughcalc:trmnlUuid` is the same id from before the rename. Its migration
//   shim went with the feature, so this is the only thing left that clears it.
//   Legacy slots were only ever written at the root, so it is not scoped.
export const RETIRED_KEYS: readonly string[] = [storageKey('trmnlUuid'), 'doughcalc:trmnlUuid'];

/** Removes every retired slot. Safe on a blocked or missing storage. */
export function clearRetiredSlots(storage: Storage | null | undefined): void {
	for (const key of RETIRED_KEYS) safeRemove(storage, key);
}
