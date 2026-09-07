<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FermentMode } from '$lib/dough/types';

	let { mode }: { mode: FermentMode } = $props();
	const t = $derived(i18n.t);
</script>

<!-- Which leg the schedule took, stated as a standing head rather than a
     coloured pill: a square of the mode's own ink, the name in capitals, and
     the sentence that explains it in italic underneath. Basil is the cold
     fridge leg, rubric the warm room one — the same two inks the window rail
     paints its bands with, so the colour means one thing in both places. -->
<div class="flex items-baseline gap-2">
	<span
		class="mt-px size-2 shrink-0 {mode === 'cold' ? 'bg-basil' : 'bg-rubric'}"
		aria-hidden="true"
	></span>
	<span class="eyebrow {mode === 'cold' ? 'text-basil' : 'text-rubric'}">
		{mode === 'cold' ? t.mode.cold : t.mode.room}
	</span>
</div>
<p class="text-ink-soft measure mt-1 text-xs italic">
	{mode === 'cold' ? t.mode.cold_blurb : t.mode.room_blurb}
</p>
