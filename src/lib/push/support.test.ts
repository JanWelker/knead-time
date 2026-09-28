import { describe, expect, it } from 'vitest';
import { isAppleTouchDevice, pushSupport } from './support';

const IPHONE_TAB = {
	userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
	platform: 'iPhone',
	maxTouchPoints: 5,
	standalone: false,
	hasPush: false
};

const IPAD_TAB = {
	userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
	platform: 'MacIntel',
	maxTouchPoints: 5,
	standalone: false,
	hasPush: false
};

const MAC_SAFARI = { ...IPAD_TAB, maxTouchPoints: 0, hasPush: true };

const ANDROID = {
	userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/124',
	platform: 'Linux armv8l',
	maxTouchPoints: 5,
	standalone: false,
	hasPush: true
};

describe('isAppleTouchDevice', () => {
	it('recognises an iPhone by its user agent and an iPad by its touch points', () => {
		expect(isAppleTouchDevice(IPHONE_TAB)).toBe(true);
		expect(isAppleTouchDevice(IPAD_TAB)).toBe(true);
		expect(isAppleTouchDevice(MAC_SAFARI)).toBe(false);
		expect(isAppleTouchDevice(ANDROID)).toBe(false);
	});
});

describe('pushSupport', () => {
	// In a Safari tab PushManager is missing as well, so this check has to come
	// first or the phone is told it is unsupported rather than to install.
	it('asks an iPhone or iPad in a tab to install first, before anything else', () => {
		expect(pushSupport(IPHONE_TAB)).toBe('needs-install');
		expect(pushSupport(IPAD_TAB)).toBe('needs-install');
	});

	it('is fine once the app runs from the Home Screen', () => {
		expect(pushSupport({ ...IPHONE_TAB, standalone: true, hasPush: true })).toBe('ok');
	});

	it('names a browser with no push at all', () => {
		expect(pushSupport({ ...ANDROID, hasPush: false })).toBe('unsupported');
		expect(pushSupport({ ...MAC_SAFARI, hasPush: false })).toBe('unsupported');
	});

	it('needs no install anywhere else', () => {
		expect(pushSupport(ANDROID)).toBe('ok');
		expect(pushSupport(MAC_SAFARI)).toBe('ok');
	});
});
