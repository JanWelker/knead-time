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
<!-- Its own sheet on the rack: the heading is the ink band across the top and
     the tickets sit in the body under it. -->
<details class="group card" open={recipes.length > 0}>
	<summary class="card-header cursor-pointer">
		<span
			class="font-mono text-[0.7rem] tracking-tight transition-transform group-open:rotate-90"
			aria-hidden="true">▶</span
		>
		<h2 class="card-header-title">{t.myRecipes.heading}</h2>
	</summary>
	<div class="card-body">
		<p class="text-ink-soft mb-4 text-sm">{t.myRecipes.intro}</p>
		{#if recipes.length === 0}
			<p class="text-ink-soft text-sm">{t.myRecipes.empty}</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each recipes as recipe (recipe.name)}
					<li
						class="border-rule bg-paper flex flex-wrap items-center justify-between gap-3 rounded-[2px] border-2 p-3"
					>
						<div class="min-w-0">
							<span class="text-ink block truncate font-bold">
								{recipe.name}
							</span>
							<span class="text-ink-soft block text-xs">
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
							<button type="button" class="btn-quiet" onclick={() => onDelete(recipe.name)}>
								{t.myRecipes.delete_label}
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
