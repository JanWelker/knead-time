// One minute clock for the whole page. The schedule table and the window card
// each used to run their own `setInterval`, seeded with their own `new Date()`.
// Two clocks can disagree about which minute it is, and the one render where
// they do has the table calling a step current while the card beside it says
// the start has been missed.
//
// The clock starts on the first subscriber and stops with the last, so a plan
// left open for two days is still ticked by exactly one timer, and a page with
// nothing on it that reads the time runs none. A late subscriber reads the
// running minute rather than a fresh `Date`: sharing the reading is the point.
class MinuteClock {
	now = $state(new Date());
	#timer: ReturnType<typeof setInterval> | null = null;
	#readers = 0;

	/** Start reading. Returns the unsubscribe, shaped for `onMount`. */
	subscribe(): () => void {
		if (this.#readers++ === 0) {
			this.now = new Date();
			this.#timer = setInterval(() => (this.now = new Date()), 60_000);
		}
		return () => {
			if (--this.#readers === 0 && this.#timer !== null) {
				clearInterval(this.#timer);
				this.#timer = null;
			}
		};
	}
}

export const minuteClock = new MinuteClock();
