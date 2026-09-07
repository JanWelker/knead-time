<script lang="ts">
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { LOCALES, type Locale } from '$lib/i18n/messages';
	import { theme, type ThemeChoice } from '$lib/theme.svelte';
	import { dismissOnOutsideClickOrEscape } from './dismiss.svelte';

	// The masthead's one dropdown. Everything that is not the view's primary
	// control lives in here: the view's own items on top, then the two device
	// preferences. Language and theme used to be two pill strips standing in the
	// row itself — eleven boxes across five groups, which read as debris beside
	// a single red plaque and left nothing looking primary.
	//
	// The view passes its items as a snippet and gets `close` handed back, so it
	// can shut the menu before opening a dialog: a dialog is invalid ARIA-menu
	// content, and the menu must close before handing over.
	let { items: viewItems }: { items?: Snippet<[() => void]> } = $props();

	const t = $derived(i18n.t);

	// The endonym, not a translation: a language is called the same thing
	// whatever language you are reading the menu in, which is the whole point of
	// listing them. Same reasoning as the old strip's hardcoded 'EN'/'DE'.
	const LANGUAGE_NAME: Record<Locale, string> = {
		en: 'English',
		de: 'Deutsch',
		it: 'Italiano',
		fr: 'Français',
		nl: 'Nederlands'
	};

	const THEMES: ThemeChoice[] = ['system', 'light', 'dark'];
	const themeName = $derived((c: ThemeChoice) =>
		c === 'system' ? t.app.theme_auto : c === 'light' ? t.app.theme_light : t.app.theme_dark
	);

	let ref: HTMLDetailsElement | null = $state(null);
	let open = $state(false);
	const close = () => (open = false);

	// The role="menu" contract: enabled items in DOM order. Radios count — the
	// language and theme rows are menuitemradio, which is what a menu uses for a
	// set of mutually exclusive choices, and focus has to rove across them too.
	function menuItems(): HTMLElement[] {
		return Array.from(
			ref?.querySelectorAll<HTMLElement>(
				'[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)'
			) ?? []
		);
	}

	// ArrowDown/ArrowUp cycle, Home/End jump. The menu container itself must not
	// be focusable — focus roves across the items — so it carries no handler of
	// its own and this runs off the document listener instead.
	function roveFocus(event: KeyboardEvent) {
		const list = menuItems();
		if (list.length === 0) return;
		const index = list.indexOf(document.activeElement as HTMLElement);
		let next: number;
		if (event.key === 'ArrowDown') next = (index + 1) % list.length;
		else if (event.key === 'ArrowUp') next = index <= 0 ? list.length - 1 : index - 1;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = list.length - 1;
		else return;
		event.preventDefault();
		list[next].focus();
	}

	$effect(() => {
		if (!browser || !open) return;
		// On open, focus moves to the first item — the ARIA menu contract.
		menuItems()[0]?.focus();
		return dismissOnOutsideClickOrEscape({
			container: () => ref,
			isOpen: () => open,
			close,
			onKeydown: roveFocus
		});
	});
</script>

<!-- `relative` is load-bearing: the panel below is absolutely positioned and
     would otherwise hang off the nearest positioned ancestor, which in the
     masthead is the viewport. -->
<details bind:this={ref} bind:open class="relative">
	<summary
		class="btn-edit cursor-pointer list-none select-none"
		aria-haspopup="menu"
		aria-label={t.nav.menu}
	>
		<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<rect y="3" width="16" height="2" rx="1" />
			<rect y="7" width="16" height="2" rx="1" />
			<rect y="11" width="16" height="2" rx="1" />
		</svg>
		<span>{t.nav.menu}</span>
	</summary>
	<div
		role="menu"
		class="border-rule bg-sheet block-shadow absolute right-0 z-30 mt-2 min-w-[15rem] overflow-hidden rounded-[2px] border-2 py-1"
	>
		{@render viewItems?.(close)}

		<!-- Each group names itself for the screen reader; the printed heading is
		     the same words, so it is hidden from the tree rather than read twice. -->
		<div role="group" aria-label={t.app.langLabel} class="menu-group">
			<p class="menu-heading" aria-hidden="true">{t.app.langLabel}</p>
			{#each LOCALES as loc (loc)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={i18n.locale === loc}
					class="menu-item menu-item-choice"
					onclick={() => {
						i18n.set(loc);
						close();
					}}
				>
					<span class="menu-mark" aria-hidden="true"></span>
					{LANGUAGE_NAME[loc]}
				</button>
			{/each}
		</div>

		<div role="group" aria-label={t.app.themeLabel} class="menu-group">
			<p class="menu-heading" aria-hidden="true">{t.app.themeLabel}</p>
			{#each THEMES as choice (choice)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={theme.choice === choice}
					class="menu-item menu-item-choice"
					onclick={() => {
						theme.set(choice);
						close();
					}}
				>
					<span class="menu-mark" aria-hidden="true"></span>
					{themeName(choice)}
				</button>
			{/each}
		</div>
	</div>
</details>
