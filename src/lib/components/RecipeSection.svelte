<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { RecipeSectionCopy } from './recipeLabels';

	// The shell all three sheets on the rack sit in: a disclosure, an empty
	// state, and the "add yours" footer. Community, 50 Top Pizza and My recipes
	// had a copy each, identical down to the arrow's rotation class — only the
	// message namespace and the .md path differed.
	//
	// It ships closed by default: browsing other people's recipes is a detour,
	// not part of the calculate-my-dough flow. My recipes opens itself once
	// there is something in it, which is what `open` is for.
	let {
		copy,
		isEmpty,
		open = false,
		sourceHref,
		children
	}: {
		copy: RecipeSectionCopy;
		isEmpty: boolean;
		open?: boolean;
		/**
		 * The .md file on GitHub that this section is generated from. Carries
		 * rel="external" because it is a prop: the lint rule that keeps in-app
		 * links going through resolve() cannot tell that this one leaves the app.
		 * Omitted along with `copy.contribute` by a section with no source file.
		 */
		sourceHref?: string;
		children: Snippet;
	} = $props();

	const contribute = $derived(copy.contribute);
</script>

<!-- Its own sheet on the rack: the heading is the ink band across the top and
     the rows sit in the body under it. -->
<details class="group card" {open}>
	<summary class="card-header cursor-pointer">
		<span class="disclosure-mark font-mono" aria-hidden="true">▶</span>
		<h2 class="card-header-title">{copy.heading}</h2>
	</summary>
	<div class="card-body">
		<p class="text-ink-soft mb-4 text-sm">{copy.intro}</p>
		{#if isEmpty}
			<p class="text-ink-soft text-sm">{copy.empty}</p>
		{:else}
			{@render children()}
			{#if contribute}
				<p class="text-ink-soft mt-5 text-xs">
					{contribute.before_md}<a
						href={sourceHref}
						target="_blank"
						rel="external noopener noreferrer"
						class="link-quiet">{contribute.md}</a
					>{contribute.between}<a
						href="https://github.com/JanWelker/knead-time/pulls"
						target="_blank"
						rel="noopener noreferrer"
						class="link-quiet">{contribute.pr}</a
					>{contribute.after}
				</p>
			{/if}
		{/if}
	</div>
</details>
