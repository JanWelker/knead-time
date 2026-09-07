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

<!--
  The ingredient column, set the way a printed recipe sets it: name left,
  weight hard right in tabular figures, a dotted leader crossing the gap so the
  eye can travel it. The leader lives inside the label cell as an empty span,
  because it must add no text — the browser suite compares this table's cells
  against the print sheet's, row for row, and any character here would make the
  two disagree. It is still a <table> for the same reason.
-->
<div class="space-y-7">
	{#each sections as section (section.key)}
		<section>
			{#if section.heading}
				<header class="border-rule mb-2 border-b pb-1.5">
					<h3 class="eyebrow text-rubric">{section.heading}</h3>
					{#if section.help}
						<p class="text-ink-soft mt-1 text-xs italic">{section.help}</p>
					{/if}
				</header>
			{/if}
			<table class="w-full border-collapse">
				<tbody>
					{#each section.rows as row (row.label)}
						<tr class="row-divider">
							<th class="w-full py-2 pr-3 text-left font-normal">
								<span class="ing-name">
									<span class="text-ink">
										{row.label}
										{#if row.hint}
											<span class="text-ink-soft figure text-xs">({row.hint})</span>
										{/if}
									</span>
									<span class="ing-leader" aria-hidden="true"></span>
								</span>
							</th>
							<td class="figure text-ink py-2 text-right whitespace-nowrap">{row.amount}</td>
						</tr>
					{/each}
					{#if section.total}
						<tr class="sum-rule">
							<th class="w-full pt-2.5 pr-3 text-left">
								<span class="eyebrow text-ink">{section.total.label}</span>
							</th>
							<td class="figure text-ink pt-2.5 text-right font-semibold whitespace-nowrap">
								{section.total.amount}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</section>
	{/each}

	{#if needsFineScale(ingredients)}
		<p class="annotation">{t.ingredients.scale_hint}</p>
	{/if}
</div>
