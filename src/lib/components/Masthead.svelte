<script lang="ts">
	import type { Snippet } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';

	// The one piece of chrome every view shares: the wordmark on the left, the
	// view's own controls on the right. On the plan the wordmark is plain text
	// — a button that goes where you already are is a dead control — and
	// everywhere else it is the way back to the plan.
	let { home, children }: { home?: () => void; children?: Snippet } = $props();
	const t = $derived(i18n.t);
</script>

<header class="view-pad flex items-center justify-between gap-3 py-4 sm:py-6">
	{#if home}
		<button type="button" class="wordmark" onclick={home} aria-label={t.nav.plan}>
			{t.app.title}
		</button>
	{:else}
		<span class="wordmark">{t.app.title}</span>
	{/if}
	<div class="flex min-w-0 items-center gap-2">
		{@render children?.()}
	</div>
</header>
