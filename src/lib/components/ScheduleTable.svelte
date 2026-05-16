<script lang="ts">
	import { onMount } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { formatDateTime, formatDuration, formatShortDate, formatTime } from '$lib/format';
	import { stepDescription, stepTitle } from '$lib/stepCopy';
	import { isActiveStep } from '$lib/dough/scheduleStatus';
	import { stepQualityFlags, type StepQualityFlag } from '$lib/dough/quality';
	import type { ComputedSchedule, ScheduleStep } from '$lib/dough/types';
	import type { SourceTiming } from '$lib/pizzerias/pizzerias';
	import { interpolate } from '$lib/i18n/interpolate';

	let { schedule, sourceTiming }: { schedule: ComputedSchedule; sourceTiming?: SourceTiming } =
		$props();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	// "Now" advances every minute so a long-open tab keeps surfacing past
	// steps as time progresses, instead of holding the value at mount time.
	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

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

	function isPast(step: ScheduleStep): boolean {
		return step.at.getTime() + step.durationMinutes * 60_000 < now.getTime();
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

<table class="w-full border-collapse text-left tabular-nums">
	<thead>
		<tr
			class="border-dough-300 border-b text-xs tracking-wider text-stone-500 uppercase dark:border-stone-700 dark:text-stone-400"
		>
			<th class="py-2 pr-3 font-semibold">{t.schedule.col_when}</th>
			<th class="py-2 pr-3 font-semibold">{t.schedule.col_step}</th>
			<th class="py-2 font-semibold">{t.schedule.col_duration}</th>
		</tr>
	</thead>
	<tbody>
		{#each schedule.steps as step (step.kind + '-' + step.at.getTime())}
			{@const isReady = step.kind === 'ready'}
			{@const active = isActiveStep(step.kind)}
			{@const past = isPast(step)}
			{@const flags = stepQualityFlags(step, schedule)}
			<tr
				class="row-divider align-top {past ? 'text-stone-400 opacity-60 dark:text-stone-500' : ''}"
			>
				<td
					class="py-3 pr-3 font-medium {isReady && !past
						? 'text-accent'
						: 'text-stone-800 dark:text-stone-200'}"
				>
					<!-- Compact two-line date on phones; single line on >=sm -->
					<span class="block whitespace-nowrap sm:hidden">{formatShortDate(step.at, locale)}</span>
					<span class="block whitespace-nowrap sm:hidden">{formatTime(step.at, locale)}</span>
					<span class="hidden whitespace-nowrap sm:inline">{formatDateTime(step.at, locale)}</span>
				</td>
				<td class="py-3 pr-3">
					<div
						class="flex items-baseline gap-2 font-medium {isReady && !past
							? 'text-accent'
							: 'text-stone-900 dark:text-stone-100'}"
					>
						{#if !isReady}
							<svg
								width="10"
								height="10"
								viewBox="0 0 10 10"
								aria-label={active ? t.schedule.icon_active : t.schedule.icon_passive}
								role="img"
								class="shrink-0 self-center"
							>
								{#if active}
									<circle cx="5" cy="5" r="4" fill="currentColor" />
								{:else}
									<circle
										cx="5"
										cy="5"
										r="3.5"
										fill="none"
										stroke="currentColor"
										stroke-width="1.25"
									/>
								{/if}
							</svg>
						{/if}
						<span>{stepTitle(step, t)}</span>
						{#if flags.length > 0}
							<span
								class="text-accent inline-flex items-center"
								title="{t.quality.step_imperfect} {flagTooltip(flags)}"
								aria-label="{t.quality.step_imperfect} {flagTooltip(flags)}"
							>
								<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" class="shrink-0">
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
					<div class="text-xs text-stone-500 dark:text-stone-400">
						{stepDescription(step, t, schedule)}
					</div>
				</td>
				<td class="py-3 text-sm whitespace-nowrap text-stone-600 dark:text-stone-300">
					{#if step.durationMinutes > 0}
						{formatDuration(step.durationMinutes, locale)}
					{:else}
						—
					{/if}
					{#if sourceTiming?.[step.kind] && step.durationMinutes > 0 && outsideSourceRange(step.durationMinutes, sourceTiming[step.kind]!.minMinutes, sourceTiming[step.kind]!.maxMinutes)}
						<div class="text-accent mt-1 text-xs font-medium">
							{interpolate(t.schedule.source_timing_label, {
								duration: formatRange(
									sourceTiming[step.kind]!.minMinutes,
									sourceTiming[step.kind]!.maxMinutes
								)
							})}
						</div>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
