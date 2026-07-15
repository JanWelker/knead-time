import { safeGet, safeSet } from './safeStorage';

export type UiMode = 'beginner' | 'expert';

export const MODE_STORAGE_KEY = 'kneadtime:mode';

export function isUiMode(value: unknown): value is UiMode {
	return value === 'beginner' || value === 'expert';
}

export function loadStoredMode(storage: Storage | null | undefined): UiMode | null {
	const raw = safeGet(storage, MODE_STORAGE_KEY);
	return isUiMode(raw) ? raw : null;
}

export function saveStoredMode(storage: Storage | null | undefined, mode: UiMode): void {
	safeSet(storage, MODE_STORAGE_KEY, mode);
}
