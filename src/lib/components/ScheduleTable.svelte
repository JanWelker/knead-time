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
		<!-- The dateline. A heading, not a span: the date is what groups the steps
		     under it, and as plain text a multi-day plan read as one flat run of
		     step titles to anything navigating by heading. Set as a chapter opener
		     — capitals on a heavy rule — because on a cold ferment the day change
		     is the single most important thing on the page. `.eyebrow` is
		     load-bearing here: app.css gives every h1-h3 the display serif, and
		     the tracking and caps come from the class, not from the level. -->
		<div class="border-ink mt-10 border-t-2 pt-2.5 pb-5 first:mt-0">
			<h3 class="eyebrow text-ink figure">{day.label}</h3>
		</div>

		<ol>
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
				<li
					class="grid grid-cols-[4.25rem_0.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[5rem_1rem_minmax(0,1fr)] sm:gap-x-4"
				>
					<!-- The time is the step's mark. A schedule is anchored in moments,
					     so the moment is what numbers the sequence — set in the display
					     face, in the margin, the way a printed timetable sets it. -->
					<div
						class="figure font-display pt-px text-right text-[0.95rem] leading-6 font-medium tracking-tight {current ||
						(isReady && !past)
							? 'text-rubric'
							: 'text-ink'}"
					>
						{formatTime(step.at, locale)}
					</div>

					<!-- Rail: a hairline threading every node within the day. The node
					     is a square rather than a dot — a quad of type, not a UI bullet
					     — filled for a step you do and hollow for a phase you wait out. -->
					<div class="relative">
						{#if si > 0}
							<span class="bg-rule absolute top-0 left-1/2 h-2 w-px -translate-x-1/2"></span>
						{/if}
						{#if si < day.steps.length - 1}
							<span
								class="absolute top-2 bottom-0 left-1/2 -translate-x-1/2 border-l {wait
									? 'border-rule-strong border-dashed'
									: 'border-rule-strong border-solid'}"
							></span>
						{/if}
						<span
							class="absolute top-1.5 left-1/2 size-[7px] -translate-x-1/2 {current
								? 'kt-node-now'
								: ''} {isReady
								? 'bg-rubric'
								: active
									? 'bg-ink'
									: 'border-rule-strong bg-paper border'}"
							role="img"
							aria-label={isReady
								? stepTitle(step, t)
								: active
									? t.schedule.icon_active
									: t.schedule.icon_passive}
						></span>
					</div>

					<!-- Step -->
					<div class="pb-8">
						<div class="flex items-baseline justify-between gap-3">
							<div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
								<!-- h4, under the h3 dateline above. The display face is
								     load-bearing: as an h3 this inherited it from app.css,
								     and demoting the level alone would silently drop it. -->
								<h4
									class="font-display text-[1.0625rem] leading-6 font-semibold {current ||
									(isReady && !past)
										? 'text-rubric'
										: 'text-ink'}"
								>
									{stepTitle(step, t)}
								</h4>
								{#if current}
									<span class="stamp">{t.schedule.now}</span>
								{/if}
								{#if flags.length > 0}
									<span
										class="text-rubric inline-flex items-center"
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
								<span class="eyebrow figure shrink-0 whitespace-nowrap">
									{formatDuration(step.durationMinutes, locale)}
								</span>
							{/if}
						</div>

						{#if ingredients.length > 0}
							<!-- What this step newly puts on the scale, set as an
							     ingredient column: the name left, the weight hard right in
							     tabular figures, a dotted leader crossing the gap. Ruled
							     off top and bottom rather than boxed. -->
							<ul class="border-rule mt-3 max-w-[22rem] space-y-1 border-y py-2">
								{#each ingredients as ing (ing.name)}
									<li class="flex items-baseline gap-2 text-[0.8125rem]">
										<span class="text-ink">{ing.name}</span>
										<span class="ing-leader" aria-hidden="true"></span>
										<span class="figure text-ink shrink-0 font-semibold">{ing.amount}</span>
									</li>
								{/each}
							</ul>
						{/if}

						<p class="measure text-ink mt-3 text-[0.9375rem] leading-relaxed">
							{stepDescription(step, t, schedule)}
						</p>

						{#if verbosity === 'descriptive'}
							<p class="annotation measure mt-3">{stepDetail(step, t)}</p>
						{/if}

						{#if sourceTiming?.[step.kind] && step.durationMinutes > 0 && outsideSourceRange(step.durationMinutes, sourceTiming[step.kind]!.minMinutes, sourceTiming[step.kind]!.maxMinutes)}
							<div class="text-rubric figure mt-2 text-xs">
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
	/* A gentle halo on the current step's node — "you are here". Drawn in the
	   rubric so it reads as the same ink as the step title beside it. */
	@keyframes kt-node-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgb(160 47 26 / 0.45);
		}
		70% {
			box-shadow: 0 0 0 6px rgb(160 47 26 / 0);
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
