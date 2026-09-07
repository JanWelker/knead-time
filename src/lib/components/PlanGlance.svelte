<script lang="ts">
	import { formatDateTime, formatDuration, formatGrams } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import type { FormState } from '$lib/state.svelte';
	import ModeBadge from './ModeBadge.svelte';

	// The consequence, shown while the questions are still being answered. The
	// old form asked for twelve numbers and only paid out at the bottom of the
	// page; here every answer changes something visible in the same glance,
	// which is what keeps a sequence of questions from reading as a survey.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);
	const rows = $derived([
		{ label: t.ask.running_start, value: formatDateTime(form.startAt, locale) },
		{
			label: t.ask.running_ferment,
			value: formatDuration(form.fermentWindowHours * 60, locale)
		},
		{ label: t.ask.running_flour, value: formatGrams(form.schedule.ingredients.flour) }
	]);
</script>

<aside class="plane p-5 sm:p-6">
	<h2 class="section-head">{t.ask.running_heading}</h2>
	<dl class="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-1">
		{#each rows as row (row.label)}
			<div class="min-w-0">
				<dt class="text-ink-soft text-xs">{row.label}</dt>
				<dd class="data text-ink mt-0.5 text-lg leading-tight">{row.value}</dd>
			</div>
		{/each}
	</dl>
	<div class="rule mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 pt-4">
		<ModeBadge mode={form.schedule.mode} blurb={false} />
		<span class="text-ink-soft text-xs">
			{interpolate(t.ask.running_steps, { n: form.schedule.steps.length })}
		</span>
	</div>
</aside>
