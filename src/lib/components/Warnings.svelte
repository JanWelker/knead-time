<script lang="ts">
	import { i18n } from '#lib/i18n/i18n.svelte.js';
	import type { ScheduleWarning } from '#lib/dough/types.js';
	import { warningsFor, type WarningSlot } from '#lib/warningSlots.js';

	// Each mount point renders only its own warnings — see warningSlots.ts.
	//
	// `strip` is the plan's bake box: each warning is a dashed-off strip along
	// the box's foot with a stamp naming it and a link to the field that fixes
	// it, so the warning reads as part of the moment it is about rather than as
	// a banner floating between the header and the cards. `onfix` opens the
	// sheet on that field; without it the strip carries no link.
	let {
		warnings,
		place,
		variant = 'list',
		onfix
	}: {
		warnings: ScheduleWarning[];
		place: WarningSlot;
		variant?: 'list' | 'strip';
		onfix?: (field: string) => void;
	} = $props();
	const t = $derived(i18n.t);
	const shown = $derived(warningsFor(place, warnings));

	const COPY: Record<ScheduleWarning, keyof typeof t.warnings> = {
		'too-short': 'too_short',
		'too-cold': 'too_cold',
		'too-warm': 'too_warm',
		'yeast-tiny': 'yeast_tiny',
		'yeast-large': 'yeast_large',
		'night-step': 'night_step',
		'flour-window-short': 'flour_window_short',
		'flour-window-long': 'flour_window_long'
	};

	const STAMP: Record<ScheduleWarning, keyof typeof t.warnings> = {
		'too-short': 'stamp_too_short',
		'too-cold': 'stamp_too_cold',
		'too-warm': 'stamp_too_warm',
		'yeast-tiny': 'severity_info',
		'yeast-large': 'severity_info',
		'night-step': 'stamp_night_step',
		'flour-window-short': 'stamp_flour_window_short',
		'flour-window-long': 'stamp_flour_window_long'
	};

	// The field each warning is answered by. The yeast pair is never on the
	// strip (it reads beside the weights), so it has no fix of its own.
	const FIX: Record<ScheduleWarning, { field: string; label: keyof typeof t.warnings } | null> = {
		'too-short': { field: 'field-readyBy', label: 'fix_ready_by' },
		'night-step': { field: 'field-readyBy', label: 'fix_ready_by' },
		'flour-window-long': { field: 'field-window', label: 'fix_window' },
		'flour-window-short': { field: 'field-window', label: 'fix_window' },
		'too-cold': { field: 'field-roomTemp', label: 'fix_room_temp' },
		'too-warm': { field: 'field-roomTemp', label: 'fix_room_temp' },
		'yeast-tiny': null,
		'yeast-large': null
	};

	const SEVERITY: Record<ScheduleWarning, 'danger' | 'info'> = {
		'too-short': 'danger',
		'too-cold': 'info',
		'too-warm': 'info',
		'yeast-tiny': 'info',
		'yeast-large': 'info',
		'night-step': 'danger',
		// Overrunning the flour's tolerance is a spoiled dough — the gluten
		// degrades and the bake is lost — so it gets the same red as 'too-short'
		// and 'night-step'. Falling short of it only means a weaker flour would
		// have done, which is advice, not a problem.
		'flour-window-short': 'info',
		'flour-window-long': 'danger'
	};
</script>

<!--
  The live region is rendered unconditionally. It used to be created by the same
  {#if} that produced its first message, and a live region that arrives together
  with its content is not announced by most screen readers — so the warnings
  this component exists to raise were silent for exactly the people relying on
  it. Empty, the <ul> paints nothing.

  Severity no longer rides on hue alone (WCAG 1.4.1): the two states differ in
  icon SHAPE — a triangle for danger, a circle for info — and each message is
  spoken with its severity word in front of it.
-->
{#snippet icon(danger: boolean)}
	<!-- Same triangle the schedule uses for a step it could not place
	     naturally, so one shape means "something is wrong here" throughout. -->
	<svg
		class="shrink-0"
		width="14"
		height="14"
		viewBox="0 0 14 14"
		aria-hidden="true"
		fill="none"
		stroke="currentColor"
		stroke-width="1.4"
	>
		{#if danger}
			<path d="M7 1.6 13 12.4H1Z" stroke-linejoin="round" />
			<path d="M7 5.6v3" stroke-linecap="round" />
			<circle cx="7" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
		{:else}
			<circle cx="7" cy="7" r="5.7" />
			<path d="M7 6.4v3.6" stroke-linecap="round" />
			<circle cx="7" cy="4.2" r="0.75" fill="currentColor" stroke="none" />
		{/if}
	</svg>
{/snippet}

{#if variant === 'strip'}
	<ul aria-live="polite">
		{#each shown as w (w)}
			{@const danger = SEVERITY[w] === 'danger'}
			{@const fix = FIX[w]}
			<li
				class="border-rule flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t-2 border-dashed px-4 py-2.5 text-sm sm:px-5 {danger
					? 'bg-accent-wash'
					: 'bg-paper'}"
			>
				<span
					class="label-caps inline-flex shrink-0 -rotate-[1.7deg] items-center gap-1.5 rounded-[1px] px-2 py-0.5 {danger
						? 'bg-accent text-on-accent'
						: 'bg-ink text-paper'}"
				>
					{@render icon(danger)}{t.warnings[STAMP[w]]}
				</span>
				<span class="min-w-48 flex-1">
					<span class="sr-only"
						>{danger ? t.warnings.severity_danger : t.warnings.severity_info}:
					</span>{t.warnings[COPY[w]]}
				</span>
				{#if fix && onfix}
					<button
						type="button"
						class="link-action"
						aria-haspopup="dialog"
						onclick={() => onfix(fix.field)}
					>
						{t.warnings[fix.label]}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<ul class="space-y-2" aria-live="polite">
		{#each shown as w (w)}
			{@const danger = SEVERITY[w] === 'danger'}
			<li class="notice flex items-start gap-2 {danger ? 'notice-danger' : 'notice-info'}">
				<span class="mt-0.5 flex shrink-0">{@render icon(danger)}</span>
				<span>
					<span class="sr-only"
						>{danger ? t.warnings.severity_danger : t.warnings.severity_info}:
					</span>{t.warnings[COPY[w]]}
				</span>
			</li>
		{/each}
	</ul>
{/if}
