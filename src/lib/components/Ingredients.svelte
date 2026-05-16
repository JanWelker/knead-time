<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { formatGrams, formatPercent } from '$lib/format';
	import type { Ingredients } from '$lib/dough/types';

	let {
		ingredients,
		yeastType,
		yeastPercent
	}: { ingredients: Ingredients; yeastType: 'fresh' | 'sourdough'; yeastPercent: number } =
		$props();
	const t = $derived(i18n.t);

	const yeastLabel = $derived(
		yeastType === 'fresh' ? t.ingredients.fresh_yeast : t.ingredients.sourdough_starter
	);

	const totals = $derived(
		ingredients.preFerment
			? {
					flour: ingredients.flour + ingredients.preFerment.flour,
					water: ingredients.water + ingredients.preFerment.water,
					salt: ingredients.salt,
					yeast: ingredients.yeast + ingredients.preFerment.yeast
				}
			: null
	);
</script>

{#snippet row(label: string, value: number, hint: string | null = null)}
	<tr class="border-dough-200/70 border-b last:border-0 dark:border-stone-700/70">
		<th class="py-2 pr-3 text-left font-medium text-stone-700 dark:text-stone-200">
			{label}
			{#if hint}
				<span class="text-xs font-normal text-stone-500 dark:text-stone-400">({hint})</span>
			{/if}
		</th>
		<td class="py-2 text-right tabular-nums dark:text-stone-100">{formatGrams(value)}</td>
	</tr>
{/snippet}

<div class="space-y-6 print:space-y-2">
	{#if ingredients.preFerment}
		<section>
			<header class="mb-2 print:mb-0">
				<h3 class="font-display text-tomato-700 dark:text-tomato-300 text-base print:text-sm">
					{t.ingredients.preFerment_heading}
				</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400 print:hidden">
					{t.ingredients.preFerment_help}
				</p>
			</header>
			<table class="tabular w-full border-collapse">
				<tbody>
					{@render row(t.ingredients.flour, ingredients.preFerment.flour)}
					{@render row(t.ingredients.water, ingredients.preFerment.water)}
					{@render row(t.ingredients.fresh_yeast, ingredients.preFerment.yeast)}
				</tbody>
			</table>
		</section>

		<section>
			<header class="mb-2 print:mb-0">
				<h3 class="font-display text-tomato-700 dark:text-tomato-300 text-base print:text-sm">
					{t.ingredients.mainDough_heading}
				</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400 print:hidden">
					{t.ingredients.mainDough_help}
				</p>
			</header>
			<table class="tabular w-full border-collapse">
				<tbody>
					{@render row(t.ingredients.flour, ingredients.flour)}
					{@render row(t.ingredients.water, ingredients.water)}
					{@render row(t.ingredients.salt, ingredients.salt)}
					{#if ingredients.oil > 0}
						{@render row(t.ingredients.oil, ingredients.oil)}
					{/if}
					{#if ingredients.sugar > 0}
						{@render row(t.ingredients.sugar, ingredients.sugar)}
					{/if}
					{#if ingredients.yeast > 0}
						{@render row(yeastLabel, ingredients.yeast)}
					{/if}
				</tbody>
			</table>
		</section>

		<section>
			<header class="mb-2 print:mb-0">
				<h3 class="font-display text-tomato-700 dark:text-tomato-300 text-base print:text-sm">
					{t.ingredients.totals_heading}
				</h3>
			</header>
			<table class="tabular w-full border-collapse">
				<tbody>
					{@render row(t.ingredients.flour, totals!.flour)}
					{@render row(t.ingredients.water, totals!.water)}
					{@render row(t.ingredients.salt, totals!.salt)}
					{#if ingredients.oil > 0}
						{@render row(t.ingredients.oil, ingredients.oil)}
					{/if}
					{#if ingredients.sugar > 0}
						{@render row(t.ingredients.sugar, ingredients.sugar)}
					{/if}
					{@render row(yeastLabel, totals!.yeast, formatPercent(yeastPercent))}
					<tr>
						<th class="font-display text-tomato-700 py-2 pr-3 text-left">{t.ingredients.total}</th>
						<td class="font-display text-tomato-700 py-2 text-right tabular-nums">
							{formatGrams(ingredients.totalDough)}
						</td>
					</tr>
				</tbody>
			</table>
		</section>
	{:else}
		<table class="tabular w-full border-collapse">
			<tbody>
				{@render row(t.ingredients.flour, ingredients.flour)}
				{@render row(t.ingredients.water, ingredients.water)}
				{@render row(t.ingredients.salt, ingredients.salt)}
				{#if ingredients.oil > 0}
					{@render row(t.ingredients.oil, ingredients.oil)}
				{/if}
				{#if ingredients.sugar > 0}
					{@render row(t.ingredients.sugar, ingredients.sugar)}
				{/if}
				{@render row(yeastLabel, ingredients.yeast, formatPercent(yeastPercent))}
				<tr>
					<th class="font-display text-tomato-700 dark:text-tomato-300 py-2 pr-3 text-left">
						{t.ingredients.total}
					</th>
					<td
						class="font-display text-tomato-700 dark:text-tomato-300 py-2 text-right tabular-nums"
					>
						{formatGrams(ingredients.totalDough)}
					</td>
				</tr>
			</tbody>
		</table>
	{/if}
</div>
