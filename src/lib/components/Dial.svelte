<script lang="ts">
	import { onMount } from 'svelte';
	import { flourZones } from '$lib/dough/flour';
	import { COLD_MODE_THRESHOLD_MIN } from '$lib/dough/schedule';
	import {
		nearestWindowStopIndex,
		idealWindowHours,
		reachableStopIndex,
		stopsWithIdeal
	} from '$lib/dough/windowPresets';
	import { buildDial, DIAL_VIEWBOX, pointerAngle, polar, stepKey, unwrapDelta } from '$lib/dial';
	import { formatDuration, formatShortDate, formatTime } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { stepTitle } from '$lib/stepCopy';
	import type { FormState } from '$lib/state.svelte';

	let {
		form,
		selected,
		onselect
	}: {
		form: FormState;
		selected: string | null;
		onselect: (key: string) => void;
	} = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	// Same minute tick as the schedule list: the hand has to move on a tab left
	// open on the counter, not hold the value it mounted with.
	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	const plan = $derived(buildDial(form.schedule.steps, now));

	// The window handle is the coil's tail, and it turns like a knob: one full
	// revolution of the face is one day of fermentation. The stops are the
	// slider's own, so the two controls can never land on different plans.
	const zones = $derived(
		form.flourW === null ? null : flourZones(form.flourW, COLD_MODE_THRESHOLD_MIN / 60)
	);
	const hoursUntilBake = $derived((form.readyBy.getTime() - now.getTime()) / 3_600_000);
	const stops = $derived(stopsWithIdeal(idealWindowHours(zones, hoursUntilBake)));
	const reachable = $derived(reachableStopIndex(hoursUntilBake, stops));
	const stopIndex = $derived(nearestWindowStopIndex(form.fermentWindowHours, stops));
	const formatWindow = (hours: number) => formatDuration(hours * 60, locale);

	let overrun = $state(false);
	$effect(() => {
		void form.readyBy;
		overrun = false;
	});

	function goToStop(index: number) {
		const allowed = Math.min(index, reachable);
		overrun = index > reachable;
		if (allowed < 0) return;
		form.setWindowHours(stops[allowed]);
	}

	let face: SVGSVGElement | null = $state(null);
	let dragAngle: number | null = $state(null);
	let dragHours = $state(0);

	function angleOf(event: PointerEvent): number | null {
		if (!face) return null;
		const box = face.getBoundingClientRect();
		return pointerAngle(box, event.clientX, event.clientY);
	}

	function startDrag(event: PointerEvent) {
		const angle = angleOf(event);
		if (angle === null) return;
		dragAngle = angle;
		dragHours = form.fermentWindowHours;
		(event.currentTarget as Element).setPointerCapture(event.pointerId);
	}

	function moveDrag(event: PointerEvent) {
		if (dragAngle === null) return;
		const angle = angleOf(event);
		if (angle === null) return;
		// Turning the tail back against the clock reaches further into the past,
		// which is what a longer window is. The unwrap is what stops a drag past
		// the top of the face from jumping a whole day in one frame.
		dragHours -= (unwrapDelta(dragAngle, angle) / 360) * 24;
		dragAngle = angle;
		goToStop(nearestWindowStopIndex(dragHours, stops));
	}

	function endDrag() {
		dragAngle = null;
	}

	function handleKeys(event: KeyboardEvent) {
		const moves: Record<string, number> = {
			ArrowRight: stopIndex + 1,
			ArrowUp: stopIndex + 1,
			ArrowLeft: stopIndex - 1,
			ArrowDown: stopIndex - 1,
			Home: 0,
			End: reachable
		};
		const next = moves[event.key];
		if (next === undefined) return;
		event.preventDefault();
		goToStop(Math.max(0, next));
	}

	// Roving tabindex: the whole dial is one stop on the way through the page,
	// and the arrow keys walk the plan from there.
	const keys = $derived(form.schedule.steps.map(stepKey));
	const activeKey = $derived(selected ?? keys[0]);

	function walk(event: KeyboardEvent, key: string) {
		const at = keys.indexOf(key);
		const to =
			event.key === 'ArrowRight' || event.key === 'ArrowDown'
				? at + 1
				: event.key === 'ArrowLeft' || event.key === 'ArrowUp'
					? at - 1
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? keys.length - 1
							: -1;
		if (to < 0 || to >= keys.length) return;
		event.preventDefault();
		onselect(keys[to]);
		(event.currentTarget as HTMLElement).parentElement
			?.querySelector<SVGGElement>(`[data-step="${CSS.escape(keys[to])}"]`)
			?.focus();
	}

	const readyStep = $derived(form.schedule.steps.at(-1)!);
	// A short stem pointing outward from the coil's end, so the ring on the tail
	// reads as something to take hold of rather than as one more bead.
	const grip = $derived.by(() => {
		const from = polar(plan.tail.r + 2.4, plan.tail.angle);
		const to = polar(plan.tail.r + 4, plan.tail.angle);
		return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
	});
