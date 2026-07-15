<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { ingredientTotals } from '$lib/dough/bakers';
	import { formatGrams, formatPercent } from '$lib/format';
	import { yeastIngredientName } from '$lib/stepCopy';
	import type { Ingredients, YeastType } from '$lib/dough/types';

	let {
		ingredients,
		yeastType,
		yeastPercent
	}: { ingredients: Ingredients; yeastType: YeastType; yeastPercent: number } = $props();
	const t = $derived(i18n.t);

	const yeastLabel = $derived(yeastIngredientName(yeastType, t));

	// A 1 g kitchen scale cannot weigh a 0.8 g yeast pinch — surface the hint
	// whenever any yeast amount on the page drops below 2 g.
	const needsFineScale = $derived(
		(ingredients.yeast > 0 && ingredients.yeast < 2) ||
			ingredients.preFerments.some((pf) => pf.yeast > 0 && pf.yeast < 2)
	);

	const totals = $derived(ingredientTotals(ingredients));
</script>

{#snippet row(label: string, value: number, hint: string | null = null)}
	<tr class="row-divider">
		<th class="py-2 pr-3 text-left font-medium text-stone-700 dark:text-stone-200">
			{label}
			{#if hint}
				<span class="text-xs font-normal text-stone-500 dark:text-stone-400">({hint})</span>
			{/if}
		</th>
		<td class="py-2 text-right tabular-nums dark:text-stone-100">{formatGrams(value)}</td>
	</tr>
{/snippet}

{#snippet extras()}
	{#if ingredients.oil > 0}
		{@render row(t.ingredients.oil, ingredients.oil)}
	{/if}
	{#if ingredients.sugar > 0}
		{@render row(t.ingredients.sugar, ingredients.sugar)}
	{/if}
{/snippet}

{#snippet totalRow()}
	<tr>
		<th class="font-display text-accent py-2 pr-3 text-left">{t.ingredients.total}</th>
		<td class="font-display text-accent py-2 text-right tabular-nums">
			{formatGrams(ingredients.totalDough)}
		</td>
	</tr>
{/snippet}

<div class="space-y-6">
	{#if ingredients.preFerments.length > 0}
		{#each ingredients.preFerments as pf (pf.type)}
			<section>
				<header class="mb-2">
					<h3 class="font-display text-accent text-base">
						{pf.type === 'biga'
							? t.ingredients.preFerment_heading_biga
							: t.ingredients.preFerment_heading_poolish}
					</h3>
					<p class="text-xs text-stone-500 dark:text-stone-400">{t.ingredients.preFerment_help}</p>
				</header>
				<table class="w-full border-collapse tabular-nums">
					<tbody>
						{@render row(t.ingredients.flour, pf.flour)}
						{@render row(t.ingredients.water, pf.water)}
						{@render row(yeastLabel, pf.yeast)}
					</tbody>
				</table>
			</section>
		{/each}

		<section>
			<header class="mb-2">
				<h3 class="font-display text-accent text-base">{t.ingredients.mainDough_heading}</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400">{t.ingredients.mainDough_help}</p>
			</header>
			<table class="w-full border-collapse tabular-nums">
				<tbody>
					{@render row(t.ingredients.flour, ingredients.flour)}
					{@render row(t.ingredients.water, ingredients.water)}
					{@render row(t.ingredients.salt, ingredients.salt)}
					{@render extras()}
					{#if ingredients.yeast > 0}
						{@render row(yeastLabel, ingredients.yeast)}
					{/if}
				</tbody>
			</table>
		</section>

		<section>
			<header class="mb-2">
				<h3 class="font-display text-accent text-base">{t.ingredients.totals_heading}</h3>
			</header>
			<table class="w-full border-collapse tabular-nums">
				<tbody>
					{@render row(t.ingredients.flour, totals.flour)}
					{@render row(t.ingredients.water, totals.water)}
					{@render row(t.ingredients.salt, totals.salt)}
					{@render extras()}
					{@render row(yeastLabel, totals.yeast, formatPercent(yeastPercent))}
					{@render totalRow()}
				</tbody>
			</table>
		</section>
	{:else}
		<table class="w-full border-collapse tabular-nums">
			<tbody>
				{@render row(t.ingredients.flour, ingredients.flour)}
				{@render row(t.ingredients.water, ingredients.water)}
				{@render row(t.ingredients.salt, ingredients.salt)}
				{@render extras()}
				{@render row(yeastLabel, ingredients.yeast, formatPercent(yeastPercent))}
				{@render totalRow()}
			</tbody>
		</table>
	{/if}

	{#if needsFineScale}
		<p class="text-xs text-stone-500 italic dark:text-stone-400">{t.ingredients.scale_hint}</p>
	{/if}
</div>
