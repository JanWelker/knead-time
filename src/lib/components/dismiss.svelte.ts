import type { Attachment } from 'svelte/attachments';

// Close on an outside click or on Escape — the contract every popover in the
// app follows: the actions menu, the fit-score panel and the mode seal.
//
// Each had its own copy, and the copies had already been wrong once. The
// menu's did nothing at all to begin with (a <details> toggles on its summary
// natively and dismisses no other way), and the panel's read a bound copy of
// `open` that Svelte syncs a tick after the browser flips the attribute, so
// handlers saw `false` while the panel was visibly open — reproducibly in dev,
// and about one browser-test run in four.
//
// The element's own `open` is therefore the only state read, at event time,
// so there is no snapshot to go stale. Used as `{@attach dismissable()}` on the
// <details>: the attachment is handed the element, so no component keeps a ref
// for it, and it is torn down with the element — a component that renders no
// popover (ModeBadge without `explain`) attaches nothing.
//
// The document listeners live as long as the element, not only while it is
// open. Following the `toggle` event instead looks tidier but loses a race:
// `toggle` fires a task after the panel is already showing, so an Escape
// pressed in between found no listener — the browser suite hit it.
export function dismissable({
	onOpen,
	onKeydown
}: {
	/** Runs each time the popover opens, e.g. the menu focusing its first item. */
	onOpen?: (details: HTMLDetailsElement) => void;
	/** Extra keys to handle while open, e.g. the menu's roving arrow keys. */
	onKeydown?: (event: KeyboardEvent, details: HTMLDetailsElement) => void;
} = {}): Attachment<HTMLDetailsElement> {
	return (details) => {
		function onDocClick(event: MouseEvent) {
			if (details.open && !details.contains(event.target as Node)) details.open = false;
		}

		function onKey(event: KeyboardEvent) {
			if (!details.open) return;
			if (event.key === 'Escape') {
				details.open = false;
				// Escape hands focus back to the trigger, so the keyboard does not
				// have to start over at the top of the page. An outside click
				// deliberately does not: the pointer has already moved on.
				details.querySelector<HTMLElement>('summary')?.focus();
				return;
			}
			onKeydown?.(event, details);
		}

		function onToggle() {
			if (details.open) onOpen?.(details);
		}

		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		details.addEventListener('toggle', onToggle);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
			details.removeEventListener('toggle', onToggle);
		};
	};
}
