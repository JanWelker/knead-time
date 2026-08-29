<script lang="ts">
	import { flourZones } from '$lib/dough/flour';
	import { COLD_MODE_THRESHOLD_MIN } from '$lib/dough/schedule';
	import { formatDateTime, formatDuration } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';

	let { state }: { state: FormState } = $props();

	const t = $derived(i18n.t);

	// Track span. The floor is the shortest window the schedule calls feasible
	// (ROOM_MIN_TOTAL_MIN). The ceiling is set by where the schedule stops
	// using extra time: cold-bulk caps at COLD_BULK_CEIL_MIN (48 h), so the
	// longest window the app can still spend is ~54 h without a pre-ferment
	// and ~78 h with a 24 h one — past that every extra hour is just idle time
	// before the first step, and the schedule is identical. 80 h covers that
	// worst case and still leaves 8 h of headroom past the strongest flour's
	// 72 h band, so the "too long" warning stays reachable from the slider.
	const MIN_H = 3;
	const MAX_H = 80;
	// 15 min — the granularity the schedule itself works in.
	const STEP_H = 0.25;

	const pct = (h: number) => ((h - MIN_H) / (MAX_H - MIN_H)) * 100;
	// Zones are clipped to the track so a band running past the ceiling (a
	// 72 h cold tolerance is well inside it, but a hand-typed W 400 is not)
	// renders as "continues off the end" rather than overflowing the rail.
	const clampPct = (p: number) => Math.max(0, Math.min(100, p));

	const zones = $derived(
		state.flourW === null ? null : flourZones(state.flourW, COLD_MODE_THRESHOLD_MIN / 60)
	);

	const windowHours = $derived(state.fermentWindowHours);
	// The slider reflects the true window even when the date fields put it
	// outside the track, but the thumb itself has to stay on the rail.
	const sliderValue = $derived(Math.max(MIN_H, Math.min(MAX_H, windowHours)));

	const band = $derived(
		state.schedule.mode === 'cold' ? (zones?.cold ?? null) : (zones?.room ?? null)
	);
	const inBand = $derived(band !== null && windowHours >= band.min && windowHours <= band.max);

	// Reuse the schedule's own localised duration formatter — the window is a
	// duration like any other, and this keeps unit copy out of the component.
	const formatWindow = (hours: number) => formatDuration(hours * 60, i18n.locale);

	const ticks = [6, 12, 24, 48, 72];
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
					style="left:{clampPct(pct(zones.room.min))}%;width:{clampPct(pct(zones.room.max)) -
						clampPct(pct(zones.room.min))}%"
				></div>
			{/if}
			{#if zones?.cold}
				<div
					class="bg-basil-400 dark:bg-basil-600 absolute inset-y-0"
					style="left:{clampPct(pct(zones.cold.min))}%;width:{clampPct(pct(zones.cold.max)) -
						clampPct(pct(zones.cold.min))}%"
				></div>
			{/if}
		</div>

		<input
			type="range"
			min={MIN_H}
			max={MAX_H}
			step={STEP_H}
			value={sliderValue}
			oninput={(e) => (state.fermentWindowHours = e.currentTarget.valueAsNumber)}
			class="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent"
			aria-label={t.schedule.window_label}
			aria-valuetext={formatWindow(windowHours)}
		/>
	</div>

	<div class="relative mt-1 h-4" aria-hidden="true">
		{#each ticks as tick (tick)}
			<span
				class="absolute -translate-x-1/2 text-[0.65rem] text-stone-400 dark:text-stone-500"
				style="left:{pct(tick)}%">{formatWindow(tick)}</span
			>
		{/each}
	</div>

	<p class="mt-2 text-xs text-stone-500 dark:text-stone-400">
		{#if band}
			{inBand ? t.schedule.window_in_band : t.schedule.window_out_of_band}
			<span class="whitespace-nowrap">
				({formatWindow(band.min)} – {formatWindow(band.max)})
			</span>
		{:else if state.flourW !== null}
			{t.schedule.window_no_band}
		{:else}
			{t.schedule.window_no_flour}
		{/if}
	</p>
	<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
		{t.schedule.window_start_note}
		<span class="font-medium text-stone-700 dark:text-stone-200">
			{formatDateTime(state.startAt, i18n.locale)}
		</span>
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
