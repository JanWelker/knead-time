<script lang="ts">
	import { onMount } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { formatDuration, formatShortDate, formatTime } from '$lib/format';
	import { stepDescription, stepDetail, stepIngredients, stepTitle } from '$lib/stepCopy';
	import { isActiveStep } from '$lib/dough/scheduleStatus';
	import { stepQualityFlags, type StepQualityFlag } from '$lib/dough/quality';
	import type { ComputedSchedule, ScheduleStep, ScheduleStepKind } from '$lib/dough/types';
	import type { SourceTiming } from '$lib/pizzerias/pizzerias';
	import type { ScheduleVerbosity } from '$lib/storedVerbosity';
	import { interpolate } from '$lib/i18n/interpolate';

	let {
		schedule,
		sourceTiming,
		verbosity = 'short'
	}: {
		schedule: ComputedSchedule;
		sourceTiming?: SourceTiming;
		verbosity?: ScheduleVerbosity;
	} = $props();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	// "Now" advances every minute so a long-open tab keeps surfacing past and
	// current steps as time progresses, instead of holding the mount value.
	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	// Fermentation phases — the rail leaving these nodes is the long wait, drawn
	// dashed so the eye reads "nothing to do here, time just passes".
	const WAIT_KINDS = new Set<ScheduleStepKind>([
		'preferment-mix',
		'bulk-room',
		'bulk-cold',
		'proof-cold',
		'final-proof'
	]);

	// Steps grouped into consecutive calendar days so a multi-day plan shows
	// each date once as a header instead of repeating it on every row.
	const days = $derived.by(() => {
		const out: { key: string; label: string; steps: ScheduleStep[] }[] = [];
		for (const step of schedule.steps) {
			const key = step.at.toDateString();
			const last = out.at(-1);
			if (last && last.key === key) last.steps.push(step);
			else out.push({ key, label: formatShortDate(step.at, locale), steps: [step] });
		}
		return out;
	});

	function isPast(step: ScheduleStep): boolean {
		return step.at.getTime() + step.durationMinutes * 60_000 < now.getTime();
	}

	// The one step happening right now: started, not yet finished. Drives the
	// "Now" pill and the pulsing node so a baker sees where they are at a glance.
	function isCurrent(step: ScheduleStep): boolean {
		const start = step.at.getTime();
		return start <= now.getTime() && now.getTime() < start + step.durationMinutes * 60_000;
	}

	// Format a duration range. Single-value ranges (min === max) collapse to
	// one number; ranges render as "4–5 h" using `duration_range` so locales
	// can localize the separator.
	function formatRange(minMinutes: number, maxMinutes: number): string {
		if (minMinutes === maxMinutes) return formatDuration(minMinutes, locale);
		return interpolate(t.schedule.duration_range, {
			low: formatDuration(minMinutes, locale),
			high: formatDuration(maxMinutes, locale)
		});
	}

	// ±15% of the midpoint absorbs rounding noise (Q10 quirks, night-window
	// nudges) so a computed duration that effectively matches the chef's
	// range doesn't get flagged as a deviation.
	const RANGE_TOLERANCE = 0.15;

	function outsideSourceRange(durationMinutes: number, min: number, max: number): boolean {
		const mid = (min + max) / 2;
		const pad = mid * RANGE_TOLERANCE;
		return durationMinutes < min - pad || durationMinutes > max + pad;
	}

	function flagLabel(flag: StepQualityFlag): string {
		switch (flag) {
			case 'night':
				return t.quality.flag_night;
			case 'cold-bulk-shifted':
				return t.quality.flag_cold_bulk_shifted;
			case 'cold-bulk-clamped-short':
				return t.quality.flag_cold_bulk_clamped_short;
			case 'cold-bulk-clamped-long':
				return t.quality.flag_cold_bulk_clamped_long;
			case 'preferment-clamped-short':
				return t.quality.flag_preferment_clamped_short;
			case 'preferment-clamped-long':
				return t.quality.flag_preferment_clamped_long;
		}
	}

	function flagTooltip(flags: StepQualityFlag[]): string {
		return flags.map(flagLabel).join(' ');
	}
</script>

