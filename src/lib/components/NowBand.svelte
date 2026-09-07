<script lang="ts">
	import { onMount } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { formatDateTime, formatDuration } from '$lib/format';
	import { interpolate } from '$lib/i18n/interpolate';
	import { stepTitle } from '$lib/stepCopy';
	import {
		nightBands,
		nowState,
		spanPercent,
		stepProgressPercent,
		timelineSegments,
		timelineSpan
	} from '$lib/timeline';
	import type { ComputedSchedule } from '$lib/dough/types';
	import ModeGauge from './ModeGauge.svelte';

	// The hero. Everything below it on the page is reference material; this is
	// the answer — what you should be doing, and how long is left. The data is
	// already in the computed schedule; nothing here calculates dough.
	let { schedule }: { schedule: ComputedSchedule } = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	// Same minute tick as the schedule table and the window card, so a tab left
	// open on the counter keeps telling the truth.
	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	const span = $derived(timelineSpan(schedule.steps));
	const segments = $derived(timelineSegments(schedule.steps, span));
	const nights = $derived(nightBands(span));
	// Named `where`, not `state`: a local binding called `state` makes Svelte read
	// the `$state` rune above as a store subscription.
	const where = $derived(nowState(schedule.steps, now));
	const playheadPct = $derived(spanPercent(now.getTime(), span));
	const inSpan = $derived(now.getTime() >= span.startMs && now.getTime() <= span.endMs);

	const live = $derived(where.phase === 'during');
	const stateWord = $derived(
		where.phase === 'during'
			? t.schedule.now
			: where.phase === 'before'
				? t.schedule.now_next
				: t.schedule.now_done
	);

	// The big figure. While a step runs it is the time to the next thing to do;
	// before the plan opens it is the wait; once the bake moment is past there is
	// no countdown left, so the moment itself takes the slot.
	const bigFigure = $derived(
		where.phase === 'during'
			? formatDuration(where.untilNextMin, locale)
			: where.phase === 'before'
				? formatDuration(where.startsInMin, locale)
				: formatDateTime(schedule.steps[schedule.steps.length - 1].at, locale)
	);
	const bigCaption = $derived(
		where.phase === 'during'
			? t.schedule.now_left
			: where.phase === 'before'
				? t.schedule.now_until_start
				: t.schedule.now_done_note
	);

	const progress = $derived(
		where.phase === 'during' ? stepProgressPercent(where.elapsedMin, where.untilNextMin) : 0
	);
</script>

<section class="now-band" aria-labelledby="now-heading">
	<h2 id="now-heading" class="sr-only">{t.schedule.now_region}</h2>

	<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
		<div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
			<span class="state-chip {live ? 'state-chip-live' : 'state-chip-idle'}">{stateWord}</span>
			<h3 class="font-display ink min-w-0 text-2xl leading-tight sm:text-3xl">
				{stepTitle(where.step, t)}
			</h3>
		</div>
		<ModeGauge mode={schedule.mode} />
	</div>

	<!-- The countdown and the progress of the step it belongs to, on one line:
	     the figure says how long, the track says how far. -->
	<div class="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
		<p class="min-w-0">
			<span class="num ink block text-4xl leading-none sm:text-5xl">{bigFigure}</span>
			<span class="ink-faint mt-1 block text-xs">{bigCaption}</span>
		</p>
		<div class="min-w-[10rem] flex-1">
			{#if where.phase === 'during'}
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--kt-line)]">
					<div
						class="h-full rounded-full bg-[var(--kt-accent-solid)]"
						style="width:{progress}%"
					></div>
				</div>
				<p class="ink-faint mt-1.5 text-xs">
					{interpolate(t.schedule.now_since, { when: formatDateTime(where.step.at, locale) })}
				</p>
			{:else}
				<p class="ink-faint text-xs">
					{interpolate(
						where.phase === 'before' ? t.schedule.now_starts_at : t.schedule.now_ready_at,
						{ when: formatDateTime(where.step.at, locale) }
					)}
				</p>
			{/if}
		</div>
	</div>

	<!-- The whole bake to scale. A 24 h fridge phase looks like a 24 h fridge
	     phase, the night hours it passes through are washed over, and the
	     playhead marks now. Not interactive: at 72 h a 15-minute step is two
	     pixels wide, so the step list below stays the thing you read. -->
	<div class="mt-5">
		<!-- The playhead is a sibling of the bar, not a child: the bar clips its
		     own contents so the segments keep its rounded corners, and a cap that
		     overhangs the top has to live outside that clip. -->
		<div class="relative">
			<div class="night-bar" role="img" aria-label={t.schedule.bar_label}>
				{#each segments as seg, i (seg.kind + (seg.preFermentType ?? '') + i)}
					<div
						class="night-seg {seg.cold ? 'night-seg-cold' : 'night-seg-warm'}"
						style="left:{seg.fromPct}%;width:{Math.max(seg.toPct - seg.fromPct, 0)}%"
					></div>
				{/each}
				{#each nights as band, i (i)}
					<div
						class="night-wash"
						style="left:{band.fromPct}%;width:{band.toPct - band.fromPct}%"
					></div>
				{/each}
			</div>
			{#if inSpan}
				<div class="playhead" style="left:{playheadPct}%"></div>
			{/if}
		</div>
		<div class="ink-faint mt-1.5 flex justify-between gap-3 text-[0.6875rem]">
			<span class="num">{formatDateTime(new Date(span.startMs), locale)}</span>
			<span class="num">{formatDateTime(new Date(span.endMs), locale)}</span>
		</div>
	</div>

	<!-- Colour alone must not carry the meaning of the bar (WCAG 1.4.1), and the
	     night wash needs a word for it in any case. -->
	<ul class="ink-faint mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem]">
		<li class="flex items-center gap-1.5">
			<span class="night-seg-warm inline-block size-2.5 rounded-[3px]" aria-hidden="true"></span>{t
				.schedule.bar_warm}
		</li>
		<li class="flex items-center gap-1.5">
			<span class="night-seg-cold inline-block size-2.5 rounded-[3px]" aria-hidden="true"></span>{t
				.schedule.bar_cold}
		</li>
		<li class="flex items-center gap-1.5">
			<span class="night-wash-swatch inline-block size-2.5 rounded-[3px]" aria-hidden="true"
			></span>{t.schedule.bar_night}
		</li>
	</ul>
</section>
