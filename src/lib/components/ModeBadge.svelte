<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FermentMode } from '$lib/dough/types';

	let { mode }: { mode: FermentMode } = $props();
	const t = $derived(i18n.t);
</script>

<div
	class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide print:border print:border-current/50 {mode ===
	'cold'
		? 'bg-basil-100 text-basil-800 dark:bg-basil-900/40 dark:text-basil-200'
		: 'bg-tomato-100 text-tomato-800 dark:bg-tomato-900/40 dark:text-tomato-200'}"
>
	<span
		class="h-2 w-2 rounded-full print:hidden {mode === 'cold' ? 'bg-basil-500' : 'bg-tomato-500'}"
	></span>
	{mode === 'cold' ? t.mode.cold : t.mode.room}
</div>
<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
	{mode === 'cold' ? t.mode.cold_blurb : t.mode.room_blurb}
</p>
