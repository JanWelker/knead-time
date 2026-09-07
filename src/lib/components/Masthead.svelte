<script lang="ts">
	import type { Snippet } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';

	// The one piece of chrome every view shares: the shop's painted sign on the
	// left, the view's own controls on the right, and the tricolore hairline
	// ruled the full width underneath — the same device the printed matter uses
	// to close a masthead, here holding three views together as one publication.
	//
	// On the plan the sign is plain text: a button that goes where you already
	// are is a dead control. Everywhere else it is the way back to the plan.
	//
	// The row is the sign and whatever the view puts beside it — on the plan,
	// nothing at all: its menu and its primary control sit together under the
	// flag, with the values they act on. The views that have no such block
	// (the questions, the library) keep both here.
	let { home, children }: { home?: () => void; children?: Snippet } = $props();
	const t = $derived(i18n.t);
</script>

<header>
	<div class="view-pad flex flex-wrap items-center justify-between gap-3 py-4 sm:py-5">
		{#if home}
			<button type="button" class="wordmark" onclick={home} aria-label={t.nav.plan}>
				{t.app.title}
			</button>
		{:else}
			<span class="wordmark">{t.app.title}</span>
		{/if}
		<div class="flex min-w-0 flex-wrap items-center gap-2">
			{@render children?.()}
		</div>
	</div>
	<!-- Ruled top and bottom in ink so the flag reads as printed onto the sheet
	     rather than as a coloured strip laid over it. -->
	<div class="tricolore border-rule border-y-2"></div>
</header>
