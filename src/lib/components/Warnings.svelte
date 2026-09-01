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

{#if shown.length > 0}
	<ul class="space-y-2" aria-live="polite">
		{#each shown as w (w)}
			<li
				class="rounded-lg border px-3 py-2 text-sm {SEVERITY[w] === 'danger'
					? 'border-tomato-300 bg-tomato-50 text-tomato-800 dark:border-tomato-700 dark:bg-tomato-900/40 dark:text-tomato-200'
					: 'border-dough-300 bg-dough-100 text-dough-900 dark:border-dough-700 dark:bg-dough-900/40 dark:text-dough-100'}"
			>
				{t.warnings[COPY[w]]}
			</li>
		{/each}
	</ul>
{/if}
