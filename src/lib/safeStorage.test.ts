import { afterEach, describe, expect, it } from 'vitest';
import { safeGet, safeLocalStorage, safeRemove, safeSet } from './safeStorage';
import { makeStorage, makeThrowingStorage } from './storageFixtures';

describe('safeLocalStorage', () => {
	const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

	afterEach(() => {
		if (original) Object.defineProperty(globalThis, 'localStorage', original);
		else delete (globalThis as Record<string, unknown>).localStorage;
	});

	it('returns null when localStorage is undefined (SSR)', () => {
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			value: undefined
		});
		expect(safeLocalStorage()).toBeNull();
	});

	it('returns the storage when accessible', () => {
		const storage = makeStorage();
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			value: storage
		});
		expect(safeLocalStorage()).toBe(storage);
	});

	it("returns null when the getter itself throws (Chrome 'Block all cookies')", () => {
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			get(): Storage {
				throw new Error('SecurityError: access is denied');
			}
		});
		expect(safeLocalStorage()).toBeNull();
	});
});

describe('safeGet', () => {
	it('reads a stored value', () => {
		expect(safeGet(makeStorage({ k: 'v' }), 'k')).toBe('v');
	});

	it('returns null for a missing key', () => {
		expect(safeGet(makeStorage(), 'k')).toBeNull();
	});

	it('returns null when storage is null or undefined', () => {
		expect(safeGet(null, 'k')).toBeNull();
		expect(safeGet(undefined, 'k')).toBeNull();
	});

	it('returns null when the read throws', () => {
		expect(safeGet(makeThrowingStorage(), 'k')).toBeNull();
	});
});

describe('safeSet', () => {
	it('writes and reports success', () => {
		const storage = makeStorage();
		expect(safeSet(storage, 'k', 'v')).toBe(true);
		expect(storage.getItem('k')).toBe('v');
	});

	it('reports failure when storage is null or undefined', () => {
		expect(safeSet(null, 'k', 'v')).toBe(false);
		expect(safeSet(undefined, 'k', 'v')).toBe(false);
	});

	it('swallows a throwing write (quota, blocked) and reports failure', () => {
		expect(safeSet(makeThrowingStorage(), 'k', 'v')).toBe(false);
	});
});

describe('safeRemove', () => {
	it('removes and reports success', () => {
		const storage = makeStorage({ k: 'v' });
		expect(safeRemove(storage, 'k')).toBe(true);
		expect(storage.getItem('k')).toBeNull();
	});

	it('reports failure when storage is null or undefined', () => {
		expect(safeRemove(null, 'k')).toBe(false);
		expect(safeRemove(undefined, 'k')).toBe(false);
	});

	it('swallows a throwing removal and reports failure', () => {
		expect(safeRemove(makeThrowingStorage(), 'k')).toBe(false);
	});
});
