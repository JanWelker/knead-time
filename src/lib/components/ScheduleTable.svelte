<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { formatDateTime, formatDuration, formatShortDate, formatTime } from '$lib/format';
	import { stepDescription, stepTitle } from '$lib/stepCopy';
	import { isActiveStep } from '$lib/dough/scheduleStatus';
	import type { ComputedSchedule, ScheduleStep } from '$lib/dough/types';

	let { schedule }: { schedule: ComputedSchedule } = $props();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);
	// Captured once per render — the schedule view isn't a live clock.
	// Refreshing the page recomputes which rows have moved into the past.
	const now = new Date();

	function endsAt(step: ScheduleStep): Date {
		return new Date(step.at.getTime() + step.durationMinutes * 60_000);
	}

	function isPast(step: ScheduleStep): boolean {
		return endsAt(step).getTime() < now.getTime();
	}
</script>

<table class="tabular w-full border-collapse text-left">
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
			<tr
				class="border-dough-200/70 border-b align-top last:border-0 dark:border-stone-700/70 {past
					? 'text-stone-400 opacity-60 dark:text-stone-500 print:text-stone-900 print:opacity-100 dark:print:text-stone-900'
					: ''}"
			>
				<td
					class="py-3 pr-3 font-medium {isReady && !past
						? 'text-tomato-700 dark:text-tomato-300'
						: 'text-stone-800 dark:text-stone-200'}"
				>
					<!-- Compact two-line date on phones; single line on >=sm and in print -->
					<span class="block whitespace-nowrap sm:hidden print:hidden">
						{formatShortDate(step.at, locale)}
					</span>
					<span class="block whitespace-nowrap sm:hidden print:hidden">
						{formatTime(step.at, locale)}
					</span>
					<span class="hidden whitespace-nowrap sm:inline print:inline">
						{formatDateTime(step.at, locale)}
					</span>
				</td>
				<td class="py-3 pr-3">
					<div
						class="flex items-baseline gap-2 font-medium {isReady && !past
							? 'text-tomato-700 dark:text-tomato-300'
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
					</div>
					<div class="text-xs text-stone-500 dark:text-stone-400 print:leading-tight">
						{stepDescription(step, t, schedule)}
					</div>
				</td>
				<td class="py-3 text-sm whitespace-nowrap text-stone-600 dark:text-stone-300">
					{#if step.durationMinutes > 0}
						{formatDuration(step.durationMinutes, locale)}
					{:else}
						—
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
