import { describe, expect, it, vi } from 'vitest';
import { notificationFromPush, openOrFocus, parsePushPayload } from './swHandlers';

const SCOPE = 'https://kneadtime.pizza/pr-preview/pr-12/';

describe('parsePushPayload', () => {
	it('reads the three fields the service sends', () => {
		expect(parsePushPayload('{"title":"Prep","body":"19:00 · Weigh","tag":"prep"}')).toEqual({
			title: 'Prep',
			body: '19:00 · Weigh',
			tag: 'prep'
		});
	});

	// iOS revokes a subscription after a few pushes that show nothing, so every
	// push has to become a notification, whatever arrived.
	it('turns anything unreadable into a notification anyway', () => {
		const fallback = { title: 'Knead Time', body: '', tag: 'unknown' };
		expect(parsePushPayload(null)).toEqual(fallback);
		expect(parsePushPayload(undefined)).toEqual(fallback);
		expect(parsePushPayload('')).toEqual(fallback);
		expect(parsePushPayload('not json')).toEqual(fallback);
		expect(parsePushPayload('42')).toEqual(fallback);
		expect(parsePushPayload('null')).toEqual(fallback);
		expect(parsePushPayload('{"body":"no title"}')).toEqual(fallback);
		expect(parsePushPayload('{"title":""}')).toEqual(fallback);
	});

	it('fills in a missing body or tag without dropping the title', () => {
		expect(parsePushPayload('{"title":"Prep"}')).toEqual({
			title: 'Prep',
			body: '',
			tag: 'unknown'
		});
		expect(parsePushPayload('{"title":"Prep","body":5,"tag":""}')).toEqual({
			title: 'Prep',
			body: '',
			tag: 'unknown'
		});
	});
});

describe('notificationFromPush', () => {
	it('hangs the icon and the click target off the registration scope', () => {
		const spec = notificationFromPush({ title: 'Prep', body: 'b', tag: 'prep' }, SCOPE);
		expect(spec).toEqual({
			title: 'Prep',
			options: {
				body: 'b',
				tag: 'prep',
				icon: `${SCOPE}icon-192.png`,
				data: { url: `${SCOPE}#plan` }
			}
		});
	});
});

describe('openOrFocus', () => {
	it('focuses a window already inside the scope instead of opening another', async () => {
		const focus = vi.fn(async () => undefined);
		const openWindow = vi.fn(async () => undefined);
		await openOrFocus(
			`${SCOPE}#plan`,
			SCOPE,
			[
				{ url: 'https://kneadtime.pizza/', focus: vi.fn(async () => undefined) },
				{ url: `${SCOPE}?v=7#plan`, focus }
			],
			openWindow
		);
		expect(focus).toHaveBeenCalledOnce();
		expect(openWindow).not.toHaveBeenCalled();
	});

	it('opens the app when no window of it is open', async () => {
		const openWindow = vi.fn(async () => undefined);
		await openOrFocus(`${SCOPE}#plan`, SCOPE, [], openWindow);
		expect(openWindow).toHaveBeenCalledWith(`${SCOPE}#plan`);
	});
});
