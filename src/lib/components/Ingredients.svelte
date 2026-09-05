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

<div class="space-y-6">
	{#each sections as section (section.key)}
		<section>
			{#if section.heading}
				<header class="mb-2">
					<h3 class="font-display text-accent text-base">{section.heading}</h3>
					{#if section.help}
						<p class="text-xs text-stone-500 dark:text-stone-400">{section.help}</p>
					{/if}
				</header>
			{/if}
			<table class="w-full border-collapse tabular-nums">
				<tbody>
					{#each section.rows as row (row.label)}
						<tr class="row-divider">
							<th class="py-2 pr-3 text-left font-medium text-stone-700 dark:text-stone-200">
								{row.label}
								{#if row.hint}
									<span class="text-xs font-normal text-stone-500 dark:text-stone-400">
										({row.hint})
									</span>
								{/if}
							</th>
							<td class="py-2 text-right tabular-nums dark:text-stone-100">{row.amount}</td>
						</tr>
					{/each}
					{#if section.total}
						<tr>
							<th class="font-display text-accent py-2 pr-3 text-left">{section.total.label}</th>
							<td class="font-display text-accent py-2 text-right tabular-nums">
								{section.total.amount}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</section>
	{/each}

	{#if needsFineScale(ingredients)}
		<p class="text-xs text-stone-500 italic dark:text-stone-400">{t.ingredients.scale_hint}</p>
	{/if}
</div>
