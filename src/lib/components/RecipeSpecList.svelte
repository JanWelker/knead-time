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

<dl class="text-ink-soft mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
	<dt class="text-ink font-semibold">{labels.col_pizzas}</dt>
	<dd class="figure">{numLabel(inputs.pizzaCount)}</dd>
	<dt class="text-ink font-semibold">{labels.col_ball}</dt>
	<dd class="figure">{numLabel(inputs.ballWeight, ' g')}</dd>
	<dt class="text-ink font-semibold">{labels.col_hydration}</dt>
	<dd class="figure">{numLabel(inputs.hydration, '%')}</dd>
	<dt class="text-ink font-semibold">{labels.col_salt}</dt>
	<dd class="figure">{numLabel(inputs.saltPercent, '%')}</dd>
	{#if labels.col_oil && (inputs.oilPercent ?? 0) > 0}
		<dt class="text-ink font-semibold">{labels.col_oil}</dt>
		<dd class="figure">{numLabel(inputs.oilPercent, '%')}</dd>
	{/if}
	{#if labels.col_sugar && (inputs.sugarPercent ?? 0) > 0}
		<dt class="text-ink font-semibold">{labels.col_sugar}</dt>
		<dd class="figure">{numLabel(inputs.sugarPercent, '%')}</dd>
	{/if}
	<dt class="text-ink font-semibold">{labels.col_yeast}</dt>
	<dd>{yeastLabel(inputs, t)}</dd>
	<dt class="text-ink font-semibold">{labels.col_temp}</dt>
	<dd class="figure">{numLabel(inputs.roomTempC, '°C')}</dd>
	<dt class="text-ink font-semibold">{labels.col_fridge}</dt>
	<dd class="figure">{numLabel(inputs.fridgeTempC, '°C')}</dd>
	<dt class="text-ink font-semibold">{labels.col_preFerment}</dt>
	<dd>{preFermentLabel(inputs, t)}</dd>
</dl>
