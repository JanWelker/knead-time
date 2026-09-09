// The wire between the page and the native iOS shell (issue #309).
//
// Everything Knead Time can do, it does in a browser. The one exception is a
// reminder at 03:00: iOS suspends a backgrounded web app's JavaScript, so a
// setTimeout for a step eight hours out never runs, and it wakes a service
// worker only for a push message, which needs a server to send. The way out is
// not a backend — it is to hand the step list to a native shell and let iOS
// schedule it locally. This module is that handover, and nothing else.
//
// It is inert everywhere else. In a browser `nativeBridge()` returns null and
// no message is ever posted, which is why the whole feature can ship to
// production without appearing on the web at all.
//
// This opens no socket. `postMessage` to a WKScriptMessageHandler is an
// in-process call into the host app, so the one-origin contract is untouched —
// the only outbound *request* in the app is still the TRMNL webhook. That is
// enforced, not merely asserted, by a test in e2e/self-hosted.spec.ts.

/** The `window.webkit.messageHandlers` channel the shell registers. */
export const BRIDGE_CHANNEL = 'kneadtime';

// Stamped on every message. The shell ships separately from the web app and a
// user can be running a months-old build against a freshly deployed page, so
// the receiver needs to be able to tell which shape it is holding. Bump only
// when a message's meaning changes; adding a new `type` does not.
export const WIRE_VERSION = 1;

export interface NativeBridgeTarget {
	postMessage(body: unknown): void;
}

/**
 * The shape of `window` this module needs. Declared rather than reaching for
 * the real global so the whole module is pure: callers inject, tests pass an
 * object literal, and there is nothing to stub.
 */
export interface NativeHostWindow {
	webkit?: { messageHandlers?: Record<string, NativeBridgeTarget | undefined> };
}

/** One reminder for the OS to fire. */
export interface Reminder {
	/** `stableUid(step)` — the same identity the calendar event carries. */
	id: string;
	/** Epoch milliseconds. The wire stays dumb; the shell owns the one timezone decision. */
	at: number;
	title: string;
	body: string;
	/**
	 * The step lands in the night window the schedule already refuses to place
	 * work in. It still fires at its real time — the dough does not wait — but
	 * silently: the schedule warns about such a step rather than moving it, and
	 * a reminder should not be louder than the plan that produced it.
	 */
	silent: boolean;
}

export type NativeMessage =
	// Page is ready; the shell answers with its current state. Also how a
	// foreground return and a permission result get reported, so a cold launch
	// and a revoked permission travel the same path.
	| { v: typeof WIRE_VERSION; type: 'hello' }
	// Ask for notification authorization. Only ever sent from an explicit click.
	| { v: typeof WIRE_VERSION; type: 'permission' }
	// The complete set, never a delta: the shell cancels everything pending and
	// re-adds this list. An abandoned plan cannot survive as a stale 03:00 buzz.
	| { v: typeof WIRE_VERSION; type: 'reminders'; reminders: Reminder[] }
	| { v: typeof WIRE_VERSION; type: 'reminders-off' }
	// A WKWebView silently swallows window.open and blob downloads, and has no
	// print UI at all, so these three exist to keep features the web already has.
	| { v: typeof WIRE_VERSION; type: 'print'; url: string }
	| { v: typeof WIRE_VERSION; type: 'ics'; filename: string; text: string }
	| { v: typeof WIRE_VERSION; type: 'copy'; text: string };

/**
 * A message without its version stamp — what callers build, before `postNative`
 * adds the `v`.
 *
 * Distributive on purpose: a plain `Omit<NativeMessage, 'v'>` collapses the
 * union into one object type whose only known key is `type`, which silently
 * makes every payload field an excess property. That compiled for exactly as
 * long as nothing carried a payload.
 */
export type UnversionedMessage<T = NativeMessage> = T extends unknown ? Omit<T, 'v'> : never;

/** What the shell reports back through `window.kneadtime.onState`. */
export interface NativeState {
	permission: 'unknown' | 'granted' | 'denied';
	/** How many reminders are actually pending, so the UI can say so rather than hope. */
	pending: number;
}

/**
 * The host's message channel, or null in every browser.
 *
 * The `typeof` check is not defensive noise: `window.webkit` exists in every
 * WebKit browser, so the presence of the namespace proves nothing — only a
 * callable handler under our own channel name does.
 */
export function nativeBridge(w: NativeHostWindow | null | undefined): NativeBridgeTarget | null {
	const handler = w?.webkit?.messageHandlers?.[BRIDGE_CHANNEL];
	return handler && typeof handler.postMessage === 'function' ? handler : null;
}

/** Post one message, stamping the wire version. No-op without a host. */
export function postNative(
	target: NativeBridgeTarget | null,
	message: UnversionedMessage
): boolean {
	if (!target) return false;
	target.postMessage({ ...message, v: WIRE_VERSION });
	return true;
}
