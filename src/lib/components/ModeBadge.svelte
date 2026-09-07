<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FermentMode } from '$lib/dough/types';

	// `blurb` off where the badge is a one-line status among others (the plan's
	// summary, the running glance on the ask flow); on where there is room to
	// say what the mode means.
	let { mode, blurb = true }: { mode: FermentMode; blurb?: boolean } = $props();
	const t = $derived(i18n.t);
</script>

<span
	class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold {mode ===
	'cold'
		? 'bg-basil-100 text-basil-800 dark:bg-basil-900/50 dark:text-basil-200'
		: 'bg-dough-100 text-dough-900 dark:bg-dough-900/50 dark:text-dough-100'}"
>
	<span class="h-2 w-2 rounded-full {mode === 'cold' ? 'bg-basil-500' : 'bg-dough-500'}"></span>
	{mode === 'cold' ? t.mode.cold : t.mode.room}
</span>
{#if blurb}
	<p class="text-ink-soft mt-2 max-w-[46ch] text-sm leading-relaxed">
		{mode === 'cold' ? t.mode.cold_blurb : t.mode.room_blurb}
	</p>
{/if}
