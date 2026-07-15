// Exception-safe localStorage access (issue #195). Chrome's "Block all
// cookies" setting makes the *getter* for `localStorage` throw a
// SecurityError — `typeof localStorage !== 'undefined'` does not protect
// (typeof only suppresses ReferenceError; resolving the global still invokes
// the throwing getter). Quota exhaustion throws on writes instead. Every
// storage acquisition and read/write in the app funnels through here so a
// blocked or full storage degrades to no-persistence instead of killing the
// mount.

export function safeLocalStorage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

export function safeGet(storage: Storage | null | undefined, key: string): string | null {
	if (!storage) return null;
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

export function safeSet(storage: Storage | null | undefined, key: string, value: string): boolean {
	if (!storage) return false;
	try {
		storage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

export function safeRemove(storage: Storage | null | undefined, key: string): boolean {
	if (!storage) return false;
	try {
		storage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}
