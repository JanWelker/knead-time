<script lang="ts">
	import { flourZones } from '$lib/dough/flour';
	import { COLD_MODE_THRESHOLD_MIN } from '$lib/dough/schedule';
	import {
		nearestWindowStopIndex,
		WINDOW_STOPS,
		windowAxisPercent
	} from '$lib/dough/windowPresets';
	import { formatDuration } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';

	let { state }: { state: FormState } = $props();

	const t = $derived(i18n.t);

	// The slider moves between the canonical Neapolitan windows rather than
	// freely: its value IS a stop index, so dragging and the arrow keys both
	// land on a real plan, and every stop gets the same target size on a phone.
	// windowAxisPercent maps hours onto that same index rail, which is what
	// keeps the tolerance zones and tick labels aligned with the thumb.
	const zones = $derived(
		state.flourW === null ? null : flourZones(state.flourW, COLD_MODE_THRESHOLD_MIN / 60)
	);

	const windowHours = $derived(state.fermentWindowHours);
	// A window set from the date fields need not be on a stop; the thumb shows
	// the nearest one while the readout above keeps the true duration.
	const sliderIndex = $derived(nearestWindowStopIndex(windowHours));

	const band = $derived(
		state.schedule.mode === 'cold' ? (zones?.cold ?? null) : (zones?.room ?? null)
	);
	const inBand = $derived(band !== null && windowHours >= band.min && windowHours <= band.max);

	// Reuse the schedule's own localised duration formatter — the window is a
	// duration like any other, and this keeps unit copy out of the component.
	const formatWindow = (hours: number) => formatDuration(hours * 60, i18n.locale);
	// Band edges are rounded to the hour. They come from interpolating a
	// tolerance table its own authors call "a very broad and general
	// reference", so printing "18 h 19 min" would claim a precision the
	// number does not have. The slider's own value keeps its minutes — that
	// one is a time the user actually picked.
	const formatBandEdge = (hours: number) => formatWindow(Math.round(hours));

	// Labelled stops. Every stop gets a notch; only these carry text, so the
	// rail stays readable at phone widths. The extremes are left unlabelled —
	// a centred label at 0 % or 100 % would hang off the rail.
	const labelledStops = [8, 24, 48, 72];
</script>

<div
	class="border-dough-200 rounded-2xl border bg-white/60 p-4 dark:border-stone-700 dark:bg-stone-800/40"
>
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<span class="text-sm font-medium text-stone-700 dark:text-stone-200">
			{t.schedule.window_label}
		</span>
		<span class="font-display text-xl text-stone-900 dark:text-stone-100">
			{formatWindow(windowHours)}
		</span>
	</div>

	<div class="relative mt-3 h-6">
		<!-- Rail + the flour's tolerance zones behind the thumb. aria-hidden:
		     the range input below carries the accessible value and description. -->
		<div
			class="bg-dough-200 absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full dark:bg-stone-700"
			aria-hidden="true"
		>
			{#if zones?.room}
				<div
					class="bg-basil-300 dark:bg-basil-700 absolute inset-y-0"
					style="left:{windowAxisPercent(zones.room.min)}%;width:{windowAxisPercent(
						zones.room.max
					) - windowAxisPercent(zones.room.min)}%"
				></div>
			{/if}
			{#if zones?.cold}
				<div
					class="bg-basil-400 dark:bg-basil-600 absolute inset-y-0"
					style="left:{windowAxisPercent(zones.cold.min)}%;width:{windowAxisPercent(
						zones.cold.max
					) - windowAxisPercent(zones.cold.min)}%"
				></div>
			{/if}
			<!-- A notch per stop, so the snap points are visible even where the
			     rail carries no label. -->
			{#each WINDOW_STOPS as stop, i (stop)}
				{#if i > 0 && i < WINDOW_STOPS.length - 1}
					<div
						class="absolute inset-y-0 w-px bg-white/70 dark:bg-stone-900/50"
						style="left:{windowAxisPercent(stop)}%"
					></div>
				{/if}
			{/each}
		</div>

		<input
			type="range"
			min="0"
			max={WINDOW_STOPS.length - 1}
			step="1"
			value={sliderIndex}
			oninput={(e) => (state.fermentWindowHours = WINDOW_STOPS[e.currentTarget.valueAsNumber])}
			class="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent"
			aria-label={t.schedule.window_label}
			aria-valuetext={formatWindow(windowHours)}
		/>
	</div>

	<div class="relative mt-1 h-4" aria-hidden="true">
		{#each labelledStops as stop (stop)}
			<span
				class="absolute -translate-x-1/2 text-[0.65rem] text-stone-400 dark:text-stone-500"
				style="left:{windowAxisPercent(stop)}%">{formatWindow(stop)}</span
			>
		{/each}
	</div>

	<p class="mt-2 text-xs text-stone-500 dark:text-stone-400">
		{#if band}
			{inBand ? t.schedule.window_in_band : t.schedule.window_out_of_band}
			<span class="whitespace-nowrap">
				({formatBandEdge(band.min)} – {formatBandEdge(band.max)})
			</span>
		{:else if state.flourW !== null}
			{t.schedule.window_no_band}
		{:else}
			{t.schedule.window_no_flour}
		{/if}
	</p>
</div>

<style>
	/* The rail is drawn by the div behind the input, so the native track is
	   transparent and only the thumb is styled. Both vendor pseudo-elements
	   need the rule spelled out separately — a combined selector is dropped
	   wholesale by each engine that doesn't recognise the other half. */
	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		background: var(--color-tomato-500);
		border: 2px solid white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
		cursor: pointer;
	}
	input[type='range']::-moz-range-thumb {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		background: var(--color-tomato-500);
		border: 2px solid white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
		cursor: pointer;
	}
</style>
