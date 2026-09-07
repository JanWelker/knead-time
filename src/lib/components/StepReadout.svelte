<script lang="ts">
	import { onMount } from 'svelte';
	import { isActiveStep } from '$lib/dough/scheduleStatus';
	import { stepQualityFlags, type StepQualityFlag } from '$lib/dough/quality';
	import { formatDuration, formatShortDate, formatTime } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { stepDescription, stepDetail, stepIngredients, stepTitle } from '$lib/stepCopy';
	import type { ComputedSchedule, ScheduleStep } from '$lib/dough/types';
	import type { ScheduleVerbosity } from '$lib/storedVerbosity';

	// The dial's readout: one step, said in full, beside the drawing rather
	// than under it. Every word here comes out of stepCopy.ts — the same
	// functions the plan list and the .ics export read — so the picture and
	// the prose cannot drift apart.
	let {
		step,
		schedule,
		verbosity
	}: {
		step: ScheduleStep;
		schedule: ComputedSchedule;
		verbosity: ScheduleVerbosity;
	} = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	const ingredients = $derived(stepIngredients(step, t, schedule));
	const flags = $derived(stepQualityFlags(step, schedule));
	const endsAt = $derived(new Date(step.at.getTime() + step.durationMinutes * 60_000));
	const current = $derived(step.at.getTime() <= now.getTime() && now.getTime() < endsAt.getTime());

	const FLAG_COPY: Record<StepQualityFlag, keyof typeof t.quality> = {
		night: 'flag_night',
		'cold-bulk-shifted': 'flag_cold_bulk_shifted',
		'cold-bulk-clamped-short': 'flag_cold_bulk_clamped_short',
		'cold-bulk-clamped-long': 'flag_cold_bulk_clamped_long',
		'preferment-clamped-short': 'flag_preferment_clamped_short',
		'preferment-clamped-long': 'flag_preferment_clamped_long'
	};
</script>

<div class="readout" aria-live="polite">
	<p class="text-ink-faint text-xs">
		{formatShortDate(step.at, locale)}
		{#if isActiveStep(step.kind)}
			· {t.schedule.icon_active}
		{/if}
	</p>
	<h3 class="font-display text-ink mt-0.5 text-2xl">{stepTitle(step, t)}</h3>

	<!-- The plain-text time, always. A dial you cannot read a time off is a
	     picture of a schedule rather than a schedule. -->
	<p class="text-ink mt-1 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
		<span class="font-semibold">{formatTime(step.at, locale)}</span>
		{#if step.durationMinutes > 0}
			<span class="text-ink-faint">–</span>
			<!-- A 25 h leg written "13:00 – 14:45" reads as an hour and three
			     quarters. When the end falls on another day, say which day. -->
			<span class="font-semibold">
				{#if endsAt.toDateString() !== step.at.toDateString()}
					<span class="text-ink-soft font-normal">{formatShortDate(endsAt, locale)}</span>
				{/if}
				{formatTime(endsAt, locale)}
			</span>
			<span class="text-ink-soft">
				({formatDuration(step.durationMinutes, locale)})
			</span>
		{/if}
		{#if current}
			<span
				class="bg-tomato-500 rounded px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wide text-white uppercase"
			>
				{t.schedule.now}
			</span>
		{/if}
	</p>

	{#if ingredients.length > 0}
		<ul class="border-rule-soft mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t pt-3">
			{#each ingredients as ing (ing.name)}
				<li class="contents">
					<span class="text-ink text-right text-sm font-semibold tabular-nums">{ing.amount}</span>
					<span class="text-ink-soft text-sm">{ing.name}</span>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="text-ink-soft mt-3 text-sm leading-relaxed">
		{stepDescription(step, t, schedule)}
	</p>

	{#if verbosity === 'descriptive'}
		<p class="border-rule text-ink-soft mt-3 border-l-2 pl-3 text-xs leading-relaxed italic">
			{stepDetail(step, t)}
		</p>
	{/if}

	{#if flags.length > 0}
		<p class="text-accent mt-3 text-xs">
			{t.quality.step_imperfect}
			{flags.map((flag) => t.quality[FLAG_COPY[flag]]).join(' ')}
		</p>
	{/if}

	<p class="text-ink-faint mt-3 text-xs">{t.dial.readout_hint}</p>
</div>
