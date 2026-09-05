<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';

	// Same shape as TrmnlPush: a native <dialog> opened imperatively, so the
	// page holds it with bind:this and calls open() from the actions menu.
	let { onsave }: { onsave: (name: string) => void } = $props();

	const t = $derived(i18n.t);

	let dialogEl: HTMLDialogElement | null = $state(null);
	let inputEl: HTMLInputElement | null = $state(null);
	let name: string = $state('');

	export function open(): void {
		if (!dialogEl) return;
		name = '';
		dialogEl.showModal();
		// showModal() focuses the first focusable descendant on its own, but say
		// it outright: the field is the only reason this dialog exists, and the
		// order of the buttons below it is free to change.
		inputEl?.focus();
	}

	function close(): void {
		dialogEl?.close();
	}

	// preventDefault for the same reason TrmnlPush does it: the implicit
	// <form method="dialog"> submission closes the dialog without ever calling
	// the handler, so the recipe would silently not be saved.
	function onSubmit(event: SubmitEvent): void {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		onsave(trimmed);
		close();
	}
</script>

<dialog bind:this={dialogEl} aria-labelledby="save-recipe-heading" class="dialog-panel max-w-sm">
	<form class="space-y-4 p-5" onsubmit={onSubmit}>
		<h2 id="save-recipe-heading" class="font-display text-accent text-lg">
			{t.actions.save_recipe}
		</h2>

		<label class="block space-y-1">
			<span class="text-xs font-medium text-stone-600 dark:text-stone-300">
				{t.actions.save_recipe_prompt}
			</span>
			<input
				bind:this={inputEl}
				type="text"
				autocomplete="off"
				bind:value={name}
				class="input w-full text-sm text-stone-900 dark:bg-stone-900"
			/>
		</label>

		<div class="flex flex-wrap items-center gap-2">
			<button type="submit" class="btn-tomato" disabled={name.trim().length === 0}>
				{t.actions.save_confirm}
			</button>
			<button type="button" class="btn-quiet ml-auto" onclick={close}>
				{t.actions.cancel}
			</button>
		</div>
	</form>
</dialog>
