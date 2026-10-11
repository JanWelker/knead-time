import { describe, expect, it } from 'vitest';
import { clearRetiredSlots, RETIRED_KEYS } from './retiredSlots';
import { makeStorage, makeThrowingStorage } from './storageFixtures';

describe('retired storage slots', () => {
	// The TRMNL integration was removed (issue #423), and with it the only
	// code that read or cleared its device id. Without this cleanup the uuid a
	// user once pasted would stay in their browser for good, unread — a
	// third-party plugin address kept on the device for no feature at all.
	it('a removed feature leaves no stale TRMNL device id behind', () => {
		const storage = makeStorage({
			'kneadtime:trmnlUuid': '01234567-89ab-cdef-0123-456789abcdef',
			'doughcalc:trmnlUuid': '01234567-89ab-cdef-0123-456789abcdef',
			'kneadtime:mode': 'expert'
		});
		clearRetiredSlots(storage);
		expect(storage.getItem('kneadtime:trmnlUuid')).toBeNull();
		expect(storage.getItem('doughcalc:trmnlUuid')).toBeNull();
		// A live preference sharing the origin is untouched.
		expect(storage.getItem('kneadtime:mode')).toBe('expert');
		expect(storage.length).toBe(1);
	});

	// Pinned by membership: dropping an entry would strand that slot again.
	it('are exactly the two TRMNL slots, current and pre-rename', () => {
		expect(RETIRED_KEYS).toEqual(['kneadtime:trmnlUuid', 'doughcalc:trmnlUuid']);
	});

	// Chrome's "Block all cookies" makes every storage call throw (issue #195);
	// a cleanup run on mount must not take the mount down with it.
	it('does not throw when storage is blocked or missing', () => {
		expect(() => clearRetiredSlots(makeThrowingStorage())).not.toThrow();
		expect(() => clearRetiredSlots(null)).not.toThrow();
	});
});
