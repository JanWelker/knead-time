import { saveStoredMode, type UiMode } from './storedMode';

// Beginner/expert view mode. The main page resolves the initial value on
// mount (URL md param → stored preference → beginner); explicit toggles go
// through set() so only deliberate choices persist — opening someone else's
// beginner link never overwrites the local preference.
class Mode {
	current: UiMode = $state('expert');

	set(mode: UiMode) {
		this.current = mode;
		if (typeof localStorage !== 'undefined') saveStoredMode(localStorage, mode);
	}
}

export const uiMode = new Mode();
