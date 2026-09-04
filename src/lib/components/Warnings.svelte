<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { ScheduleWarning } from '$lib/dough/types';
	import { warningsFor, type WarningSlot } from '$lib/warningSlots';

	// Each mount point renders only its own warnings — see warningSlots.ts.
	let { warnings, place }: { warnings: ScheduleWarning[]; place: WarningSlot } = $props();
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
<ul class="space-y-2" aria-live="polite">
	{#each shown as w (w)}
		{@const danger = SEVERITY[w] === 'danger'}
		<li
			class="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm {danger
				? 'border-tomato-300 bg-tomato-50 text-tomato-800 dark:border-tomato-700 dark:bg-tomato-900/40 dark:text-tomato-200'
				: 'border-dough-300 bg-dough-100 text-dough-900 dark:border-dough-700 dark:bg-dough-900/40 dark:text-dough-100'}"
		>
			<!-- Same triangle the schedule uses for a step it could not place
			     naturally, so one shape means "something is wrong here" throughout. -->
			<svg
				class="mt-0.5 shrink-0"
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
			<span>
				<span class="sr-only"
					>{danger ? t.warnings.severity_danger : t.warnings.severity_info}:
				</span>{t.warnings[COPY[w]]}
			</span>
		</li>
	{/each}
</ul>
