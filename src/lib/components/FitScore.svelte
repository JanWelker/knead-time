<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { recipeFitScore, type FitFactor, type FitFactorDetail } from '$lib/dough/quality';
	import type { ComputedSchedule, DoughInputs } from '$lib/dough/types';

	let { schedule, inputs }: { schedule: ComputedSchedule; inputs: DoughInputs } = $props();
	const t = $derived(i18n.t);
	const fit = $derived(recipeFitScore(schedule, inputs));

	function factorTemplate(factor: FitFactor): string {
		switch (factor) {
			case 'cold-bulk-shifted':
				return t.quality.factor_cold_bulk_shifted;
			case 'cold-bulk-clamped-short':
				return t.quality.factor_cold_bulk_clamped_short;
			case 'cold-bulk-clamped-long':
				return t.quality.factor_cold_bulk_clamped_long;
			case 'preferment-clamped-short':
				return t.quality.factor_preferment_clamped_short;
			case 'preferment-clamped-long':
				return t.quality.factor_preferment_clamped_long;
			case 'night-step':
				return t.quality.factor_night_step;
			case 'infeasible':
				return t.quality.factor_infeasible;
			case 'hydration-off':
				return t.quality.factor_hydration_off;
			case 'salt-off':
				return t.quality.factor_salt_off;
			case 'ball-weight-off':
				return t.quality.factor_ball_weight_off;
			case 'room-temp-off':
				return t.quality.factor_room_temp_off;
			case 'fridge-temp-off':
				return t.quality.factor_fridge_temp_off;
			case 'yeast-extreme':
				return t.quality.factor_yeast_extreme;
		}
	}

	function factorLabel(detail: FitFactorDetail): string {
		// {delta} is rendered to one decimal place for hours/degrees/grams.
		// Integer percentage points keep the leading zero off (e.g. "5%").
		const rounded = Math.round(detail.delta * 10) / 10;
		return interpolate(factorTemplate(detail.factor), { delta: rounded });
	}

	const summaryTooltip = $derived.by(() => {
		const lines = fit.factors.length === 0 ? [t.quality.fit_perfect] : fit.factors.map(factorLabel);
		return `${t.quality.fit_heading} ${fit.score}%: ${lines.join(' · ')}`;
	});
</script>

<details class="group relative inline-block">
	<summary
		class="hover:text-tomato-600 dark:hover:text-tomato-300 inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-stone-600 select-none dark:text-stone-300"
		title={summaryTooltip}
		aria-label={interpolate(t.quality.fit_aria, { score: fit.score })}
	>
		<span class="font-display text-accent inline-block tabular-nums" aria-hidden="true">
			{fit.score}%
		</span>
		<span>{t.quality.fit_heading}</span>
	</summary>
	<div
		class="border-dough-200 absolute z-20 mt-2 max-w-sm rounded-2xl border bg-white p-3 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-800"
	>
		{#if fit.factors.length === 0}
			<p class="text-stone-600 dark:text-stone-300">{t.quality.fit_perfect}</p>
		{:else}
			<ul class="space-y-1 text-stone-600 dark:text-stone-300">
				{#each fit.factors as detail (detail.factor)}
					<li>{factorLabel(detail)}</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
