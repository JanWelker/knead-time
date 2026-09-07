<script lang="ts">
	import { onMount } from 'svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { formatDuration, formatShortDate, formatTime } from '$lib/format';
	import { stepDescription, stepDetail, stepIngredients, stepTitle } from '$lib/stepCopy';
	import { isActiveStep } from '$lib/dough/scheduleStatus';
	import { isColdKind } from '$lib/timeline';
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
	// "Now" pill and the glowing node so a baker sees where they are at a glance.
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

<div class="ink">
	{#each days as day (day.key)}
		<!-- A heading, not a span: the date is what groups the steps under it, and
		     as plain text it left a multi-day plan looking like one flat run of
		     step titles to anything navigating by heading. `font-sans` is
		     load-bearing — app.css gives every h1-h3 the display face, which this
		     label has never used. -->
		<div class="flex items-center gap-3 pt-6 pb-3 first:pt-0">
			<h3 class="ink-faint font-sans text-xs font-semibold tracking-[0.08em]">
				{day.label}
			</h3>
			<span class="h-px flex-1 bg-[var(--kt-line)]"></span>
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
				{@const cold = isColdKind(step.kind)}
				{@const flags = stepQualityFlags(step, schedule)}
				{@const ingredients = stepIngredients(step, t, schedule)}
				<!-- Past steps are NOT dimmed: fading them read as a rendering glitch
				     rather than as information. The fermentation-window card says
				     outright when the schedule opens before now. `past` still mutes
				     the accent on an already-missed bake moment below. -->
				<li class="grid grid-cols-[1.25rem_4rem_minmax(0,1fr)] gap-x-2 sm:gap-x-4">
					<!-- Rail: a vertical line threading every node within the day. It
					     turns blue leaving a fridge step, so the eye can find the cold
					     stretch in the list the same way it finds it on the overview
					     bar above. -->
					<div class="relative">
						{#if si > 0}
							<span
								class="absolute top-0 left-1/2 h-2.5 w-px -translate-x-1/2 bg-[var(--kt-line-strong)]"
							></span>
						{/if}
						{#if si < day.steps.length - 1}
							<span
								class="absolute top-2.5 bottom-0 left-1/2 -translate-x-1/2 border-l {wait
									? 'border-dashed'
									: 'border-solid'} {cold ? 'kt-rail-cold' : 'kt-rail'}"
							></span>
						{/if}
						<span
							class="absolute top-1 left-1/2 size-3 -translate-x-1/2 rounded-full {current
								? 'kt-node-now'
								: ''} {isReady
								? 'kt-node-ready'
								: active
									? 'kt-node-active'
									: cold
										? 'kt-node-cold'
										: 'kt-node-idle'}"
							role="img"
							aria-label={isReady
								? stepTitle(step, t)
								: active
									? t.schedule.icon_active
									: t.schedule.icon_passive}
						></span>
					</div>

					<!-- Time. The instrument reading of the row: display face, lining
					     tabular figures, so a column of them scans straight down. -->
					<div
						class="num text-[0.9375rem] leading-5 font-semibold whitespace-nowrap {current ||
						(isReady && !past)
							? 'text-accent'
							: 'ink-soft'}"
					>
						{formatTime(step.at, locale)}
					</div>

					<!-- Step -->
					<div class="pb-7">
						<div class="flex items-start justify-between gap-3">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<!-- h4, under the day heading above. `font-display` is
								     load-bearing: as an h3 this inherited the display face from
								     app.css, and demoting the level alone would silently drop
								     it to sans. -->
								<h4
									class="font-display text-base leading-5 font-semibold {current ||
									(isReady && !past)
										? 'text-accent'
										: 'ink'}"
								>
									{stepTitle(step, t)}
								</h4>
								{#if current}
									<span class="state-chip state-chip-live">{t.schedule.now}</span>
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
								<span class="gauge mt-px shrink-0">
									{formatDuration(step.durationMinutes, locale)}
								</span>
							{/if}
						</div>

						{#if ingredients.length > 0}
							<ul
								class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-[var(--kt-line)] bg-[var(--kt-inset)] px-3 py-2"
							>
								{#each ingredients as ing (ing.name)}
									<li class="contents">
										<span class="num ink text-right text-xs font-semibold">{ing.amount}</span>
										<span class="ink-soft text-xs">{ing.name}</span>
									</li>
								{/each}
							</ul>
						{/if}

						<p class="ink-soft mt-2 text-sm leading-snug">
							{stepDescription(step, t, schedule)}
						</p>

						{#if verbosity === 'descriptive'}
							<p
								class="ink-faint mt-2 border-l-2 border-[var(--kt-line-strong)] pl-2.5 text-xs leading-relaxed"
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
	/* The rail and the nodes read the same surface tokens as everything else, but
	   as :global-free component CSS rather than utilities — a node is five
	   states of one shape, and spelling each out in a class attribute is how the
	   previous version ended up with a nested ternary per element. */
	.kt-rail {
		border-color: var(--kt-line-strong);
	}

	.kt-rail-cold {
		border-color: var(--kt-cold-band);
	}

	/* Baker-action step: solid, warm. This is where you do something. */
	.kt-node-active {
		background: var(--kt-accent-solid);
		box-shadow: 0 0 0 3px var(--kt-panel);
	}

	/* Waiting phase at room temperature: hollow, so a glance down the rail counts
	   the things that need hands. */
	.kt-node-idle {
		background: var(--kt-panel);
		border: 2px solid var(--kt-line-strong);
		box-shadow: 0 0 0 3px var(--kt-panel);
	}

	/* Waiting phase in the fridge. */
	.kt-node-cold {
		background: var(--kt-panel);
		border: 2px solid var(--kt-cold-band);
		box-shadow: 0 0 0 3px var(--kt-panel);
	}

	.kt-node-ready {
		background: var(--kt-accent-solid);
		box-shadow:
			0 0 0 3px var(--kt-panel),
			0 0 0 5px color-mix(in srgb, var(--kt-accent-solid) 35%, transparent);
	}

	/* The one emissive element in the list: you are here. Everything else on the
	   page is at rest, which is what makes this readable across a kitchen. */
	.kt-node-now {
		background: var(--kt-accent-solid);
		border: 0;
		animation: kt-node-pulse 2.6s ease-in-out infinite;
	}

	@keyframes kt-node-pulse {
		0%,
		100% {
			box-shadow:
				0 0 0 3px var(--kt-panel),
				0 0 0 4px rgb(242 118 42 / 0.55),
				0 0 14px 2px rgb(242 118 42 / 0.5);
		}
		60% {
			box-shadow:
				0 0 0 3px var(--kt-panel),
				0 0 0 8px rgb(242 118 42 / 0),
				0 0 14px 2px rgb(242 118 42 / 0.2);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.kt-node-now {
			animation: none;
			box-shadow:
				0 0 0 3px var(--kt-panel),
				0 0 0 4px rgb(242 118 42 / 0.55);
		}
	}
</style>
