export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function isThemeChoice(value: unknown): value is ThemeChoice {
	return value === 'system' || value === 'light' || value === 'dark';
}

function systemPrefersDark(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

class Theme {
	choice: ThemeChoice = $state('system');
	resolved: ResolvedTheme = $state('light');

	init() {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem(STORAGE_KEY);
		this.choice = isThemeChoice(stored) ? stored : 'system';
		this.apply();

		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (this.choice === 'system') this.apply();
		});
	}

	set(choice: ThemeChoice) {
		this.choice = choice;
		if (typeof localStorage !== 'undefined') {
			if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
			else localStorage.setItem(STORAGE_KEY, choice);
		}
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
