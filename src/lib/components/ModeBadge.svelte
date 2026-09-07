<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FermentMode } from '$lib/dough/types';

	// Cold is basil, room is tomato — the app's two accents mean "time passes"
	// and "you are doing something", and a cold ferment is the one that happens
	// while you sleep. The blurb is optional: the bake board wants the token
	// alone beside a large figure, the schedule header wants the sentence too.
	let { mode, blurb = true }: { mode: FermentMode; blurb?: boolean } = $props();
	const t = $derived(i18n.t);
</script>

<div class="chip {mode === 'cold' ? 'chip-time' : 'chip-action'} px-3 py-1.5">
	<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		{#if mode === 'cold'}
			<!-- A snowflake: the fridge leg. -->
			<path
				d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5"
				stroke="currentColor"
				stroke-width="1.4"
				stroke-linecap="round"
			/>
		{:else}
			<!-- Rising heat over the counter. -->
			<path
				d="M5 12.5c-1.6-1.4-1.6-3.2 0-4.6 1.6-1.4 1.9-2.9.9-4.4 2.6.9 4.2 3 4.2 5.1 0 1.5-.6 2.8-1.7 3.9"
				stroke="currentColor"
				stroke-width="1.4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/if}
	</svg>
	{mode === 'cold' ? t.mode.cold : t.mode.room}
</div>
{#if blurb}
	<p class="text-ink-faint mt-1 text-xs">
		{mode === 'cold' ? t.mode.cold_blurb : t.mode.room_blurb}
	</p>
{/if}
