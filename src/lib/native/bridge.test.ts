import { describe, expect, it, vi } from 'vitest';
import {
	BRIDGE_CHANNEL,
	nativeBridge,
	postNative,
	WIRE_VERSION,
	type NativeHostWindow,
	type UnversionedMessage
} from './bridge';

// No default parameter here: one of the cases below *is* an explicit
// `undefined`, which a default would quietly replace with a working mock.
function hostWindow(postMessage: unknown): NativeHostWindow {
	return { webkit: { messageHandlers: { [BRIDGE_CHANNEL]: { postMessage } } } } as NativeHostWindow;
}

describe('finding the native host', () => {
	// The whole feature hides behind this one predicate: a false positive puts a
	// dead menu item in front of every web visitor, and a false negative hides
	// the feature on the one platform it exists for.
	it.each([
		['nothing at all', null],
		['undefined', undefined],
		['a bare window', {}],
		['webkit with no handlers', { webkit: {} }],
		['handlers with no channels', { webkit: { messageHandlers: {} } }],
		['some other app’s channel', { webkit: { messageHandlers: { somethingElse: {} } } }],
		['our channel left undefined', { webkit: { messageHandlers: { [BRIDGE_CHANNEL]: undefined } } }]
	])('reports no host for %s', (_label, w) => {
		expect(nativeBridge(w as NativeHostWindow)).toBeNull();
	});

	// window.webkit exists in every WebKit browser, so the namespace proves
	// nothing — Safari would otherwise look like the shell. Only a *callable*
	// postMessage under our own channel name is a host.
	it('is not fooled by a channel that cannot receive a message', () => {
		expect(nativeBridge(hostWindow(undefined))).toBeNull();
		expect(nativeBridge(hostWindow('not a function'))).toBeNull();
		expect(nativeBridge(hostWindow({}))).toBeNull();
	});

	it('finds a channel that can', () => {
		const post = vi.fn();
		expect(nativeBridge(hostWindow(post))).toEqual({ postMessage: post });
	});

	it('looks under the name the shell actually registers', () => {
		expect(BRIDGE_CHANNEL).toBe('kneadtime');
	});
});

describe('posting to the native host', () => {
	// The shell ships through App Review and the web app deploys in three
	// minutes, so a months-old shell will meet a fresh page. Every message says
	// which shape it is.
	it('stamps the wire version on every message', () => {
		expect(WIRE_VERSION).toBe(1);
		const post = vi.fn();
		postNative({ postMessage: post }, { type: 'hello' });
		expect(post).toHaveBeenCalledWith({ type: 'hello', v: 1 });
	});

	// Listed rather than sampled: a new message type with no row here is a type
	// error, which is the only thing that would catch one being added and never
	// sent.
	const everyMessage: UnversionedMessage[] = [
		{ type: 'hello' },
		{ type: 'permission' },
		{
			type: 'reminders',
			reminders: [{ id: 'mix-1', at: 1, title: 'T', body: 'B', silent: false }]
		},
		{ type: 'reminders-off' },
		{ type: 'print', url: '/print/en?v=7' },
		{ type: 'ics', filename: 'kneadtime.ics', text: 'BEGIN:VCALENDAR' },
		{ type: 'copy', text: 'https://kneadtime.pizza/?v=7' }
	];

	it.each(everyMessage.map((m) => [m.type, m] as const))(
		'sends a %s message through verbatim',
		(_type, message) => {
			const post = vi.fn();
			expect(postNative({ postMessage: post }, message)).toBe(true);
			expect(post).toHaveBeenCalledWith({ ...message, v: WIRE_VERSION });
		}
	);

	// Every caller runs in a browser too, so "no host" has to be a quiet no-op
	// rather than something each call site remembers to guard.
	it('is a no-op without a host, and says so', () => {
		expect(postNative(null, { type: 'hello' })).toBe(false);
	});
});