<div class="text-stone-800 dark:text-stone-200">
	{#each days as day (day.key)}
		<div class="kt-day flex items-center gap-3 pt-6 pb-2 first:pt-0">
			<span class="text-xs font-bold tracking-[0.14em] text-stone-400 uppercase dark:text-stone-500"
				>{day.label}</span
			>
			<span class="bg-dough-200 h-px flex-1 dark:bg-stone-700/80"></span>
		</div>

		<ol class="tabular-nums">
			<!-- preFermentType disambiguates the two parallel pre-ferment mixes,
			     which can share a start time when both shrink to the wall budget. -->
			{#each day.steps as step, si (step.kind + (step.preFermentType ?? '') + '-' + step.at.getTime())}
				{@const isReady = step.kind === 'ready'}
				{@const active = isActiveStep(step.kind)}
				{@const past = isPast(step)}
				{@const current = isCurrent(step)}
				{@const wait = WAIT_KINDS.has(step.kind)}
				{@const flags = stepQualityFlags(step, schedule)}
				{@const ingredients = stepIngredients(step, t, schedule)}
				<li
					class="grid grid-cols-[1.5rem_4.25rem_minmax(0,1fr)] gap-x-2 sm:gap-x-3 {past
						? 'opacity-70'
						: ''}"
				>
					<!-- Rail: a vertical line threading every node within the day. -->
					<div class="relative">
						{#if si > 0}
							<span
								class="bg-dough-300 absolute top-0 left-1/2 h-2.5 w-px -translate-x-1/2 dark:bg-stone-700"
							></span>
						{/if}
						{#if si < day.steps.length - 1}
							<span
								class="absolute top-2.5 bottom-0 left-1/2 -translate-x-1/2 border-l {wait
									? 'border-dough-400/80 border-dashed dark:border-stone-600'
									: 'border-dough-300 border-solid dark:border-stone-700'}"
							></span>
						{/if}
						<span
							class="kt-node absolute top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-white dark:ring-stone-900 {current
								? 'kt-node-now'
								: ''} {isReady
								? 'bg-tomato-600 ring-tomato-500/25'
								: active
									? 'bg-tomato-500'
									: 'border-dough-400 border-2 bg-white dark:border-stone-500 dark:bg-stone-900'}"
							role="img"
							aria-label={isReady
								? stepTitle(step, t)
								: active
									? t.schedule.icon_active
									: t.schedule.icon_passive}
						></span>
					</div>

					<!-- Time -->
					<div
						class="text-sm leading-5 font-semibold whitespace-nowrap {current || (isReady && !past)
							? 'text-accent'
							: 'text-stone-600 dark:text-stone-300'}"
					>
						{formatTime(step.at, locale)}
					</div>

					<!-- Step -->
					<div class="pb-6">
						<div class="flex items-start justify-between gap-3">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<h3
									class="text-[0.9375rem] leading-5 font-semibold {current || (isReady && !past)
										? 'text-accent'
										: 'text-stone-900 dark:text-stone-100'}"
								>
									{stepTitle(step, t)}
								</h3>
								{#if current}
									<span
										class="bg-tomato-500 rounded px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wide text-white uppercase"
									>
										{t.schedule.now}
									</span>
								{/if}
								{#if flags.length > 0}
									<span
										class="text-accent inline-flex items-center"
										title="{t.quality.step_imperfect} {flagTooltip(flags)}"
										aria-label="{t.quality.step_imperfect} {flagTooltip(flags)}"
									>
										<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
											<path
												d="M6 1.2 L11 10.8 H1 Z"
												fill="none"
												stroke="currentColor"
												stroke-width="1.4"
												stroke-linejoin="round"
											/>
											<rect x="5.4" y="4.5" width="1.2" height="3.2" fill="currentColor" />
											<rect x="5.4" y="8.3" width="1.2" height="1.2" fill="currentColor" />
										</svg>
									</span>
								{/if}
							</div>
							{#if step.durationMinutes > 0}
								<span
									class="bg-dough-100 mt-px shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-stone-600 dark:bg-stone-800 dark:text-stone-300"
								>
									{formatDuration(step.durationMinutes, locale)}
								</span>
							{/if}
						</div>

						{#if ingredients.length > 0}
							<ul
								class="bg-dough-50 border-dough-100 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border px-3 py-2 dark:border-stone-700/60 dark:bg-stone-800/40"
							>
								{#each ingredients as ing (ing.name)}
									<li class="contents">
										<span
											class="text-right text-xs font-semibold text-stone-700 dark:text-stone-200"
										>
											{ing.amount}
										</span>
										<span class="text-xs text-stone-600 dark:text-stone-300">{ing.name}</span>
									</li>
								{/each}
							</ul>
						{/if}

						<p class="mt-2 text-sm leading-snug text-stone-600 dark:text-stone-300">
							{stepDescription(step, t, schedule)}
						</p>

						{#if verbosity === 'descriptive'}
							<p
								class="border-dough-300 mt-2 border-l-2 pl-2 text-xs leading-relaxed text-stone-600 italic dark:border-stone-600 dark:text-stone-300"
							>
								{stepDetail(step, t)}
							</p>
						{/if}

						{#if sourceTiming?.[step.kind] && step.durationMinutes > 0 && outsideSourceRange(step.durationMinutes, sourceTiming[step.kind]!.minMinutes, sourceTiming[step.kind]!.maxMinutes)}
							<div class="text-accent mt-1.5 text-xs font-medium">
								{interpolate(t.schedule.source_timing_label, {
									duration: formatRange(
										sourceTiming[step.kind]!.minMinutes,
										sourceTiming[step.kind]!.maxMinutes
									)
								})}
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{/each}
</div>

<style>
	/* A gentle halo on the current step's node — "you are here". */
	@keyframes kt-node-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(200, 64, 26, 0.4);
		}
		70% {
			box-shadow: 0 0 0 6px rgba(200, 64, 26, 0);
		}
	}
	.kt-node-now {
		animation: kt-node-pulse 2.4s ease-in-out infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.kt-node-now {
			animation: none;
		}
	}
</style>
