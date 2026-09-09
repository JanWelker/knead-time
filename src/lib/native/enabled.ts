import { storedPreference } from '../storedPreference';

// Whether the baker has asked this device to remind them. Off is the default
// and "no choice yet", so `clearOn: 'off'` keeps the slot empty rather than
// writing a word that means the same as its absence.
//
// Device-local and deliberately not in the share URL: a link is a recipe, and
// nobody sharing one is offering to schedule notifications on someone else's
// phone. Same reasoning as the theme and the schedule verbosity.
export type RemindersEnabled = 'on' | 'off';

export function isRemindersEnabled(value: unknown): value is RemindersEnabled {
	return value === 'on' || value === 'off';
}

const pref = storedPreference<RemindersEnabled>({
	key: 'kneadtime:reminders',
	isValid: isRemindersEnabled,
	clearOn: 'off'
});

export const REMINDERS_STORAGE_KEY = pref.key;
export const loadRemindersEnabled = pref.load;
export const saveRemindersEnabled = pref.save;
