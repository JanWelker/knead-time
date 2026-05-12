<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { formatDateTime, formatDuration } from '$lib/format';
	import { stepDescription, stepTitle } from '$lib/stepCopy';
	import type { ComputedSchedule } from '$lib/dough/types';

	let { schedule }: { schedule: ComputedSchedule } = $props();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);
</script>

<table class="tabular w-full border-collapse text-left">
	<thead>
		<tr class="border-dough-300 border-b text-xs tracking-wider text-stone-500 uppercase">
			<th class="py-2 pr-3 font-semibold">{t.schedule.col_when}</th>
			<th class="py-2 pr-3 font-semibold">{t.schedule.col_step}</th>
			<th class="py-2 font-semibold">{t.schedule.col_duration}</th>
		</tr>
	</thead>
	<tbody>
		{#each schedule.steps as step (step.kind + '-' + step.at.getTime())}
			{@const isReady = step.kind === 'ready'}
			<tr class="border-dough-200/70 border-b align-top last:border-0">
				<td class="py-3 pr-3 font-medium {isReady ? 'text-tomato-700' : 'text-stone-800'}">
					{formatDateTime(step.at, locale)}
				</td>
				<td class="py-3 pr-3">
					<div class="font-medium {isReady ? 'text-tomato-700' : 'text-stone-900'}">
						{stepTitle(step, t)}
					</div>
					<div class="text-xs text-stone-500">{stepDescription(step, t, schedule)}</div>
				</td>
				<td class="py-3 text-sm whitespace-nowrap text-stone-600">
					{#if step.durationMinutes > 0}
						{formatDuration(step.durationMinutes, locale)}
					{:else}
						—
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
