import { createSubscriber } from 'svelte/reactivity';

// One minute clock for the whole page. The schedule table and the window card
// each used to run their own `setInterval`, seeded with their own `new Date()`.
// Two clocks can disagree about which minute it is, and the one render where
// they do has the table calling a step current while the card beside it says
// the start has been missed.
//
// The clock starts on the first reader and stops with the last, so a plan
// left open for two days is still ticked by exactly one timer, and a page with
// nothing on it that reads the time runs none. A late reader gets the running
// minute rather than a fresh `Date`: sharing the reading is the point.
//
// Reading `now` from a template, a `$derived` or an effect is the whole of
// subscribing: `createSubscriber` counts the reading effects and tears the
// timer down a microtask after the last one goes, so no component has to
// remember an `onMount` subscribe and its unsubscribe.
class MinuteClock {
	#now = new Date();
	#subscribe = createSubscriber((update) => {
		this.#now = new Date();
		const timer = setInterval(() => {
			this.#now = new Date();
			update();
		}, 60_000);
		return () => clearInterval(timer);
	});

	get now(): Date {
		this.#subscribe();
		return this.#now;
	}
}

export const minuteClock = new MinuteClock();
