<script lang="ts">
	import { flourZones } from '$lib/dough/flour';
	import { COLD_MODE_THRESHOLD_MIN } from '$lib/dough/schedule';
	import {
		fermentationBenefitTier,
		nearestWindowStopIndex,
		reachableStopIndex,
		WINDOW_STOPS,
		windowAxisPercent
	} from '$lib/dough/windowPresets';
	import { formatDateTime, formatDuration, toDatePart } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { onMount } from 'svelte';
	import type { FormState } from '$lib/state.svelte';

	// Named `form`, not `state`: a local binding called `state` makes Svelte
	// read the `$state` rune below as a store subscription.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);

	// The slider moves between the canonical Neapolitan windows rather than
	// freely: its value IS a stop index, so dragging and the arrow keys both
	// land on a real plan, and every stop gets the same target size on a phone.
	// windowAxisPercent maps hours onto that same index rail, which is what
	// keeps the tolerance zones and tick labels aligned with the thumb.
	const zones = $derived(
		form.flourW === null ? null : flourZones(form.flourW, COLD_MODE_THRESHOLD_MIN / 60)
	);

	// Same minute tick as the schedule table, so an open tab notices when the
	// window slips into the past rather than holding its mount value.
	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	// Fires once the opening step is wholly behind us — the same test the table
	// used to grey steps with, so the card now states what the fade only hinted.
	// A step still running is not "missed", which also stops a freshly loaded
	// page from accusing the baker of being late the moment a minute passes.
	const startedAgoMin = $derived.by(() => {
		const first = form.schedule.steps[0];
		const ended = first.at.getTime() + first.durationMinutes * 60_000;
		if (ended >= now.getTime()) return null;
		return (now.getTime() - first.at.getTime()) / 60_000;
	});

	// Fermentation is measured back from "ready to bake", so the time still
	// left before it is a hard ceiling: a longer window would have had to start
	// before now. Stops past it are greyed and refused rather than offered as a
	// plan that is already lost.
	const hoursUntilBake = $derived((form.readyBy.getTime() - now.getTime()) / 3_600_000);
	const reachableIndex = $derived(reachableStopIndex(hoursUntilBake));
	// Grey starts at the true remaining time, not at the last reachable stop,
	// so the rail shows exactly where the deadline falls.
	const unreachableFromPct = $derived(windowAxisPercent(hoursUntilBake));

	// The bake flag is centred on the deadline, except near the ends where a
	// centred label would hang off the rail — there it pivots to sit inside,
	// with the arrow itself staying on the exact spot either way.
	const markerAnchor = $derived(
		unreachableFromPct < 12 ? 'start' : unreachableFromPct > 88 ? 'end' : 'center'
	);
	const markerShift = $derived(
		markerAnchor === 'start'
			? 'translateX(0)'
			: markerAnchor === 'end'
				? 'translateX(-100%)'
				: 'translateX(-50%)'
	);

	// A drag into the greyed stretch is refused, not obeyed — but a control
	// that silently springs back reads as broken, so remember the attempt and
	// say why. Cleared by the next drag that lands legally, and by a new bake
	// time, since the refusal was about that particular deadline.
	let overrun = $state(false);

	// The bake time is the anchor, so lengthening the window can only move the
	// start — and past a certain length that lands on a different day, which is
	// easy to miss when the readout is counting hours. Say so when the day
	// actually changes; a same-day shift is visible in the field just above.
	let startMovedDay = $state(false);

	$effect(() => {
		void form.readyBy;
		overrun = false;
		startMovedDay = false;
	});

	const windowHours = $derived(form.fermentWindowHours);
	// A window set from the date fields need not be on a stop; the thumb shows
	// the nearest one while the readout above keeps the true duration.
	const sliderIndex = $derived(nearestWindowStopIndex(windowHours));

	const band = $derived(
		form.schedule.mode === 'cold' ? (zones?.cold ?? null) : (zones?.room ?? null)
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

	// What the chosen window actually buys the dough. Keyed off the current
	// length, so it describes THIS plan rather than stating a general truth
	// next to a control the reader is dragging. Always shown: this card lives
	// in the form now, where every field carries its help text, and the
	// schedule's short/detailed toggle must not reach into the other column.
	const benefit = $derived(
		{
			short: t.schedule.window_benefit_short,
			medium: t.schedule.window_benefit_medium,
			long: t.schedule.window_benefit_long
		}[fermentationBenefitTier(windowHours)]
	);
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

	<!-- The bake time anchors everything here: the window is measured back from
	     it, and it is where the rail's greyed-out stretch begins. Reuses the
	     form's own label so the two can never word it differently. When the
	     deadline lands inside the rail it becomes a flag pointing at the spot;
	     with the bake days off there is nothing to point at, so it falls back
	     to a plain line. -->
	{#if unreachableFromPct < 100}
		<div class="relative mt-2 h-9" aria-hidden="true">
			<div
				class="absolute bottom-0 flex flex-col {markerAnchor === 'start'
					? 'items-start'
					: markerAnchor === 'end'
						? 'items-end'
						: 'items-center'}"
				style="left:{unreachableFromPct}%;transform:{markerShift}"
			>
				<span
					class="text-tomato-700 dark:text-tomato-300 text-[0.65rem] leading-tight font-semibold whitespace-nowrap"
				>
					{t.form.readyBy}
				</span>
				<span
					class="text-[0.65rem] leading-tight whitespace-nowrap text-stone-500 dark:text-stone-400"
				>
					{formatDateTime(form.readyBy, i18n.locale)}
				</span>
				<svg class="fill-tomato-500 mt-0.5" width="9" height="6" viewBox="0 0 10 6">
					<path d="M5 6 0 0h10z" />
				</svg>
			</div>
		</div>
	{:else}
		<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
			{t.form.readyBy}:
			<span class="font-medium text-stone-700 dark:text-stone-200">
				{formatDateTime(form.readyBy, i18n.locale)}
			</span>
		</p>
	{/if}

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
			<!-- Everything past the bake deadline, drawn over the zones and
			     notches so an unreachable stretch cannot look available. -->
			{#if unreachableFromPct < 100}
				<div
					class="absolute inset-y-0 right-0 bg-stone-300/85 dark:bg-stone-700/85"
					style="left:{unreachableFromPct}%"
				></div>
				<!-- The bake deadline itself: everything right of this line would
				     have had to start before now. Drawn last so it stays visible
				     on top of the grey. -->
				<div
					class="bg-tomato-500 absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-full"
					style="left:{unreachableFromPct}%"
				></div>
			{/if}
		</div>

		<input
			type="range"
			min="0"
			max={WINDOW_STOPS.length - 1}
			step="1"
			value={sliderIndex}
			disabled={reachableIndex < 0}
			oninput={(e) => {
				const wanted = e.currentTarget.valueAsNumber;
				const allowed = Math.min(wanted, reachableIndex);
				const dayBefore = toDatePart(form.startAt);
				overrun = wanted > reachableIndex;
				// Put the thumb back by hand. A refused drag usually leaves the
				// bound index unchanged, so Svelte re-renders nothing and the thumb
				// would sit out in the greyed stretch contradicting the readout.
				e.currentTarget.value = String(allowed);
				form.fermentWindowHours = WINDOW_STOPS[allowed];
				startMovedDay = toDatePart(form.startAt) !== dayBefore;
			}}
			class="absolute inset-0 w-full appearance-none bg-transparent disabled:cursor-not-allowed {reachableIndex <
			0
				? ''
				: 'cursor-pointer'}"
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
		{:else if form.flourW !== null}
			{t.schedule.window_no_band}
		{:else}
			{t.schedule.window_no_flour}
		{/if}
	</p>

	{#if overrun && reachableIndex >= 0}
		<p
			class="border-tomato-300 bg-tomato-50 text-tomato-800 dark:border-tomato-700 dark:bg-tomato-900/40 dark:text-tomato-200 mt-2 rounded-lg border px-3 py-2 text-sm"
			role="alert"
		>
			{interpolate(t.schedule.window_overrun, {
				max: formatWindow(WINDOW_STOPS[reachableIndex])
			})}
		</p>
	{/if}

	{#if startMovedDay}
		<p
			class="border-dough-300 bg-dough-100 text-dough-900 dark:border-dough-700 dark:bg-dough-900/40 dark:text-dough-100 mt-2 rounded-lg border px-3 py-2 text-sm"
			role="status"
		>
			{interpolate(t.schedule.window_start_moved, {
				start: formatDateTime(form.startAt, i18n.locale)
			})}
		</p>
	{/if}

	{#if reachableIndex >= 0 && band && sliderIndex >= reachableIndex && band.max > hoursUntilBake}
		<p class="mt-2 text-xs text-stone-500 dark:text-stone-400">
			{interpolate(t.schedule.window_capped_by_bake, {
				max: formatBandEdge(WINDOW_STOPS[reachableIndex]),
				band: formatBandEdge(band.max)
			})}
		</p>
	{/if}

	{#if startedAgoMin !== null}
		<p class="text-tomato-700 dark:text-tomato-300 mt-2 text-xs font-medium">
			{interpolate(t.schedule.window_started_ago, {
				ago: formatDuration(startedAgoMin, i18n.locale)
			})}
		</p>
	{/if}

	<p class="mt-2 text-xs text-stone-500 dark:text-stone-400">{benefit}</p>
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
