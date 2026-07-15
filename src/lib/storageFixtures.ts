// In-memory Storage stand-in for unit tests that don't run in a browser
// environment. Excluded from coverage by vitest.config.

// A Storage whose every member throws — models Chrome's "Block all cookies"
// mode (SecurityError on any access) and a full quota (throw on write).
export function makeThrowingStorage(): Storage {
	const throwing = (): never => {
		throw new Error('SecurityError: storage is blocked');
	};
	return {
		get length(): number {
			return throwing();
		},
		clear: throwing,
		getItem: throwing,
		key: throwing,
		removeItem: throwing,
		setItem: throwing
	};
}

export function makeStorage(initial: Record<string, string> = {}): Storage {
	const map = new Map(Object.entries(initial));
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		key: (i: number) => [...map.keys()][i] ?? null,
		removeItem: (key: string) => {
			map.delete(key);
		},
		setItem: (key: string, value: string) => {
			map.set(key, value);
		}
	};
}
