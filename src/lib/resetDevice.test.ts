import { describe, expect, it } from 'vitest';
import { CLEARED_KEYS, KEPT_KEYS, RESET_KEYS, resetDeviceStorage } from './resetDevice';
import { makeStorage, makeThrowingStorage } from './storageFixtures';

describe('reset this device', () => {
	// Pinned by membership: an entry dropped from the list would survive every
	// reset in silence, and the baker would see the "forgotten" value come back.
	it('clears the current recipe, the reminders and every device preference', () => {
		expect(RESET_KEYS).toEqual([
			'kneadtime:lastRecipe',
			'kneadtime:reminders',
			'kneadtime:mode',
			'kneadtime:scheduleVerbosity',
			'kneadtime:theme',
			'kneadtime:locale'
		]);
	});

	it('keeps the recipe book and nothing else', () => {
		expect(KEPT_KEYS).toEqual(['kneadtime:recipes']);
	});

	// A legacy slot left behind is migrated straight back on the next load —
	// the theme the reset "forgot" would return. The retired TRMNL slots go too.
	it('also clears the legacy and retired slots a later load would read', () => {
		expect(CLEARED_KEYS).toEqual([
			...RESET_KEYS,
			'theme',
			'doughcalc:locale',
			'kneadtime:trmnlUuid',
			'doughcalc:trmnlUuid'
		]);
	});

	it('leaves the saved recipes and whatever else shares the origin', () => {
		const seeded: Record<string, string> = {
			'kneadtime:recipes': '[{"name":"Friday","query":"v=8&n=4"}]',
			'someone-else:key': 'kept'
		};
		for (const key of CLEARED_KEYS) seeded[key] = 'x';
		const storage = makeStorage(seeded);

		resetDeviceStorage(storage);

		for (const key of CLEARED_KEYS) expect(storage.getItem(key), key).toBeNull();
		expect(storage.getItem('kneadtime:recipes')).toBe('[{"name":"Friday","query":"v=8&n=4"}]');
		expect(storage.getItem('someone-else:key')).toBe('kept');
		expect(storage.length).toBe(2);
	});

	// Chrome's "Block all cookies" makes every storage call throw (issue #195):
	// the reset still has to reach the reload.
	it('does not throw when storage is blocked or missing', () => {
		expect(() => resetDeviceStorage(makeThrowingStorage())).not.toThrow();
		expect(() => resetDeviceStorage(null)).not.toThrow();
	});
});
