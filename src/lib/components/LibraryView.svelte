<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { SavedRecipe } from '$lib/storedRecipes';
	import Community from './Community.svelte';
	import Masthead from './Masthead.svelte';
	import MastheadMenu from './MastheadMenu.svelte';
	import MyRecipes from './MyRecipes.svelte';
	import Pizzerias from './Pizzerias.svelte';

	// The rack: three sheets of tickets hung side by side, one press from the
	// first question and one from the plan. They used to sit at the bottom of a
	// 5600 px column, which put the app's best starting points behind everything
	// a beginner had to scroll past — and they are starting points, not
	// appendices. Each is its own `.card`, closed, so the rack reads as an index
	// of three rather than as a wall of tables.
	let {
		recipes,
		onDelete,
		onback
	}: { recipes: SavedRecipe[]; onDelete: (name: string) => void; onback: () => void } = $props();

	const t = $derived(i18n.t);
</script>

<div class="view" data-view="library">
	<Masthead home={onback} />

	<div class="view-pad flex-1 pt-8 pb-10 sm:pt-10">
		<!-- Under the flag with the plan's, not in the masthead: the row reads the
		     same on every view, right-aligned and ending with the menu, whose panel
		     hangs from that edge. The way back is a ruled plaque like Guide me —
		     both leave the view they are on rather than acting on it. -->
		<div class="mb-8 flex flex-wrap items-center justify-end gap-3">
			<button type="button" class="btn-guide" onclick={onback}>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M19 12H5M11 18l-6-6 6-6" />
				</svg>
				{t.library.back}
			</button>
			<MastheadMenu />
		</div>

		<h1 class="question max-w-[14ch]">{t.library.heading}</h1>
		<p class="lede mt-5">{t.library.intro}</p>

		<!-- Each collection is wrapped in a <section> so it is a landmark the
		     browser suite can reach by its own heading (e2e/helpers.ts `region`);
		     the sheet itself is the <details> inside. -->
		<div class="mt-10 space-y-6">
			<section><MyRecipes {recipes} {onDelete} /></section>
			<section><Community /></section>
			<section><Pizzerias /></section>
		</div>
	</div>
</div>
