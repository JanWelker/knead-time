import { describe, expect, it } from 'vitest';
import { makeStorage, makeThrowingStorage } from '../storageFixtures';
import {
	clearTrmnlUuid,
	isTrmnlUuid,
	loadTrmnlUuid,
	saveTrmnlUuid,
	TRMNL_UUID_STORAGE_KEY
} from './uuid';

describe('isTrmnlUuid', () => {
	it('accepts a canonical UUIDv4', () => {
		expect(isTrmnlUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
	});

	it('accepts uppercase hex digits', () => {
		expect(isTrmnlUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
	});

	it('rejects garbage', () => {
		expect(isTrmnlUuid('not-a-uuid')).toBe(false);
		expect(isTrmnlUuid('123e4567')).toBe(false);
		expect(isTrmnlUuid('')).toBe(false);
		expect(isTrmnlUuid(null)).toBe(false);
		expect(isTrmnlUuid(undefined)).toBe(false);
		expect(isTrmnlUuid(42)).toBe(false);
	});

	it('rejects a uuid wrapped in whitespace (user must trim before saving)', () => {
		expect(isTrmnlUuid(' 123e4567-e89b-12d3-a456-426614174000 ')).toBe(false);
	});
});

describe('loadTrmnlUuid', () => {
	it('returns null when storage is null', () => {
		expect(loadTrmnlUuid(null)).toBeNull();
	});

	it('returns null when storage is undefined', () => {
		expect(loadTrmnlUuid(undefined)).toBeNull();
	});

	it('returns null when nothing is stored', () => {
		expect(loadTrmnlUuid(makeStorage())).toBeNull();
	});

	it('returns null when the stored value is not a valid uuid', () => {
		expect(loadTrmnlUuid(makeStorage({ [TRMNL_UUID_STORAGE_KEY]: 'corrupted' }))).toBeNull();
	});

	it('returns the stored uuid when valid', () => {
		const uuid = '123e4567-e89b-12d3-a456-426614174000';
		expect(loadTrmnlUuid(makeStorage({ [TRMNL_UUID_STORAGE_KEY]: uuid }))).toBe(uuid);
	});

	it('returns null when storage throws on access', () => {
		expect(loadTrmnlUuid(makeThrowingStorage())).toBeNull();
	});
});

describe('loadTrmnlUuid — legacy doughcalc:* migration', () => {
	const LEGACY = 'doughcalc:trmnlUuid';
	const uuid = '123e4567-e89b-12d3-a456-426614174000';

	it('migrates a valid legacy uuid to the new key and returns it', () => {
		const storage = makeStorage({ [LEGACY]: uuid });
		expect(loadTrmnlUuid(storage)).toBe(uuid);
		expect(storage.getItem(TRMNL_UUID_STORAGE_KEY)).toBe(uuid);
		expect(storage.getItem(LEGACY)).toBeNull();
	});

	it('discards a junk legacy value but still clears the legacy slot', () => {
		const storage = makeStorage({ [LEGACY]: 'not-a-uuid' });
		expect(loadTrmnlUuid(storage)).toBeNull();
		expect(storage.getItem(TRMNL_UUID_STORAGE_KEY)).toBeNull();
		expect(storage.getItem(LEGACY)).toBeNull();
	});

	it('prefers the new key when both are present (does not touch legacy)', () => {
		const other = '00000000-0000-0000-0000-000000000001';
		const storage = makeStorage({ [TRMNL_UUID_STORAGE_KEY]: uuid, [LEGACY]: other });
		expect(loadTrmnlUuid(storage)).toBe(uuid);
		expect(storage.getItem(LEGACY)).toBe(other);
	});
});

describe('saveTrmnlUuid', () => {
	it('writes the uuid to storage', () => {
		const storage = makeStorage();
		const uuid = '123e4567-e89b-12d3-a456-426614174000';
		saveTrmnlUuid(storage, uuid);
		expect(storage.getItem(TRMNL_UUID_STORAGE_KEY)).toBe(uuid);
	});

	it('is a no-op when storage is null', () => {
		expect(() => saveTrmnlUuid(null, '123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
	});

	it('is a no-op when storage is undefined', () => {
		expect(() => saveTrmnlUuid(undefined, '123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
	});

	it('swallows a throwing write', () => {
		expect(() =>
			saveTrmnlUuid(makeThrowingStorage(), '123e4567-e89b-12d3-a456-426614174000')
		).not.toThrow();
	});

	it('round-trips through load', () => {
		const storage = makeStorage();
		const uuid = '123e4567-e89b-12d3-a456-426614174000';
		saveTrmnlUuid(storage, uuid);
		expect(loadTrmnlUuid(storage)).toBe(uuid);
	});
});

describe('clearTrmnlUuid', () => {
	it('removes the stored uuid', () => {
		const storage = makeStorage({
			[TRMNL_UUID_STORAGE_KEY]: '123e4567-e89b-12d3-a456-426614174000'
		});
		clearTrmnlUuid(storage);
		expect(storage.getItem(TRMNL_UUID_STORAGE_KEY)).toBeNull();
	});

	it('is a no-op when storage is null', () => {
		expect(() => clearTrmnlUuid(null)).not.toThrow();
	});

	it('is a no-op when storage is undefined', () => {
		expect(() => clearTrmnlUuid(undefined)).not.toThrow();
	});

	it('swallows a throwing removal', () => {
		expect(() => clearTrmnlUuid(makeThrowingStorage())).not.toThrow();
	});
});
