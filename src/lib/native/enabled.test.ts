import { describe, expect, it } from 'vitest';
import { makeStorage } from '../storageFixtures';
import {
	isRemindersEnabled,
	loadRemindersEnabled,
	REMINDERS_STORAGE_KEY,
	saveRemindersEnabled
} from './enabled';

describe('remembering whether reminders are on', () => {
	it('lives in its own namespaced slot', () => {
		expect(REMINDERS_STORAGE_KEY).toBe('kneadtime:reminders');
	});

	it.each([
		['on', true],
		['off', true],
		['yes', false],
		['', false],
		[null, false],
		[undefined, false],
		[1, false]
	])('treats %s as a valid choice: %s', (value, valid) => {
		expect(isRemindersEnabled(value)).toBe(valid);
	});

	it('remembers an explicit yes', () => {
		const storage = makeStorage();
		saveRemindersEnabled(storage, 'on');
		expect(loadRemindersEnabled(storage)).toBe('on');
	});

	// Off is the default, so it is stored as an empty slot rather than as the
	// word "off" — one state, one representation.
	it('clears the slot rather than writing the default', () => {
		const storage = makeStorage();
		saveRemindersEnabled(storage, 'on');
		saveRemindersEnabled(storage, 'off');
		expect(storage.getItem(REMINDERS_STORAGE_KEY)).toBeNull();
		expect(loadRemindersEnabled(storage)).toBeNull();
	});

	// Storage is shared with whatever else the origin runs and can be
	// hand-edited; a junk value must not turn reminders on.
	it('ignores a value it did not write', () => {
		const storage = makeStorage();
		storage.setItem(REMINDERS_STORAGE_KEY, 'enabled');
		expect(loadRemindersEnabled(storage)).toBeNull();
	});
});
