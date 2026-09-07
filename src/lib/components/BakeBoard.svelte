<script lang="ts">
	import { onMount } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { formatDuration, formatGrams, formatShortDate, formatTime } from '$lib/format';
	import { stepTitle } from '$lib/stepCopy';
	import type { ComputedSchedule } from '$lib/dough/types';
	import ModeBadge from './ModeBadge.svelte';

	// The answer, before the inputs. Everything here is read off the schedule the
	// form already produced — the board computes nothing about dough, only which
	// of the steps the clock is standing in.
	let {
		schedule,
		readyBy,
		windowHours
	}: { schedule: ComputedSchedule; readyBy: Date; windowHours: number } = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	// Same minute tick as the schedule and the window card, so a tab left open
	// on the counter keeps telling the truth about what is happening now.
	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	// Three states, in the order a baker meets them: a step is running, the next
	// one has not started yet, or the bake moment is behind us.
	const status = $derived.by(() => {
		const ms = now.getTime();
		for (const step of schedule.steps) {
			const start = step.at.getTime();
			const end = start + step.durationMinutes * 60_000;
			if (start <= ms && ms < end) {
				return { kind: 'current' as const, step, minutes: (end - ms) / 60_000 };
			}
			if (start > ms) {
				return { kind: 'next' as const, step, minutes: (start - ms) / 60_000 };
			}
		}
		return { kind: 'done' as const };
	});
</script>

<!-- The loudest surface on the page, and the only one with this shape: a slab
     lifted well clear of the ground. Everything below it is either an input or
     a detail of what it already says. -->
<section
	class="bg-surface overflow-hidden rounded-[1.75rem] border"
	style="border-color: var(--kt-edge); box-shadow: var(--kt-lift-2)"
	aria-label={t.form.readyBy}
>
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-5 sm:p-7">
		<div class="min-w-0">
			<p class="eyebrow">{t.form.readyBy}</p>
			<p class="text-ink-soft font-display mt-1 text-lg font-semibold">
				{formatShortDate(readyBy, locale)}
			</p>
			<!-- No unit, no label repeated underneath: the line above already
			     named it, so the number can simply be the number. -->
			<p class="figure text-accent mt-0.5">{formatTime(readyBy, locale)}</p>
		</div>
		<div class="shrink-0 sm:mt-1">
			<ModeBadge mode={schedule.mode} blurb={false} />
		</div>
	</div>

	<!-- What to do next, in one line. Deliberately not a live region: it
	     re-renders every minute, and a screen reader announcing the countdown
	     once a minute for as long as the tab is open would be unusable. -->
	<div
		class="border-hairline flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-5 py-3 sm:px-7"
		style="background: var(--kt-sunk)"
	>
		{#if status.kind === 'done'}
			<span class="chip chip-action">{t.hero.done}</span>
		{:else}
			<span class="chip {status.kind === 'current' ? 'chip-now' : 'chip-time'}">
				{status.kind === 'current' ? t.schedule.now : t.hero.next}
			</span>
			<span class="text-ink font-display text-base font-semibold">
				{stepTitle(status.step, t)}
			</span>
			<span class="text-ink-soft ml-auto text-sm font-medium tabular-nums">
				{interpolate(status.kind === 'current' ? t.hero.left : t.hero.starts_in, {
					t: formatDuration(status.minutes, locale)
				})}
			</span>
		{/if}
	</div>

	<!-- Three numbers that answer "what am I making". Wells rather than cards:
	     they are readouts pressed into the board, not things to click. -->
	<div class="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
		<div class="well px-3 py-3 text-center sm:px-4">
			<p class="stat-value">{schedule.pizzaCount}</p>
			<p class="stat-label">{t.form.pizzaCount}</p>
		</div>
		<div class="well px-3 py-3 text-center sm:px-4">
			<p class="stat-value">{formatGrams(schedule.ingredients.totalDough)}</p>
			<p class="stat-label">{t.ingredients.total}</p>
		</div>
		<div class="well px-3 py-3 text-center sm:px-4">
			<p class="stat-value">{formatDuration(windowHours * 60, locale)}</p>
			<p class="stat-label">{t.schedule.window_label}</p>
		</div>
	</div>
</section>
