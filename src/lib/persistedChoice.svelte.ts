// A one-of-N choice the app remembers per device: the view mode, the schedule
// verbosity. Both are set two different ways and the difference matters —
// `current = x` writes the value only, `set(x)` also persists it — so opening
// someone else's link (which resolves a value) never overwrites the visitor's
// own preference (which a toggle does).
//
// The two were separate classes with the same one field and the same one
// method; the rule above only held because both copies happened to agree.
export class PersistedChoice<T extends string> {
	current: T = $state()!;
	readonly #persist: (value: T) => void;

	constructor(initial: T, persist: (value: T) => void) {
		this.current = initial;
		this.#persist = persist;
	}

	/** A deliberate choice: remembered for next time. */
	set(value: T) {
		this.current = value;
		this.#persist(value);
	}
}
