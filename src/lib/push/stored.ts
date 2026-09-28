// Which plan the device's reminders were last set for: the encoded recipe query,
// so the plan can say honestly when the reminders belong to an earlier version
// of it. Nothing about the subscription itself is stored — the browser holds that.

import { storageKey } from '../safeStorage';
import { storedPreference } from '../storedPreference';

function isFingerprint(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

const pref = storedPreference({ key: storageKey('reminders'), isValid: isFingerprint });

export const REMINDERS_STORAGE_KEY = pref.key;
export const loadRemindersFingerprint = pref.load;
export const saveRemindersFingerprint = pref.save;
export const clearRemindersFingerprint = pref.clear;
