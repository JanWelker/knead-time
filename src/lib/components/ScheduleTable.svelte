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
		// The flour+water autolyse is a passive rest — dashed rail, hollow node.
		'autolyse',
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
	// "Now" stamp and the pulsing ticket number so a baker sees where they are
	// at a glance.
	function isCurrent(step: ScheduleStep): boolean {
		const start = step.at.getTime();
		return start <= now.getTime() && now.getTime() < start + step.durationMinutes * 60_000;
	}

	// The ticket's line numbers run across the whole plan rather than per day: a
	// schedule is one sequence of steps that happens to cross midnight, and
	// restarting at 01 under every date band would say otherwise. Two digits, so
	// the column never reflows when a biga + poolish plan reaches step 10.
	function stepNumber(step: ScheduleStep): string {
		return String(schedule.steps.indexOf(step) + 1).padStart(2, '0');
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

	// Same shape as Warnings.svelte and FitScore: a Record keeps the
	// exhaustiveness check — a new flag fails to compile until it has copy.
	const FLAG_COPY: Record<StepQualityFlag, keyof typeof t.quality> = {
		night: 'flag_night',
		'cold-bulk-shifted': 'flag_cold_bulk_shifted',
		'cold-bulk-clamped-short': 'flag_cold_bulk_clamped_short',
		'cold-bulk-clamped-long': 'flag_cold_bulk_clamped_long',
		'preferment-clamped-short': 'flag_preferment_clamped_short',
		'preferment-clamped-long': 'flag_preferment_clamped_long'
	};

	function flagTooltip(flags: StepQualityFlag[]): string {
		return flags.map((flag) => t.quality[FLAG_COPY[flag]]).join(' ');
	}
</script>

<div class="text-ink">
	{#each days as day (day.key)}
		<!-- The day divider is a band, not a label: full-bleed out of the card's
		     padding, with the date reversed out of the ink the way a job ticket
		     separates one shift from the next.

		     A heading, not a span: the date is what groups the steps under it, and
		     as plain text it left a multi-day plan looking like one flat run of
		     step titles to anything navigating by heading. `font-sans` is
		     load-bearing — app.css gives every h1-h3 the display face, which this
		     label has never used. -->
		<div class="bg-rule -mx-5 mt-7 mb-4 px-5 py-1.5 first:mt-0 sm:-mx-6 sm:px-6">
			<h3 class="text-paper font-sans text-xs font-bold tracking-[0.14em] uppercase">
				{day.label}
			</h3>
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
				<!-- Past steps are NOT dimmed: fading them read as a rendering glitch
				     rather than as information. The fermentation-window card says
				     outright when the schedule opens before now. `past` still mutes
				     the accent on an already-missed bake moment below. -->
				<li class="grid grid-cols-[1.75rem_4.25rem_minmax(0,1fr)] gap-x-2 sm:gap-x-3">
					<!-- Rail: on a ticket the line number IS the node. A filled square is
					     something the baker does, a hollow one is time passing, and the
					     rule between two of them goes dashed while nothing happens. -->
					<div class="relative">
						{#if si > 0}
							<span class="bg-rule absolute top-0 left-1/2 h-2 w-0.5 -translate-x-1/2"></span>
						{/if}
						{#if si < day.steps.length - 1}
							<span
								class="border-rule absolute top-2 bottom-0 left-1/2 -translate-x-1/2 border-l-2 {wait
									? 'border-dashed'
									: 'border-solid'}"
							></span>
						{/if}
						<span
							class="border-rule absolute top-2 left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-[2px] border-2 text-[0.7rem] leading-none font-bold tabular-nums {current
								? 'kt-node-now'
								: ''} {isReady
								? 'bg-accent text-on-accent'
								: active
									? 'bg-rule text-paper'
									: 'bg-sheet text-ink'}"
							role="img"
							aria-label={isReady
								? stepTitle(step, t)
								: active
									? t.schedule.icon_active
									: t.schedule.icon_passive}
						>
							{stepNumber(step)}
						</span>
					</div>

					<!-- Time: the departures-board column, set in the display face so it
					     can be read from across the kitchen. -->
					<div
						class="font-display pt-2 text-base leading-none tabular-nums sm:text-lg {current ||
						(isReady && !past)
							? 'text-accent-ink'
							: 'text-ink'}"
					>
						{formatTime(step.at, locale)}
					</div>

					<!-- Step. The hard rule down its left edge is the ticket's column
					     divider; it runs the full height of every row. -->
					<div class="border-rule border-l-2 pt-1 pb-7 pl-3">
						<div class="flex items-start justify-between gap-3">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<!-- h4, under the day heading above. `font-display` is
								     load-bearing: as an h3 this inherited the display face from
								     app.css, and demoting the level alone would silently drop
								     it to the workhorse. -->
								<h4
									class="font-display text-base leading-tight uppercase {current ||
									(isReady && !past)
										? 'text-accent-ink'
										: 'text-ink'}"
								>
									{stepTitle(step, t)}
								</h4>
								{#if current}
									<span class="stamp">{t.schedule.now}</span>
								{/if}
								{#if flags.length > 0}
									<span
										class="text-accent-ink inline-flex items-center"
										title="{t.quality.step_imperfect} {flagTooltip(flags)}"
										aria-label="{t.quality.step_imperfect} {flagTooltip(flags)}"
									>
										<svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true">
											<path
												d="M6 1.2 L11 10.8 H1 Z"
												fill="none"
												stroke="currentColor"
												stroke-width="1.6"
												stroke-linejoin="round"
											/>
											<rect x="5.4" y="4.5" width="1.2" height="3.2" fill="currentColor" />
											<rect x="5.4" y="8.3" width="1.2" height="1.2" fill="currentColor" />
										</svg>
									</span>
								{/if}
							</div>
							{#if step.durationMinutes > 0}
								<span class="chip mt-0.5 shrink-0 whitespace-nowrap">
									{formatDuration(step.durationMinutes, locale)}
								</span>
							{/if}
						</div>

						{#if ingredients.length > 0}
							<ul
								class="border-rule bg-paper mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-[2px] border-2 px-3 py-2"
							>
								{#each ingredients as ing (ing.name)}
									<li class="contents">
										<span class="text-ink text-right text-xs font-bold tabular-nums">
											{ing.amount}
										</span>
										<span class="text-ink-soft text-xs">{ing.name}</span>
									</li>
								{/each}
							</ul>
						{/if}

						<p class="text-ink-soft mt-2 text-sm leading-snug">
							{stepDescription(step, t, schedule)}
						</p>

						{#if verbosity === 'descriptive'}
							<p
								class="border-ink-faint text-ink-soft mt-2 border-l-2 pl-2 text-xs leading-relaxed"
							>
								{stepDetail(step, t)}
							</p>
						{/if}

						{#if sourceTiming?.[step.kind] && step.durationMinutes > 0 && outsideSourceRange(step.durationMinutes, sourceTiming[step.kind]!.minMinutes, sourceTiming[step.kind]!.maxMinutes)}
							<div class="text-accent-ink mt-1.5 text-xs font-semibold">
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
	/* A halo on the current step's ticket number — "you are here". Square, like
	   everything else on this sheet, and printed in the same red as the NOW
	   stamp beside it. */
	@keyframes kt-node-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 var(--kt-accent);
		}
		70% {
			box-shadow: 0 0 0 5px transparent;
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
