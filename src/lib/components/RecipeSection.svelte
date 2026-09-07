<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { RecipeSectionCopy } from './recipeLabels';

	// The shell both recipe collections sit in: a disclosure that ships closed
	// (browsing other people's recipes is a detour, not part of the
	// calculate-my-dough flow), an empty state, and the "add yours" footer.
	// Community and 50 Top Pizza had a copy each, identical down to the arrow's
	// rotation class — only the message namespace and the .md path differed.
	let {
		copy,
		isEmpty,
		sourceHref,
		children
	}: {
		copy: RecipeSectionCopy;
		isEmpty: boolean;
		/**
		 * The .md file on GitHub that this section is generated from. Carries
		 * rel="external" because it is a prop: the lint rule that keeps in-app
		 * links going through resolve() cannot tell that this one leaves the app.
		 */
		sourceHref: string;
		children: Snippet;
	} = $props();
</script>

<details class="group">
	<summary class="flex cursor-pointer list-none items-start gap-2 select-none">
		<svg
			class="disclosure-caret"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m6 3 5 5-5 5" />
		</svg>
		<header>
			<h2 class="font-display text-ink text-2xl">{copy.heading}</h2>
			<p class="text-ink-faint mt-1 text-sm">{copy.intro}</p>
		</header>
	</summary>

	<div class="mt-4">
		{#if isEmpty}
			<p class="text-ink-faint text-sm">{copy.empty}</p>
		{:else}
			{@render children()}
			<p class="text-ink-faint mt-4 text-xs">
				{copy.contribute.before_md}<a
					href={sourceHref}
					target="_blank"
					rel="external noopener noreferrer"
					class="link-quiet">{copy.contribute.md}</a
				>{copy.contribute.between}<a
					href="https://github.com/JanWelker/knead-time/pulls"
					target="_blank"
					rel="noopener noreferrer"
					class="link-quiet">{copy.contribute.pr}</a
				>{copy.contribute.after}
			</p>
		{/if}
	</div>
</details>
