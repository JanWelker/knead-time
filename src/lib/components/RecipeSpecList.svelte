<script lang="ts">
	import type { SerializableInputs } from '$lib/dough/urlState';
	import { numLabel, preFermentLabel, yeastLabel, type RecipeSpecLabels } from './recipeLabels';
	import { i18n } from '$lib/i18n/i18n.svelte';

	// The recipe's numbers, as a definition list. Shown inside each card's
	// "Details" disclosure — the phone layout's answer to the desktop table's
	// middle columns. Both collections list the same things in the same order;
	// only 50 Top Pizza has oil and sugar to show, and only when a recipe uses
	// them (a 0 % row would read as part of the recipe).
	let { inputs, labels }: { inputs: Partial<SerializableInputs>; labels: RecipeSpecLabels } =
		$props();

	const t = $derived(i18n.t);
</script>

<dl
	class="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-stone-600 dark:text-stone-300"
>
	<dt class="font-medium">{labels.col_pizzas}</dt>
	<dd class="tabular-nums">{numLabel(inputs.pizzaCount)}</dd>
	<dt class="font-medium">{labels.col_ball}</dt>
	<dd class="tabular-nums">{numLabel(inputs.ballWeight, ' g')}</dd>
	<dt class="font-medium">{labels.col_hydration}</dt>
	<dd class="tabular-nums">{numLabel(inputs.hydration, '%')}</dd>
	<dt class="font-medium">{labels.col_salt}</dt>
	<dd class="tabular-nums">{numLabel(inputs.saltPercent, '%')}</dd>
	{#if labels.col_oil && (inputs.oilPercent ?? 0) > 0}
		<dt class="font-medium">{labels.col_oil}</dt>
		<dd class="tabular-nums">{numLabel(inputs.oilPercent, '%')}</dd>
	{/if}
	{#if labels.col_sugar && (inputs.sugarPercent ?? 0) > 0}
		<dt class="font-medium">{labels.col_sugar}</dt>
		<dd class="tabular-nums">{numLabel(inputs.sugarPercent, '%')}</dd>
	{/if}
	<dt class="font-medium">{labels.col_yeast}</dt>
	<dd>{yeastLabel(inputs, t)}</dd>
	<dt class="font-medium">{labels.col_temp}</dt>
	<dd class="tabular-nums">{numLabel(inputs.roomTempC, '°C')}</dd>
	<dt class="font-medium">{labels.col_fridge}</dt>
	<dd class="tabular-nums">{numLabel(inputs.fridgeTempC, '°C')}</dd>
	<dt class="font-medium">{labels.col_preFerment}</dt>
	<dd>{preFermentLabel(inputs, t)}</dd>
</dl>
