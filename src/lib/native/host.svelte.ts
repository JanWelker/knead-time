import { browser } from '$app/environment';
import { safeLocalStorage } from '../safeStorage';
import {
	nativeBridge,
	postNative,
	type NativeBridgeTarget,
	type UnversionedMessage,
	type NativeState,
	type Reminder
} from './bridge';
import { loadRemindersEnabled, saveRemindersEnabled } from './enabled';
import { sameReminders } from './reminders';

// The live half of the native bridge: what the shell has told us, and what we
// have told the shell. Everything decidable without a runtime lives in
// bridge.ts / reminders.ts, which is where the coverage gate applies; this file
// is $state and is covered by the browser suite instead.
//
// In a browser `available` stays false forever and nothing is ever posted, so
// every caller can be written as if the shell were always there.
class NativeHost {
	/** True only inside the shell. Gates the menu item and every post. */
	available = $state(false);
	permission = $state<NativeState['permission']>('unknown');
	/** The baker's own choice, remembered per device. */
	enabled = $state(false);
	/** What the shell says is actually pending — so the UI can state it, not hope. */
	pending = $state(0);

	#target: NativeBridgeTarget | null = null;
	// The last list we posted. Every keystroke in the adjust sheet recomputes the
	// schedule, and every post is a full cancel-and-re-add on the other side.
	#last: Reminder[] | null = null;

	/**
	 * Called once from the root layout's onMount, before any page effect runs,
	 * so `available` is settled by the time anything reads it.
	 */
	init(w: Window): void {
		this.#target = nativeBridge(w);
		this.available = this.#target !== null;
		if (!this.available) return;

		this.enabled = loadRemindersEnabled(safeLocalStorage()) === 'on';
		// The shell talks back through this rather than through a reply to one
		// message: it has to be able to volunteer a change, because the user can
		// revoke notifications in Settings and the shell only learns that when it
		// returns to the foreground.
		w.kneadtime = { onState: (state) => this.#receive(state) };
		// One handshake that a cold launch, a foreground return and a permission
		// result all answer, so there is a single path into #receive.
		this.send({ type: 'hello' });
	}

	#receive(state: NativeState): void {
		this.permission = state.permission;
		this.pending = state.pending;
		// A permission revoked in Settings leaves a stale list behind on our side;
		// forget it so the next grant re-posts in full rather than deduping
		// against something the OS has already dropped.
		if (state.permission !== 'granted') this.#last = null;
	}

	send(message: UnversionedMessage): boolean {
		return postNative(this.#target, message);
	}

	/** Ask iOS for authorization. Only ever called from an explicit click. */
	request(): void {
		this.send({ type: 'permission' });
	}

	setEnabled(on: boolean): void {
		this.enabled = on;
		if (browser) saveRemindersEnabled(safeLocalStorage(), on ? 'on' : 'off');
		if (!on) {
			this.#last = null;
			this.pending = 0;
			this.send({ type: 'reminders-off' });
		}
	}

	/** Hand over the complete set, unless it is the one they already have. */
	sync(reminders: Reminder[]): void {
		if (this.#last && sameReminders(this.#last, reminders)) return;
		if (!this.send({ type: 'reminders', reminders })) return;
		this.#last = reminders;
	}
}

export const nativeHost = new NativeHost();
