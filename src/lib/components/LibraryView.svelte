<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { SavedRecipe } from '$lib/storedRecipes';
	import Community from './Community.svelte';
	import Masthead from './Masthead.svelte';
	import MyRecipes from './MyRecipes.svelte';
	import Pizzerias from './Pizzerias.svelte';

	// The three collections, together, one press from the first question and one
	// press from the plan. They used to sit at the bottom of a 5600 px column,
	// which put the app's best starting points behind everything a beginner had
	// to scroll past — and they are starting points, not appendices.
	let {
		recipes,
		onDelete,
		onback
	}: { recipes: SavedRecipe[]; onDelete: (name: string) => void; onback: () => void } = $props();

	const t = $derived(i18n.t);
</script>

<div class="view" data-view="library">
	<Masthead home={onback}>
		<button type="button" class="btn-ghost px-4 py-2 text-xs" onclick={onback}>
			{t.library.back}
		</button>
	</Masthead>

	<div class="view-pad flex-1 pb-8">
		<h1 class="question mt-2 max-w-[16ch]">{t.library.heading}</h1>
		<p class="lede mt-5">{t.library.intro}</p>

		<div class="mt-14 space-y-10">
			<section class="rule pt-8 first:border-t-0 first:pt-0">
				<MyRecipes {recipes} {onDelete} />
			</section>
			<section class="rule pt-8">
				<Community />
			</section>
			<section class="rule pt-8">
				<Pizzerias />
			</section>
		</div>
	</div>
</div>
