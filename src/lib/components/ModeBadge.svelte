<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FermentMode } from '$lib/dough/types';

	let { mode }: { mode: FermentMode } = $props();
	const t = $derived(i18n.t);
</script>

<!-- Which leg the maths picked is a fact about this plan, so it is stamped on
     it: a hard-ruled mark pressed a degree and a half off square. Basil for the
     fridge, tomato for the counter — the only two places the third colour is
     spent. Nothing rotated is ever a tap target; this is text. -->
<div class="stamp {mode === 'cold' ? 'stamp-herb' : ''}">
	<span class="size-2 shrink-0 {mode === 'cold' ? 'bg-herb' : 'bg-accent'}"></span>
	{mode === 'cold' ? t.mode.cold : t.mode.room}
</div>
<p class="text-ink-soft text-xs leading-snug">
	{mode === 'cold' ? t.mode.cold_blurb : t.mode.room_blurb}
</p>
