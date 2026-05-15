<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	import { i18n } from '$lib/i18n/i18n.svelte';
	import { clearTrmnlUuid, isTrmnlUuid, loadTrmnlUuid, saveTrmnlUuid } from '$lib/trmnl/uuid';
	import { buildMergeVariables, sendToTrmnl } from '$lib/trmnl/webhook';
	import type { ComputedSchedule, DoughInputs } from '$lib/dough/types';
	import type { Locale } from '$lib/i18n/messages';

	let {
		inputs,
		schedule,
		locale,
		triggerClass = ''
	}: {
		inputs: DoughInputs;
		schedule: ComputedSchedule;
		locale: Locale;
		triggerClass?: string;
	} = $props();

	const t = $derived(i18n.t);

	let dialogEl: HTMLDialogElement | null = $state(null);
	let uuidInput: string = $state('');
	let savedUuid: string | null = $state(null);
	let status: 'idle' | 'sending' | 'sent' | 'error' = $state('idle');
	let errorMessage: string = $state('');

	onMount(() => {
		savedUuid = loadTrmnlUuid(localStorage);
		uuidInput = savedUuid ?? '';
	});

	function open(): void {
		if (!dialogEl) return;
		uuidInput = savedUuid ?? '';
		status = 'idle';
		errorMessage = '';
		dialogEl.showModal();
	}

	function close(): void {
		dialogEl?.close();
	}

	async function send(): Promise<void> {
		const trimmed = uuidInput.trim();
		if (!isTrmnlUuid(trimmed)) {
			status = 'error';
			errorMessage = t.trmnl_push.error_invalid_uuid;
			return;
		}
		if (browser) saveTrmnlUuid(localStorage, trimmed);
		savedUuid = trimmed;
		status = 'sending';
		errorMessage = '';
		const merge_variables = buildMergeVariables(inputs, schedule, t, locale, new Date());
		const result = await sendToTrmnl(trimmed, merge_variables);
		if (result.ok) {
			status = 'sent';
		} else {
			status = 'error';
			errorMessage = result.message;
		}
	}

	function disconnect(): void {
		if (browser) clearTrmnlUuid(localStorage);
		savedUuid = null;
		uuidInput = '';
		status = 'idle';
		errorMessage = '';
	}
</script>

<button
	type="button"
	role="menuitem"
	class={triggerClass}
	onclick={open}
	disabled={!schedule.feasible}
>
	{t.trmnl_push.menu_item}
</button>

<dialog
	bind:this={dialogEl}
	class="border-dough-200 max-w-md rounded-2xl border bg-white p-0 text-sm text-stone-700 shadow-xl backdrop:bg-stone-950/40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
>
	<form method="dialog" class="space-y-4 p-5">
		<header class="space-y-1">
			<h2 class="font-display text-tomato-700 dark:text-tomato-300 text-lg">
				{t.trmnl_push.dialog_heading}
			</h2>
			<p class="text-xs text-stone-500 dark:text-stone-400">{t.trmnl_push.dialog_intro}</p>
		</header>

		<label class="block space-y-1">
			<span class="text-xs font-medium text-stone-600 dark:text-stone-300"
				>{t.trmnl_push.uuid_label}</span
			>
			<input
				type="text"
				inputmode="text"
				autocomplete="off"
				bind:value={uuidInput}
				placeholder="00000000-0000-0000-0000-000000000000"
				class="border-dough-300 w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm tracking-tight text-stone-900 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
				formnovalidate
			/>
		</label>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="bg-tomato-500 hover:bg-tomato-600 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
				disabled={status === 'sending' || uuidInput.trim().length === 0}
				onclick={send}
			>
				{status === 'sending' ? t.trmnl_push.sending : t.trmnl_push.send}
			</button>
			{#if savedUuid}
				<button
					type="button"
					class="rounded-full border border-stone-300 px-3 py-2 text-xs text-stone-600 hover:border-stone-400 dark:border-stone-600 dark:text-stone-300"
					onclick={disconnect}
				>
					{t.trmnl_push.disconnect}
				</button>
			{/if}
			<button
				type="button"
				class="ml-auto rounded-full px-3 py-2 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
				onclick={close}
			>
				{t.trmnl_push.close}
			</button>
		</div>

		{#if status === 'sent'}
			<p class="text-basil-700 dark:text-basil-300 text-xs">{t.trmnl_push.sent}</p>
		{:else if status === 'error'}
			<p class="text-tomato-700 dark:text-tomato-300 text-xs">
				{t.trmnl_push.error}: {errorMessage}
			</p>
		{/if}

		<p
			class="border-dough-200 border-t pt-3 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400"
		>
			{t.trmnl_push.setup_hint}
			<a
				href="https://github.com/JanWelker/knead-time/blob/main/docs/trmnl-setup.md"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
			>
				{t.trmnl_push.setup_link}
			</a>
		</p>
	</form>
</dialog>
