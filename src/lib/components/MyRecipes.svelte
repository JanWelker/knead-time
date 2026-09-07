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
	<summary class="flex cursor-pointer list-none items-baseline gap-2.5 select-none">
		<span
			class="text-rubric text-[0.7rem] leading-none transition-transform group-open:rotate-90"
			aria-hidden="true">▶</span
		>
		<header>
			<h2 class="opener">{t.myRecipes.heading}</h2>
			<p class="text-ink-soft measure mt-1 text-sm italic">{t.myRecipes.intro}</p>
		</header>
	</summary>

	<div class="mt-4">
		{#if recipes.length === 0}
			<p class="text-ink-soft text-sm italic">{t.myRecipes.empty}</p>
		{:else}
			<ul class="border-rule border-t">
				{#each recipes as recipe (recipe.name)}
					<li class="border-rule flex flex-wrap items-center justify-between gap-3 border-b py-3">
						<div class="min-w-0">
							<span class="text-ink block truncate font-semibold">{recipe.name}</span>
							<span class="text-ink-soft figure block text-xs">
								{dateFormatter.format(new Date(recipe.savedAt))}
							</span>
						</div>
						<div class="flex shrink-0 items-center gap-4">
							<a
								href="{resolve('/')}?{recipe.search}"
								rel="external"
								class="btn-ink-sm inline-flex items-center justify-center"
							>
								{t.myRecipes.open_link}
							</a>
							<button
								type="button"
								class="text-ink-soft hover:text-rubric inline-block py-1 text-sm underline-offset-2 hover:underline"
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
