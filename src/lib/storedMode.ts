export type UiMode = 'beginner' | 'expert';

export const MODE_STORAGE_KEY = 'kneadtime:mode';

export function isUiMode(value: unknown): value is UiMode {
	return value === 'beginner' || value === 'expert';
}

export function loadStoredMode(storage: Storage | null | undefined): UiMode | null {
	if (!storage) return null;
	const raw = storage.getItem(MODE_STORAGE_KEY);
	return isUiMode(raw) ? raw : null;
}

export function saveStoredMode(storage: Storage | null | undefined, mode: UiMode): void {
	if (!storage) return;
	storage.setItem(MODE_STORAGE_KEY, mode);
}
