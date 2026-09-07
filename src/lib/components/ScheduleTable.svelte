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
	import StepGlyph from './StepGlyph.svelte';

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

<div class="text-ink-soft">
	{#each days as day (day.key)}
		<!-- A heading, not a span: the date is what groups the steps under it, and
		     as plain text it left a multi-day plan looking like one flat run of
		     step titles to anything navigating by heading. `font-sans` is
		     load-bearing — app.css gives every h1-h3 the display face, which
		     this label has never used. -->
		<div class="flex items-center gap-3 pt-7 pb-3 first:pt-0">
			<h3 class="text-ink-faint font-sans text-xs font-bold tracking-[0.14em]">
				{day.label}
			</h3>
			<span class="bg-hairline h-px flex-1"></span>
		</div>

		<ol class="space-y-2 tabular-nums">
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
				<li class="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
					<!-- Rail: a vertical line threading every node within the day. -->
					<div class="relative">
						{#if si > 0}
							<span class="bg-hairline absolute top-0 left-1/2 h-3 w-px -translate-x-1/2"></span>
						{/if}
						{#if si < day.steps.length - 1}
							<span
								class="border-hairline absolute top-8 bottom-0 left-1/2 -translate-x-1/2 border-l {wait
									? 'border-dashed'
									: 'border-solid'}"
							></span>
						{/if}
						<!-- The node carries the glyph AND the active/passive meaning:
						     a filled tomato disc for something to do, a hollow basil
						     ring for time passing on its own. -->
						<span
							class="absolute top-3 left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-full {current
								? 'kt-node-now'
								: ''} {isReady
								? 'bg-tomato-600 text-white'
								: active
									? 'bg-tomato-500 text-white'
									: 'border-basil-300 text-leaf dark:border-basil-700 border-2 bg-transparent'}"
							role="img"
							aria-label={isReady
								? stepTitle(step, t)
								: active
									? t.schedule.icon_active
									: t.schedule.icon_passive}
						>
							<span class="size-4"><StepGlyph kind={step.kind} /></span>
						</span>
					</div>

					<!-- The step itself, as a card in the feed. Raised for the one
					     step that is running, flat for the rest. -->
					<div class="kt-step {current ? 'kt-step-now' : ''} min-w-0 rounded-2xl px-3 py-2.5">
						<div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
							<span
								class="font-display text-base leading-6 font-semibold tabular-nums {current ||
								(isReady && !past)
									? 'text-accent'
									: 'text-ink-soft'}"
							>
								{formatTime(step.at, locale)}
							</span>
							<!-- h4, under the day heading above. `font-display` is
							     load-bearing: as an h3 this inherited the display face from
							     app.css, and demoting the level alone would silently
							     drop it to sans. -->
							<h4
								class="font-display min-w-0 text-base leading-6 font-semibold {current ||
								(isReady && !past)
									? 'text-accent'
									: 'text-ink'}"
							>
								{stepTitle(step, t)}
							</h4>
							{#if current}
								<span class="chip chip-now">{t.schedule.now}</span>
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
							{#if step.durationMinutes > 0}
								<span class="chip ml-auto">
									{formatDuration(step.durationMinutes, locale)}
								</span>
							{/if}
						</div>

						{#if ingredients.length > 0}
							<ul class="well mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2">
								{#each ingredients as ing (ing.name)}
									<li class="contents">
										<span class="text-ink text-right text-xs font-semibold tabular-nums">
											{ing.amount}
										</span>
										<span class="text-ink-soft text-xs">{ing.name}</span>
									</li>
								{/each}
							</ul>
						{/if}

						<p class="text-ink-soft mt-1.5 text-sm leading-snug">
							{stepDescription(step, t, schedule)}
						</p>

						{#if verbosity === 'descriptive'}
							<p
								class="border-basil-300 text-ink-faint dark:border-basil-800 mt-2 border-l-2 pl-2.5 text-xs leading-relaxed italic"
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
	/* A step reads as a card, but a very quiet one: nine identical raised boxes
	   would be the card soup this redesign exists to undo. Only the running
	   step lifts out of the feed. */
	.kt-step {
		transition: background-color 200ms ease;
	}

	.kt-step-now {
		background: var(--kt-now);
		box-shadow: var(--kt-lift-1);
	}

	/* A gentle halo on the current step's node — "you are here". */
	@keyframes kt-node-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(200, 64, 26, 0.4);
		}
		70% {
			box-shadow: 0 0 0 8px rgba(200, 64, 26, 0);
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