</script>

<div class="instrument">
	<div class="relative mx-auto w-full max-w-[34rem]">
		<svg
			bind:this={face}
			viewBox="0 0 {DIAL_VIEWBOX} {DIAL_VIEWBOX}"
			class="block w-full"
			style="aspect-ratio:1"
		>
			<!-- The face. A disc, a rim and nothing else: everything that follows
			     has to read against it, so it carries no decoration of its own. -->
			<circle
				cx={plan.cx}
				cy={plan.cy}
				r="45.5"
				class="fill-face-deep/45 dark:fill-white/[0.045]"
			/>
			<circle
				cx={plan.cx}
				cy={plan.cy}
				r="45.5"
				fill="none"
				class="stroke-rule"
				stroke-width="0.4"
			/>
			<!-- The chapter ring: the hour track is bracketed on both sides, which
			     is what makes the face read as an instrument rather than a chart. -->
			<circle
				cx={plan.cx}
				cy={plan.cy}
				r="44.5"
				fill="none"
				class="stroke-rule"
				stroke-width="0.25"
			/>
			<circle
				cx={plan.cx}
				cy={plan.cy}
				r="41.5"
				fill="none"
				class="stroke-rule"
				stroke-width="0.25"
			/>

			<!-- Night, 22:00–08:00. Fixed on the face, because a moment's angle is
			     its time of day — so every coil passes through the same wedge and
			     the shape of a plan against it is readable at a glance. -->
			<path d={plan.night} class="fill-night opacity-[0.065] dark:fill-black dark:opacity-[0.45]" />

			<!-- The 24 hours, engraved. Only the quarters are named. -->
			{#each plan.hours as hour (hour.hour)}
				<line
					x1={hour.x1}
					y1={hour.y1}
					x2={hour.x2}
					y2={hour.y2}
					class="stroke-ink-faint"
					stroke-width={hour.major ? 0.55 : 0.3}
					opacity={hour.major ? 0.9 : 0.5}
				/>
				{#if hour.label}
					<text
						x={hour.labelX}
						y={hour.labelY}
						class="fill-ink-faint"
						font-size="3.1"
						text-anchor="middle"
						dominant-baseline="central"
						font-family="var(--font-sans)"
					>
						{hour.label}
					</text>
				{/if}
			{/each}

			<!-- The plan itself. One option per step: the coil is the control, and
			     the list below it is the same list in words. -->
			<g role="listbox" aria-label={t.dial.plan_label} tabindex="-1">
				{#each form.schedule.steps as step (stepKey(step))}
					{@const key = stepKey(step)}
					{@const strand = plan.strands.find((s) => s.key === key)}
					{@const action = plan.actions.find((a) => a.key === key)}
					{@const on = key === activeKey}
					<g
						role="option"
						data-step={key}
						aria-selected={on}
						tabindex={on ? 0 : -1}
						class="cursor-pointer outline-offset-0"
						aria-label={interpolate(t.dial.step_label, {
							title: stepTitle(step, t),
							time: formatTime(step.at, locale),
							date: formatShortDate(step.at, locale),
							duration: formatDuration(step.durationMinutes, locale)
						})}
						onclick={() => onselect(key)}
						onkeydown={(e) => walk(e, key)}
					>
						{#if strand}
							<!-- Hit area first, and invisible: a fifteen-minute step is
							     three degrees of face, which no finger can land on. -->
							<path
								d={strand.hitD}
								fill="none"
								stroke="transparent"
								stroke-width="7"
								stroke-linecap="round"
							/>
							{#if on}
								<!-- Selection is a caliper, not a highlighter: a wash of
								     accent over a 25 h leg repaints half the face pink and
								     stops the temperature colour meaning anything. -->
								<path
									d={strand.d}
									fill="none"
									class="stroke-tomato-500/18"
									stroke-width="4.4"
									stroke-linecap="round"
								/>
							{/if}
							{#if strand.bead}
								<circle
									cx={strand.middle.x}
									cy={strand.middle.y}
									r="1.25"
									class={strand.temperature === 'cold' ? 'fill-cold' : 'fill-warm'}
								/>
							{:else}
								<path
									d={strand.d}
									fill="none"
									class={strand.temperature === 'cold' ? 'stroke-cold' : 'stroke-warm'}
									stroke-width={strand.preFermentType ? 1.5 : 2.7}
									stroke-linecap="round"
									stroke-dasharray={strand.preFermentType ? '1.4 1.3' : undefined}
								/>
							{/if}
							{#if on}
								<!-- Caliper heads, on top of the coil: drawn under it they
								     were painted over by the very arc they measure. -->
								<circle cx={strand.start.x} cy={strand.start.y} r="0.85" class="fill-tomato-600" />
								<circle cx={strand.end.x} cy={strand.end.y} r="0.85" class="fill-tomato-600" />
							{/if}
						{/if}
						{#if action}
							<!-- A step the baker has to be present for: a radial mark
							     across the coil, the way a minute is marked on a watch. -->
							<line
								x1={action.x1}
								y1={action.y1}
								x2={action.x2}
								y2={action.y2}
								class="stroke-ink"
								stroke-width="0.9"
								stroke-linecap="round"
							/>
						{/if}
						{#if step.kind === 'ready'}
							<line
								x1={plan.bake.x}
								y1={plan.bake.y}
								x2={plan.bake.x + (plan.bake.x - plan.cx) * 0.14}
								y2={plan.bake.y + (plan.bake.y - plan.cy) * 0.14}
								class="stroke-tomato-500"
								stroke-width="1.4"
								stroke-linecap="round"
							/>
							<circle
								cx={plan.bake.x}
								cy={plan.bake.y}
								r={on ? 2.6 : 2.1}
								class="fill-tomato-500 stroke-face"
								stroke-width="0.9"
							/>
						{/if}
					</g>
				{/each}
			</g>

			<!-- Now. A clock hand first — it points somewhere even when the bake
			     has not started — with a bead where it crosses the dough. -->
			<line
				x1={plan.now.x1}
				y1={plan.now.y1}
				x2={plan.now.x2}
				y2={plan.now.y2}
				class="stroke-ink"
				stroke-width="0.5"
				opacity="0.45"
			/>
			{#if plan.now.point}
				<circle
					cx={plan.now.point.x}
					cy={plan.now.point.y}
					r="1.7"
					class="kt-now fill-tomato-600 stroke-face"
					stroke-width="0.8"
				/>
			{/if}

			<!-- The coil's tail: the handle that lengthens the window. It turns
			     like a knob, one revolution to the day, and the arrow keys move it
			     between exactly the stops the slider in the form offers. -->
			<g
				role="slider"
				tabindex="0"
				aria-label={t.dial.window_handle}
				aria-valuemin="0"
				aria-valuemax={Math.max(0, stops.length - 1)}
				aria-valuenow={stopIndex}
				aria-valuetext={formatWindow(form.fermentWindowHours)}
				class="cursor-grab touch-none"
				onpointerdown={startDrag}
				onpointermove={moveDrag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onkeydown={handleKeys}
			>
				<!-- On the coil's end, with a short stem pointing outward into the
				     gap between turns. Set inside the coil instead it landed on the
				     centre plate as soon as the plan ran to three coils. -->
				<circle cx={plan.tail.x} cy={plan.tail.y} r="4.5" fill="transparent" />
				<line
					x1={grip.x1}
					y1={grip.y1}
					x2={grip.x2}
					y2={grip.y2}
					class="stroke-ink"
					stroke-width="0.55"
					opacity="0.6"
				/>
				<circle
					cx={plan.tail.x}
					cy={plan.tail.y}
					r="2"
					class="fill-face stroke-ink"
					stroke-width="0.8"
				/>
			</g>

			<!-- The centre plate. The bake is the one moment the whole plan is
			     measured back from, so it sits at the axis the coil turns around,
			     in plain words — a dial nobody can read a time off is a picture. -->
			<text
				x={plan.cx}
				y="44"
				class="fill-ink-faint"
				font-size="2.7"
				text-anchor="middle"
				dominant-baseline="central"
				font-family="var(--font-sans)"
			>
				{t.form.readyBy}
			</text>
			<text
				x={plan.cx}
				y="51"
				class="fill-ink"
				font-size="6.4"
				text-anchor="middle"
				dominant-baseline="central"
				font-family="var(--font-display)"
			>
				{formatTime(readyStep.at, locale)}
			</text>
			<text
				x={plan.cx}
				y="57.6"
				class="fill-ink-soft"
				font-size="3"
				text-anchor="middle"
				dominant-baseline="central"
				font-family="var(--font-sans)"
			>
				{formatShortDate(readyStep.at, locale)}
			</text>
		</svg>
	</div>

	<!-- The window, in words, under the drawing. It belongs to the whole coil
	     rather than to any one step, and the centre of the face is already
	     spoken for by the moment everything is measured back from. -->
	<p class="text-ink-soft mt-1 text-center text-sm">
		{interpolate(t.dial.window_summary, { window: formatWindow(form.fermentWindowHours) })}
	</p>

	{#if overrun && reachable >= 0}
		<p class="notice notice-danger mt-3" role="alert">
			{interpolate(t.schedule.window_overrun, { max: formatWindow(stops[reachable]) })}
		</p>
	{/if}

	<!-- What the two colours mean. Hue is temperature on this dial and nothing
	     else, which is only useful if it is said once, near the drawing. -->
	<ul class="text-ink-soft mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
		<li class="flex items-center gap-1.5">
			<span class="legend-dot bg-warm" aria-hidden="true"></span>{t.dial.legend_warm}
		</li>
		<li class="flex items-center gap-1.5">
			<span class="legend-dot bg-cold" aria-hidden="true"></span>{t.dial.legend_cold}
		</li>
		<li class="flex items-center gap-1.5">
			<span class="legend-dot border-rule bg-night/15 border dark:bg-black/70" aria-hidden="true"
			></span>{t.dial.legend_night}
		</li>
		<li class="flex items-center gap-1.5">
			<span class="legend-dot bg-tomato-500 rounded-full" aria-hidden="true"></span>{t.schedule.now}
		</li>
	</ul>
</div>

<style>
	/* The same halo the schedule list puts on the step in progress. */
	@keyframes kt-now-pulse {
		0%,
		100% {
			r: 1.7;
			opacity: 1;
		}
		60% {
			r: 2.5;
			opacity: 0.75;
		}
	}
	.kt-now {
		animation: kt-now-pulse 2.4s ease-in-out infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.kt-now {
			animation: none;
		}
	}
	g[role='slider']:active {
		cursor: grabbing;
	}
</style>
