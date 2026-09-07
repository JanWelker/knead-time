<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FermentMode } from '$lib/dough/types';

	// Which leg the schedule took. It reads as a gauge rather than a badge
	// because it is the legend for the blue on the overview bar: cold means the
	// fridge, and blue means cold everywhere in this app.
	let { mode }: { mode: FermentMode } = $props();
	const t = $derived(i18n.t);
	const cold = $derived(mode === 'cold');
</script>

<div class="sm:max-w-[16rem] sm:text-right">
	<p class="gauge {cold ? 'text-cold' : 'text-accent'}">
		<span
			class="size-2 rounded-full {cold ? 'night-seg-cold' : 'night-seg-warm'}"
			aria-hidden="true"
		></span>
		{cold ? t.mode.cold : t.mode.room}
	</p>
	<p class="ink-faint mt-1 text-xs leading-snug">
		{cold ? t.mode.cold_blurb : t.mode.room_blurb}
	</p>
</div>
