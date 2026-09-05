<script lang="ts">
	import { browser } from '$app/environment';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import {
		fitStars,
		recipeFitScore,
		type FitFactor,
		type FitFactorDetail
	} from '$lib/dough/quality';
	import type { ComputedSchedule, DoughInputs } from '$lib/dough/types';

	let { schedule, inputs }: { schedule: ComputedSchedule; inputs: DoughInputs } = $props();
	const t = $derived(i18n.t);
	const fit = $derived(recipeFitScore(schedule, inputs));
	const stars = $derived(fitStars(fit.score));
	const starRow = $derived('★'.repeat(stars) + '☆'.repeat(5 - stars));

	// A Record rather than a switch, like Warnings.svelte's: same exhaustiveness
	// (a new FitFactor fails to compile until it is given copy) in a third of
	// the lines, and the two components now say it the same way.
	const COPY: Record<FitFactor, keyof typeof t.quality> = {
		'cold-bulk-shifted': 'factor_cold_bulk_shifted',
		'cold-bulk-clamped-short': 'factor_cold_bulk_clamped_short',
		'cold-bulk-clamped-long': 'factor_cold_bulk_clamped_long',
		'preferment-clamped-short': 'factor_preferment_clamped_short',
		'preferment-clamped-long': 'factor_preferment_clamped_long',
		'night-step': 'factor_night_step',
		infeasible: 'factor_infeasible',
		'hydration-off': 'factor_hydration_off',
		'salt-off': 'factor_salt_off',
		'ball-weight-off': 'factor_ball_weight_off',
		'room-temp-off': 'factor_room_temp_off',
		'fridge-temp-off': 'factor_fridge_temp_off',
		'yeast-extreme': 'factor_yeast_extreme',
		'flour-window-off': 'factor_flour_window_off'
	};

	function factorLabel(detail: FitFactorDetail): string {
		// {delta} is rendered to one decimal place for hours/degrees/grams.
		// Integer percentage points keep the leading zero off (e.g. "5%").
		const rounded = Math.round(detail.delta * 10) / 10;
		return interpolate(t.quality[COPY[detail.factor]], { delta: rounded });
	}

	// The actions menu next to this one dismisses on outside-click and Escape;
	// this panel did neither, so once opened it floated over the schedule it is
	// describing until its own summary was clicked again. Same contract as the
	// menu, minus the roving focus: this is a disclosure, not a menu, so its
	// content is read in place.
	//
	// The element's own `open` is the source of truth, rather than a bound piece
	// of state. <details> flips that attribute itself on click and Svelte syncs a
	// binding afterwards, so handlers gated on the bound copy saw `false` for a
	// window after the panel was visibly open and did nothing — reproducibly in
	// dev, and about one browser-test run in four. Reading the DOM removes the
	// timing question instead of racing it.
	let detailsRef: HTMLDetailsElement | null = $state(null);

	$effect(() => {
		if (!browser) return;
		function dismiss() {
			if (!detailsRef) return;
			detailsRef.open = false;
		}
		function onDocClick(event: MouseEvent) {
			if (!detailsRef?.open) return;
			if (!detailsRef.contains(event.target as Node)) dismiss();
		}
		function onKey(event: KeyboardEvent) {
			if (event.key !== 'Escape' || !detailsRef?.open) return;
			dismiss();
			detailsRef.querySelector<HTMLElement>('summary')?.focus();
		}
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	const summaryTooltip = $derived.by(() => {
		const lines = fit.factors.length === 0 ? [t.quality.fit_perfect] : fit.factors.map(factorLabel);
		return `${t.quality.fit_heading} ${starRow}: ${lines.join(' · ')}`;
	});
</script>

<details bind:this={detailsRef} class="group relative inline-block">
	<summary
		class="hover:text-tomato-600 dark:hover:text-tomato-300 inline-flex cursor-pointer list-none items-center gap-1.5 py-0.5 text-sm font-medium text-stone-600 select-none dark:text-stone-300"
		title={summaryTooltip}
		aria-label={interpolate(t.quality.fit_aria, { stars })}
	>
		<span class="text-accent inline-block tracking-tight" aria-hidden="true">
			{starRow}
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
				<!-- Key includes the index: with biga + poolish both clamped the same
				     factor legitimately appears twice, once per pre-ferment. -->
				{#each fit.factors as detail, i (detail.factor + '-' + i)}
					<li>{factorLabel(detail)}</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
