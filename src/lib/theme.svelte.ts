import { safeLocalStorage } from './safeStorage';
import { loadStoredTheme, saveStoredTheme } from './storedTheme';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

function systemPrefersDark(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

class Theme {
	choice: ThemeChoice = $state('system');
	resolved: ResolvedTheme = $state('light');

	init() {
		if (typeof window === 'undefined') return;
		this.choice = loadStoredTheme(safeLocalStorage());
		this.apply();

		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (this.choice === 'system') this.apply();
		});
	}

	set(choice: ThemeChoice) {
		this.choice = choice;
		saveStoredTheme(safeLocalStorage(), choice);
		this.apply();
	}

	private apply() {
		const dark = this.choice === 'dark' || (this.choice === 'system' && systemPrefersDark());
		this.resolved = dark ? 'dark' : 'light';
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', dark);
		}
	}
}

export const theme = new Theme();
