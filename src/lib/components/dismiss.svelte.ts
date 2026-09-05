// Close on an outside click or on Escape — the contract every popover in the
// app follows: the actions menu, and the fit-score panel beside it.
//
// Both had their own copy, and both copies had already been wrong once. The
// menu's did nothing at all to begin with (a <details> toggles on its summary
// natively and dismisses no other way), and the panel's read a bound copy of
// `open` that Svelte syncs a tick after the browser flips the attribute, so
// handlers saw `false` while the panel was visibly open — reproducibly in dev,
// and about one browser-test run in four.
//
// Reading state through the callbacks at event time is what fixes that: there
// is no snapshot to go stale. Call from an $effect and return the result; the
// listeners come off with the effect.
export function dismissOnOutsideClickOrEscape({
	container,
	isOpen,
	close,
	onKeydown
}: {
	/** The popover's root. A click inside it is not an outside click. */
	container: () => HTMLElement | null | undefined;
	isOpen: () => boolean;
	close: () => void;
	/** Extra keys to handle while open, e.g. the menu's roving arrow keys. */
	onKeydown?: (event: KeyboardEvent) => void;
}): () => void {
	function onDocClick(event: MouseEvent) {
		const root = container();
		if (!isOpen() || !root) return;
		if (!root.contains(event.target as Node)) close();
	}

	function onKey(event: KeyboardEvent) {
		if (!isOpen()) return;
		if (event.key === 'Escape') {
			close();
			// Escape hands focus back to the trigger, so the keyboard does not
			// have to start over at the top of the page. An outside click
			// deliberately does not: the pointer has already moved on.
			container()?.querySelector<HTMLElement>('summary')?.focus();
			return;
		}
		onKeydown?.(event);
	}

	document.addEventListener('click', onDocClick);
	document.addEventListener('keydown', onKey);
	return () => {
		document.removeEventListener('click', onDocClick);
		document.removeEventListener('keydown', onKey);
	};
}
