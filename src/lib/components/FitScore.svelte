<script lang="ts">
	import { browser } from '$app/environment';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { dismissOnOutsideClickOrEscape } from './dismiss.svelte';
	import GuildSeal from './GuildSeal.svelte';
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

	// Same dismissal contract as the actions menu beside it, minus the roving
	// focus: this is a disclosure, not a menu, so its content is read in place.
	//
	// The element's own `open` is the source of truth, rather than a bound piece
	// of state — <details> flips that attribute itself on click and Svelte syncs
	// a binding a tick later.
	let detailsRef: HTMLDetailsElement | null = $state(null);

	$effect(() => {
		if (!browser) return;
		return dismissOnOutsideClickOrEscape({
			container: () => detailsRef,
			isOpen: () => detailsRef?.open === true,
			close: () => {
				if (detailsRef) detailsRef.open = false;
			}
		});
	});

	const summaryTooltip = $derived.by(() => {
		const lines = fit.factors.length === 0 ? [t.quality.fit_perfect] : fit.factors.map(factorLabel);
		return `${t.quality.fit_heading} ${starRow}: ${lines.join(' · ')}`;
	});
</script>

<details bind:this={detailsRef} class="group relative inline-block">
	<summary
		class="text-accent-ink cursor-pointer list-none select-none"
		title={summaryTooltip}
		aria-label={interpolate(t.quality.fit_aria, { stars })}
	>
		<GuildSeal label={t.quality.fit_heading}>
			<!-- The grade as a figure rather than five ASCII stars: at seal size a
			     row of ★☆ is a smear, and the star it is counting is drawn once,
			     properly, above it. The full row is still in the tooltip and in the
			     spoken name. -->
			<path
				d="M50 24l5.2 10.6 11.7 1.7-8.5 8.2 2 11.6L50 52.6l-10.4 5.5 2-11.6-8.5-8.2 11.7-1.7z"
				fill="currentColor"
			/>
			<text
				x="50"
				y="82"
				text-anchor="middle"
				font-size="26"
				font-weight="700"
				fill="currentColor"
				class="font-display"
			>
				{stars}/5
			</text>
		</GuildSeal>
	</summary>
	<div class="seal-panel">
		{#if fit.factors.length === 0}
			<p>{t.quality.fit_perfect}</p>
		{:else}
			<ul class="space-y-1">
				<!-- Key includes the index: with biga + poolish both clamped the same
				     factor legitimately appears twice, once per pre-ferment. -->
				{#each fit.factors as detail, i (detail.factor + '-' + i)}
					<li>{factorLabel(detail)}</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
