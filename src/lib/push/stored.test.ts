import { describe, expect, it } from 'vitest';
import { makeStorage, makeThrowingStorage } from '../storageFixtures';
import {
	clearRemindersFingerprint,
	loadRemindersFingerprint,
	REMINDERS_STORAGE_KEY,
	saveRemindersFingerprint
} from './stored';

describe('the reminders fingerprint', () => {
	it('lives in its own slot', () => {
		expect(REMINDERS_STORAGE_KEY).toBe('kneadtime:reminders');
	});

	it('round-trips the encoded recipe query', () => {
		const storage = makeStorage();
		saveRemindersFingerprint(storage, 'v=7&n=6');
		expect(loadRemindersFingerprint(storage)).toBe('v=7&n=6');
		clearRemindersFingerprint(storage);
		expect(loadRemindersFingerprint(storage)).toBeNull();
	});

	it('reads an empty or missing slot as no reminders', () => {
		expect(loadRemindersFingerprint(makeStorage())).toBeNull();
		expect(loadRemindersFingerprint(makeStorage({ [REMINDERS_STORAGE_KEY]: '' }))).toBeNull();
		expect(loadRemindersFingerprint(null)).toBeNull();
	});

	it('survives a blocked storage', () => {
		expect(loadRemindersFingerprint(makeThrowingStorage())).toBeNull();
		expect(() => saveRemindersFingerprint(makeThrowingStorage(), 'x')).not.toThrow();
		expect(() => clearRemindersFingerprint(makeThrowingStorage())).not.toThrow();
	});
});
