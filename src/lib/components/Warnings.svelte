<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { ScheduleWarning } from '$lib/dough/types';

	let { warnings }: { warnings: ScheduleWarning[] } = $props();
	const t = $derived(i18n.t);

	const COPY: Record<ScheduleWarning, keyof typeof t.warnings> = {
		'too-short': 'too_short',
		'too-cold': 'too_cold',
		'too-warm': 'too_warm',
		'yeast-tiny': 'yeast_tiny',
		'yeast-large': 'yeast_large',
		'night-step': 'night_step'
	};

	const SEVERITY: Record<ScheduleWarning, 'danger' | 'info'> = {
		'too-short': 'danger',
		'too-cold': 'info',
		'too-warm': 'info',
		'yeast-tiny': 'info',
		'yeast-large': 'info',
		'night-step': 'danger'
	};
</script>

{#if warnings.length > 0}
	<ul class="space-y-2">
		{#each warnings as w}
			<li
				class="rounded-lg border px-3 py-2 text-sm {SEVERITY[w] === 'danger'
					? 'border-tomato-300 bg-tomato-50 text-tomato-800'
					: 'border-dough-300 bg-dough-100 text-dough-900'}"
			>
				{t.warnings[COPY[w]]}
			</li>
		{/each}
	</ul>
{/if}
