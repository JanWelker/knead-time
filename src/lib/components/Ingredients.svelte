<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { ingredientSections, needsFineScale } from '$lib/ingredientRows';
	import type { Ingredients, YeastType } from '$lib/dough/types';

	let {
		ingredients,
		yeastType,
		yeastPercent,
		flourW
	}: {
		ingredients: Ingredients;
		yeastType: YeastType;
		yeastPercent: number;
		flourW: number | null;
	} = $props();
	const t = $derived(i18n.t);

	// What is weighed, and in what order, is decided in src/lib/ingredientRows.ts
	// — the print sheet renders the same list, so the two cannot disagree.
	const sections = $derived(ingredientSections(ingredients, yeastType, yeastPercent, flourW, t));
</script>

<!-- A deli ticket: every weight walks to its number on a dotted leader, the
     stub tears off above the total, and the total is struck under a double
     rule. The markup is still one <table> per section because the print sheet
     renders the same rows in the same order and a test holds the two together
     row for row. -->
<div class="space-y-7">
	{#each sections as section (section.key)}
		<section>
			{#if section.heading}
				<header class="mb-2">
					<h3 class="font-display border-rule text-ink border-b-2 pb-1 text-base uppercase">
						{section.heading}
					</h3>
					{#if section.help}
						<p class="text-ink-soft mt-1 text-xs">{section.help}</p>
					{/if}
				</header>
			{/if}
			<table class="w-full border-collapse tabular-nums">
				<tbody>
					{#each section.rows as row (row.label)}
						<tr class="row-divider">
							<th class="text-ink w-full py-2 pr-3 text-left font-semibold">
								<span class="flex items-baseline">
									<span>
										{row.label}
										{#if row.hint}
											<span class="text-ink-soft text-xs font-normal">({row.hint})</span>
										{/if}
									</span>
									<!-- The leader is the ticket's own connective tissue: it ties a
									     name to its weight across whatever width is left. -->
									<span class="leader" aria-hidden="true"></span>
								</span>
							</th>
							<td
								class="text-ink py-2 text-right text-base font-bold whitespace-nowrap tabular-nums"
							>
								{row.amount}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			{#if section.total}
				<!-- Tear here. Two half-round bites out of the card's own rule, drawn
				     with pseudo-elements filled in the page stock — no image. -->
				<div class="perforation -mx-5 mt-5 sm:-mx-6" aria-hidden="true"></div>
				<table class="rule-double mt-5 w-full border-collapse tabular-nums">
					<tbody>
						<tr>
							<th class="font-display text-ink w-full pt-3 pr-3 text-left text-lg uppercase">
								{section.total.label}
							</th>
							<td
								class="font-display text-accent-ink pt-3 text-right text-2xl whitespace-nowrap tabular-nums"
							>
								{section.total.amount}
							</td>
						</tr>
					</tbody>
				</table>
			{/if}
		</section>
	{/each}

	{#if needsFineScale(ingredients)}
		<p class="text-ink-soft text-xs">{t.ingredients.scale_hint}</p>
	{/if}
</div>
