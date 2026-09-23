<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { SavedRecipe } from '$lib/storedRecipes';
	import RecipeSection from './RecipeSection.svelte';

	let { recipes, onDelete }: { recipes: SavedRecipe[]; onDelete: (name: string) => void } =
		$props();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);
</script>

<!-- Device-local recipe book, hung on the rack in the same shell as the two
     reference collections — heading band, intro, empty state. It has no .md
     file to contribute to, which is what leaves `t.myRecipes` without a
     `contribute` block and the footer unrendered. Unlike the other two it opens
     itself once there is something in it: these are the reader's own recipes,
     not a detour. The Open link reloads the page with the saved query string so
     onMount re-decodes, mirroring the community table's pattern. -->
<RecipeSection copy={t.myRecipes} isEmpty={recipes.length === 0} open={recipes.length > 0}>
	<ul class="flex flex-col gap-2">
		{#each recipes as recipe (recipe.name)}
			<li class="ticket flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					<span class="text-ink block truncate font-bold">
						{recipe.name}
					</span>
					<span class="text-ink-soft block text-xs">
						{formatDate(new Date(recipe.savedAt), locale)}
					</span>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<a href="{resolve('/')}?{recipe.search}" rel="external" class="btn-tomato">
						{t.myRecipes.open_link}
					</a>
					<button type="button" class="btn-quiet" onclick={() => onDelete(recipe.name)}>
						{t.myRecipes.delete_label}
					</button>
				</div>
			</li>
		{/each}
	</ul>
</RecipeSection>
