<script lang="ts">
	import { browser } from '$app/environment';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { dismissOnOutsideClickOrEscape } from './dismiss.svelte';

	// The schedule's action menu. Lived inline in +page.svelte, where 90 lines
	// of ARIA-menu markup and roving-focus keyboard handling sat between the
	// page's layout and the rest of it.
	//
	// Four of the five items need a feasible schedule: there is nothing to
	// export, print or push when the window is too short to be a plan at all.
	// Sharing a link to a broken recipe is still meaningful — that is how you
	// ask someone what went wrong.
	let {
		feasible,
		shareLabel,
		onIcs,
		onPrint,
		onShare,
		onSaveRecipe,
		onTrmnl
	}: {
		feasible: boolean;
		shareLabel: string;
		onIcs: () => void;
		onPrint: () => void;
		onShare: () => void;
		onSaveRecipe: () => void;
		onTrmnl: () => void;
	} = $props();

	const t = $derived(i18n.t);

	let ref: HTMLDetailsElement | null = $state(null);
	let open = $state(false);

	// The role="menu" contract: enabled menuitems in DOM order.
	function items(): HTMLElement[] {
		return Array.from(ref?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
	}

	// ArrowDown/ArrowUp cycle, Home/End jump. The menu container itself must not
	// be focusable — focus roves across the items — so it carries no handler of
	// its own and this runs off the document listener instead.
	function roveFocus(event: KeyboardEvent) {
		const list = items();
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
		items()[0]?.focus();
		return dismissOnOutsideClickOrEscape({
			container: () => ref,
			isOpen: () => open,
			close: () => (open = false),
			onKeydown: roveFocus
		});
	});

	// A dialog is invalid ARIA-menu content, so the two modals live outside this
	// component — the menu just closes before handing over.
	function pick(action: () => void) {
		open = false;
		action();
	}
</script>

<details bind:this={ref} bind:open>
	<summary
		class="btn-tomato flex cursor-pointer list-none items-center gap-2 select-none"
		aria-haspopup="menu"
		aria-label={t.actions.menu}
	>
		<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<rect y="3" width="16" height="2" rx="1" />
			<rect y="7" width="16" height="2" rx="1" />
			<rect y="11" width="16" height="2" rx="1" />
		</svg>
		<span>{t.actions.menu}</span>
	</summary>
	<div
		role="menu"
		class="border-dough-200 absolute right-0 z-20 mt-2 min-w-[14rem] overflow-hidden rounded-2xl border bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800"
	>
		<button type="button" role="menuitem" class="menu-item" onclick={onIcs} disabled={!feasible}>
			{t.actions.download_ics}
		</button>
		<button type="button" role="menuitem" class="menu-item" onclick={onPrint} disabled={!feasible}>
			{t.actions.print}
		</button>
		<button type="button" role="menuitem" class="menu-item" onclick={onShare}>
			{shareLabel}
		</button>
		<button
			type="button"
			role="menuitem"
			aria-haspopup="dialog"
			class="menu-item"
			onclick={() => pick(onSaveRecipe)}
		>
			{t.actions.save_recipe}
		</button>
		<button
			type="button"
			role="menuitem"
			aria-haspopup="dialog"
			class="menu-item"
			disabled={!feasible}
			onclick={() => pick(onTrmnl)}
		>
			{t.trmnl_push.menu_item}
		</button>
	</div>
</details>
