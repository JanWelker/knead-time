<script lang="ts">
	import { resolve } from '$app/paths';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { SavedRecipe } from '$lib/storedRecipes';

	let { recipes, onDelete }: { recipes: SavedRecipe[]; onDelete: (name: string) => void } =
		$props();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	const dateFormatter = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
	);
</script>

<!-- Device-local recipe book. Collapsed like the reference sections; the Open
     link reloads the page with the saved query string so onMount re-decodes,
     mirroring the community table's pattern. -->
<details class="group" open={recipes.length > 0}>
	<summary class="flex cursor-pointer list-none items-start gap-2 select-none">
		<span
			class="text-accent mt-2 font-mono text-[0.7rem] tracking-tight transition-transform group-open:rotate-90"
			aria-hidden="true">▶</span
		>
		<header>
			<h2 class="font-display text-ink text-2xl">
				{t.myRecipes.heading}
			</h2>
			<p class="text-ink-faint mt-1 text-sm">{t.myRecipes.intro}</p>
		</header>
	</summary>

	<div class="mt-4">
		{#if recipes.length === 0}
			<p class="text-ink-faint text-sm">{t.myRecipes.empty}</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each recipes as recipe (recipe.name)}
					<li
						class="border-rule-soft flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
					>
						<div class="min-w-0">
							<span class="text-ink block truncate font-medium">
								{recipe.name}
							</span>
							<span class="text-ink-faint block text-xs">
								{dateFormatter.format(new Date(recipe.savedAt))}
							</span>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<a
								href="{resolve('/')}?{recipe.search}"
								rel="external"
								class="btn-tomato inline-flex items-center justify-center"
							>
								{t.myRecipes.open_link}
							</a>
							<button
								type="button"
								class="hover:text-tomato-600 dark:hover:text-tomato-300 text-ink-faint inline-block py-0.5 text-sm underline-offset-2 hover:underline"
								onclick={() => onDelete(recipe.name)}
							>
								{t.myRecipes.delete_label}
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
