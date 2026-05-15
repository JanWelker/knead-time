<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { recipeFitScore, type FitFactor } from '$lib/dough/quality';
	import type { ComputedSchedule } from '$lib/dough/types';

	let { schedule }: { schedule: ComputedSchedule } = $props();
	const t = $derived(i18n.t);
	const fit = $derived(recipeFitScore(schedule));

	function factorLabel(factor: FitFactor): string {
		switch (factor) {
			case 'night':
				return t.quality.factor_night;
			case 'clamp-preferment':
				return t.quality.factor_clamp_preferment;
			case 'clamp-bulk-cold':
				return t.quality.factor_clamp_bulk_cold;
			case 'extreme-yeast':
				return t.quality.factor_extreme_yeast;
			case 'window':
				return t.quality.factor_window;
		}
	}

	// Plain-text tooltip for the title attribute. The visible details below
	// echo it for sighted users.
	const summaryTooltip = $derived.by(() => {
		const lines = fit.factors.length === 0 ? [t.quality.fit_perfect] : fit.factors.map(factorLabel);
		return `${t.quality.fit_heading}: ${lines.join(' ')}`;
	});

	const stars = $derived([1, 2, 3, 4, 5]);
</script>

<details class="group inline-block">
	<summary
		class="hover:text-tomato-600 dark:hover:text-tomato-300 inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-stone-600 select-none dark:text-stone-300"
		title={summaryTooltip}
		aria-label={interpolate(t.quality.fit_aria, { score: fit.score })}
	>
		<span class="flex items-baseline gap-0.5" aria-hidden="true">
			{#each stars as i (i)}
				{#if i <= fit.score}
					<svg width="14" height="14" viewBox="0 0 16 16" class="text-tomato-500 fill-current">
						<path
							d="M8 1.2 l1.96 4.43 4.84.42 -3.66 3.18 1.10 4.77 -4.24 -2.55 -4.24 2.55 1.10 -4.77 -3.66 -3.18 4.84 -.42z"
						/>
					</svg>
				{:else}
					<svg
						width="14"
						height="14"
						viewBox="0 0 16 16"
						class="text-stone-400 dark:text-stone-500"
					>
						<path
							d="M8 1.2 l1.96 4.43 4.84.42 -3.66 3.18 1.10 4.77 -4.24 -2.55 -4.24 2.55 1.10 -4.77 -3.66 -3.18 4.84 -.42z"
							fill="none"
							stroke="currentColor"
							stroke-width="1"
							stroke-linejoin="round"
						/>
					</svg>
				{/if}
			{/each}
		</span>
		<span class="font-medium">{t.quality.fit_heading}</span>
	</summary>
	<div
		class="border-dough-200 absolute z-20 mt-2 max-w-xs rounded-2xl border bg-white p-3 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-800"
	>
		{#if fit.factors.length === 0}
			<p class="text-stone-600 dark:text-stone-300">{t.quality.fit_perfect}</p>
		{:else}
			<ul class="space-y-1 text-stone-600 dark:text-stone-300">
				{#each fit.factors as factor (factor)}
					<li class="flex items-start gap-2">
						<span class="text-tomato-700 dark:text-tomato-300 shrink-0">−1</span>
						<span>{factorLabel(factor)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
