<script lang="ts">
	import { browser } from '$app/environment';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FermentMode } from '$lib/dough/types';
	import { dismissOnOutsideClickOrEscape } from './dismiss.svelte';
	import GuildSeal from './GuildSeal.svelte';

	// Which leg the maths picked is a fact about this plan, so it is certified on
	// it. Basil for the fridge, tomato for the counter — the seal takes the
	// colour from here through currentColor.
	//
	// `explain` makes the seal open what the mode means, the way the fit seal
	// opens its factors. Off elsewhere: on the ask flow's ticket stub and in the
	// adjust sheet's header the seal is one status among several, and a sentence
	// of prose hanging off it there would be a second conversation.
	let { mode, explain = false }: { mode: FermentMode; explain?: boolean } = $props();
	const t = $derived(i18n.t);
	const blurb = $derived(mode === 'cold' ? t.mode.cold_blurb : t.mode.room_blurb);

	// Same dismissal contract as the fit seal and the menu. The element's own
	// `open` is the source of truth rather than a bound piece of state, because
	// <details> flips that attribute itself on click and Svelte syncs a binding
	// a tick later.
	let detailsRef: HTMLDetailsElement | null = $state(null);

	$effect(() => {
		if (!browser) return;
		return dismissOnOutsideClickOrEscape({
			container: () => detailsRef,
			isOpen: () => detailsRef?.open === true,
			close: () => {
				if (detailsRef) detailsRef.open = false;
			}
		});
	});
</script>

{#snippet mark()}
	<!-- The fridge is a snowflake, the counter a rising sun: the two things the
	     dough is actually sitting in. -->
	{#if mode === 'cold'}
		<g stroke="currentColor" stroke-width="6" stroke-linecap="round">
			<line x1="50" y1="28" x2="50" y2="72" />
			<line x1="31" y1="39" x2="69" y2="61" />
			<line x1="31" y1="61" x2="69" y2="39" />
		</g>
	{:else}
		<circle cx="50" cy="54" r="13" stroke="currentColor" stroke-width="6" />
		<g stroke="currentColor" stroke-width="6" stroke-linecap="round">
			<line x1="50" y1="26" x2="50" y2="33" />
			<line x1="30" y1="34" x2="35" y2="39" />
			<line x1="70" y1="34" x2="65" y2="39" />
		</g>
	{/if}
{/snippet}

<span class={mode === 'cold' ? 'text-herb-ink' : 'text-accent-ink'}>
	{#if explain}
		<details bind:this={detailsRef} class="relative inline-block">
			<summary class="cursor-pointer list-none select-none" title={blurb}>
				<GuildSeal label={mode === 'cold' ? t.mode.cold : t.mode.room}>
					{@render mark()}
				</GuildSeal>
			</summary>
			<div class="seal-panel">
				<p>{blurb}</p>
			</div>
		</details>
	{:else}
		<GuildSeal label={mode === 'cold' ? t.mode.cold : t.mode.room}>
			{@render mark()}
		</GuildSeal>
	{/if}
</span>
